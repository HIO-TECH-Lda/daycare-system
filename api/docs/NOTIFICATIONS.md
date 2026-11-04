# Notification System

**Project:** Sonho de Criança — Daycare Management System
**Last updated:** 2026-11-03

Email (SMTP via Nodemailer) and WhatsApp (Meta Cloud API) notifications for accounts, enrolment, billing, reports, messages and attendance. WhatsApp template texts, the Meta setup and costs, written for the centre: [WHATSAPP-TEMPLATES.md](WHATSAPP-TEMPLATES.md).

---

## Architecture

```
Controller / service
    │  runInBackground(...)            (after the response; Vercel waitUntil)
    └── NotificationService             src/services/notificationService.ts
            deliver(category, recipients, { whatsapp, email })
            ├── WhatsAppService.sendTemplate   src/services/whatsAppService.ts (retry, never throws)
            ├── EmailService.send              src/services/emailService.ts (Handlebars, src/templates/emails)
            └── NotificationLog                src/models/NotificationLog.ts (one row per send per channel)

Meta ──POST /api/v1/webhooks/whatsapp──▶ NotificationService.recordWhatsAppStatus   (sent → delivered → read / failed)
Admin ──GET /api/v1/notifications, POST /api/v1/notifications/:id/resend
```

- **Never throws.** Every method returns `Delivery { email, whatsapp }` (the channels that went out) and logs errors. A notification never fails a request.
- **Missing credentials** (`SMTP_USER`/`SMTP_PASS`, `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID`): that channel is skipped and logged as `skipped`. The app runs fine without them.
- Controllers never call `EmailService` or `WhatsAppService` directly.

## Choosing channels

`NotificationService.channelsFor(user, category)`:

1. **WhatsApp needs consent** (`User.whatsappOptIn`, recorded with a date in `whatsappOptInAt`). It is set on the enrolment form, when accepting the invite, or in the profile.
2. **Preferences** (`User.notificationPrefs`, edited through `PUT /auth/me`) per category: `attendance`, `reports`, `billing`, `messages`, each `{ whatsapp, email }`. Defaults (`DEFAULT_PREFS`): everything on both channels, except attendance, which is WhatsApp only. `GET /auth/me` always returns the full set with defaults filled in; `PUT` merges, so the client can send one category.
3. `account` (invites, password links) and `enrollment` ignore preferences: they always go on every available channel.

**Email fallback.** When WhatsApp fails and the person didn't get the email anyway (they turned email off for that category), the email goes out instead:

- at send time, when Meta rejects the message (after retries);
- later, when the delivery webhook reports `failed` (`fallback_email` stored on the row; sent once, linked by `fallback_of`).

Attendance never falls back to email (too frequent). Account messages fall back naturally, since they always go to both channels.

## WhatsApp sending

`WhatsAppService.sendTemplate(to, { template, language, body, buttonSuffix })`:

- `body`: values for `{{1}}`, `{{2}}`… in the template body.
- `buttonSuffix`: the dynamic part of the template's URL button (index 0). Invite and reset links go here (the token), not in the text.
- Retries network errors, timeouts (10 s), 429 and 5xx: 3 attempts, 1 s then 3 s apart. Other errors (bad number, template missing) are not retried.
- Phone numbers are normalised to Meta's format (`258841234567`); local Mozambican numbers get the 258 prefix.
- Graph API version: `WHATSAPP_API_VERSION` (default `v23.0`). Language: `WHATSAPP_LANG` (default `pt_PT`), which must match the language the templates were approved in.

## Notification log

`NotificationLog`: `channel`, `category`, `template`, `recipient`, `user_id`, `status` (`sent`, `delivered`, `read`, `failed`, `skipped`), `error`, `provider_id` (Meta's wamid), `attempts`, `payload`, `fallback_email`, `fallback_of`, `resend_of`, `status_at`. Rows expire after 6 months (TTL index).

- `payload` keeps what's needed to resend (template parameters, email subject and context). **Account rows keep no payload**: their links are credentials. They are re-issued from *Pessoas* instead.
- Status only moves forward (`sent → delivered → read`); a late `delivered` after `read` is ignored.

### Admin endpoints (administrador only)

| Endpoint | |
|---|---|
| `GET /api/v1/notifications` | Query: `status`, `channel`, `category`, `search` (name, email, phone), `page`, `limit` (30). Rows without `payload`, with `user_id` populated (name, role) and `resendable` / `handled` (already resent or covered by a fallback email). `meta`: `failed_this_week`, `whatsapp_configured`, `email_configured`. |
| `POST /api/v1/notifications/:id/resend` | Sends again from the stored payload, creating a row with `resend_of`. WhatsApp re-checks the person's current consent. 422 with a reason when it can't (account row, consent withdrawn, failed again). |

### Delivery webhook

`GET /api/v1/webhooks/whatsapp` answers Meta's verification (`hub.verify_token` = `WHATSAPP_VERIFY_TOKEN`). `POST` checks `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with `WHATSAPP_APP_SECRET`; `app.ts` keeps the raw body) and applies each status in `entry[].changes[].value.statuses[]`. Without both variables the webhook answers 503.

## Event matrix

| Trigger | Method | Category | Template | Email template |
|---|---|---|---|---|
| `POST /users`, `POST /users/:id/resend-invite`, forgot-password on a never-activated account, enrolment approval (new parent) | `invite()` | account | `sonho_invite` | `invite` |
| `POST /auth/forgot-password`, `POST /users/:id/password-reset-link` | `passwordReset()` | account | `sonho_password_reset` | `password-reset` |
| `POST /enrollments` | `enrollmentReceived()` | enrollment | `sonho_enrollment_received` | `enrollment-received` |
| `POST /enrollments/:id/approve` | `enrollmentApproved()` | enrollment | `sonho_enrollment_approved` | `enrollment-approved` |
| `POST /invoices`, monthly invoice generation | `newInvoice()` | billing | `sonho_invoice_new` | `invoice` |
| `PATCH /invoices/:id/status` → overdue; overdue job | `invoiceOverdue()` | billing | `sonho_invoice_overdue` | `invoice-overdue` |
| `PATCH /invoices/:id/status` → paid; a payment that settles the invoice | `invoicePaid()` | billing | `sonho_invoice_paid` | `invoice-paid` |
| `POST /daily-reports` (first save of the day) | `newDailyReport()` | reports | `sonho_daily_report` | `daily-report` |
| `PATCH /monthly-reports/:id/validate` | `monthlyReportValidated()` | reports | `sonho_monthly_report` | `monthly-report` |
| `POST /messages` (direct recipient; role broadcasts are not notified) | `newMessage()` | messages | `sonho_new_message` | `new-message` |
| Check-in (present/late) | `attendanceCheckIn()` | attendance | `sonho_attendance_checkin` | — |
| Check-out | `attendanceCheckOut()` | attendance | `sonho_attendance_checkout` | — |

Enrolment messages go to the contacts on the form (the family has no account yet), with WhatsApp only if the form's consent box was ticked.

Invites and admin reset links are awaited (with timeouts) so the admin sees which channels worked (`delivery` in the response) and can share the link by hand otherwise. Forgot-password runs entirely in the background, so its timing doesn't reveal whether an account exists.

## Adding a notification

1. Email template: `src/templates/emails/<name>.hbs` (gets `appName`, `appUrl`, `year` automatically).
2. WhatsApp template: add it to [WHATSAPP-TEMPLATES.md](WHATSAPP-TEMPLATES.md), have the centre submit it, and add its name to `WA_TEMPLATES` (with a `WA_TEMPLATE_*` override in `envValidation.ts` and `env.example`).
3. A method on `NotificationService` that calls `this.deliver(category, this.channelsFor(user, category), { whatsapp, email })`. A new preference category also needs `PrefCategory`, `DEFAULT_PREFS`, `updateProfileSchema` and the profile screen.
4. Call it from the controller inside `runInBackground(...)`, passing the user document (consent and preferences come from it).

## Environment variables

```env
FRONTEND_URL=https://portal.sonhodecrianca.co.mz   # links in emails

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=                  # empty: email disabled
SMTP_PASS=

WHATSAPP_TOKEN=             # empty: WhatsApp disabled
WHATSAPP_PHONE_ID=
WHATSAPP_API_VERSION=v23.0
WHATSAPP_LANG=pt_PT
WHATSAPP_VERIFY_TOKEN=      # delivery webhook (with WHATSAPP_APP_SECRET)
WHATSAPP_APP_SECRET=
WA_TEMPLATE_*=              # optional template name overrides (see env.example)
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Everything `skipped` in *Notificações* | Channel not configured (the screen says which) |
| WhatsApp `Meta 401` | Token expired or revoked: generate a new system-user token |
| `Meta 404 (132001)` | Template name or language doesn't match an approved template (`WHATSAPP_LANG` must be the language it was approved in) |
| `Meta 400 (132000)` | Wrong number of parameters for the template (body or button) |
| `Meta 131026` | The number isn't on WhatsApp, or the person hasn't accepted the latest terms |
| Status stays `sent` | Webhook not configured, or the app secret is wrong (Meta's posts get 401) |
| Email `failed` | SMTP credentials (for Gmail, an App Password), host and port |
