# Notification System

**Project:** Sonho de Criança — Daycare Management System  
**Last updated:** 2026-03-18

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Email Notifications](#email-notifications)
   - [Setup (SMTP)](#setup-smtp)
   - [Templates](#templates)
   - [Adding a New Template](#adding-a-new-template)
4. [WhatsApp Notifications](#whatsapp-notifications)
   - [Setup (Meta Cloud API)](#setup-meta-cloud-api)
   - [Message Templates — What They Are](#message-templates--what-they-are)
   - [Creating & Submitting Templates](#creating--submitting-templates)
   - [Template Reference](#template-reference)
5. [NotificationService API](#notificationservice-api)
6. [Event Matrix](#event-matrix)
7. [Environment Variables Reference](#environment-variables-reference)
8. [How Notifications Are Triggered](#how-notifications-are-triggered)
9. [Adding a New Notification Event](#adding-a-new-notification-event)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The notification system delivers multi-channel notifications — **email** (SMTP via Nodemailer) and **WhatsApp** (Meta Cloud API) — for key events in the daycare lifecycle: registrations, invoices, attendance, reports, and messages.

Key design principles:

- **Fire-and-forget** — notifications never block or fail an HTTP response. If a notification errors, it logs to the console and the controller continues normally.
- **Graceful degradation** — if SMTP or WhatsApp credentials are missing in the environment, the channels silently skip. The app runs fine without them (useful in development).
- **Single entry point** — all notification logic goes through `NotificationService`. Controllers never call `EmailService` or `WhatsAppService` directly.

---

## Architecture

```
Controller
    │
    └── NotificationService          (src/services/notificationService.ts)
            ├── EmailService         (src/services/emailService.ts)
            │       └── Nodemailer + Handlebars templates
            └── WhatsAppService      (src/services/whatsAppService.ts)
                    └── fetch → Meta Graph API
```

**File locations:**

| File | Purpose |
|---|---|
| `src/services/emailService.ts` | SMTP transport, template rendering |
| `src/services/whatsAppService.ts` | Meta Cloud API wrapper |
| `src/services/notificationService.ts` | Orchestrator — all notification events |
| `src/templates/emails/*.hbs` | Handlebars HTML email templates |

---

## Email Notifications

### Setup (SMTP)

Add these variables to your `.env` file:

```env
FRONTEND_URL=https://sonhodecrianca.co.mz   # Used in email links

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false         # Set to true for port 465
SMTP_USER=noreply@sonhodecrianca.co.mz
SMTP_PASS=your-app-password
```

> **Gmail tip:** Use an [App Password](https://myaccount.google.com/apppasswords) — not your regular Gmail password. Requires 2FA enabled on the account.

When `SMTP_USER` or `SMTP_PASS` is not set, email sends are silently skipped and a log line is printed:
```
[EmailService] SMTP not configured — skipping email "..." to user@example.com
```

### Templates

All templates are Handlebars (`.hbs`) files in `src/templates/emails/`:

| Template file | Used for |
|---|---|
| `welcome.hbs` | New user registration |
| `password-reset.hbs` | Forgot-password link |
| `invoice.hbs` | New invoice created |
| `invoice-overdue.hbs` | Invoice status changed to `overdue` |
| `invoice-paid.hbs` | Invoice status changed to `paid` |
| `daily-report.hbs` | New daily report created |
| `monthly-report.hbs` | Monthly report validated by admin |
| `new-message.hbs` | New direct message received |

Every template automatically receives these extra variables injected by `EmailService`:

| Variable | Value |
|---|---|
| `{{appName}}` | `Sonho de Criança` |
| `{{appUrl}}` | Value of `FRONTEND_URL` env var |
| `{{year}}` | Current year (for footer copyright) |

### Adding a New Template

1. Create `src/templates/emails/my-template.hbs`
2. Use `{{variableName}}` for dynamic values
3. Call it from `NotificationService` or directly from `EmailService`:

```typescript
await EmailService.send(
  'my-template',       // filename without .hbs
  'user@example.com',  // to (string or string[])
  'Email subject',
  { variableName: 'value' }
);
```

---

## WhatsApp Notifications

### Setup (Meta Cloud API)

#### Step 1 — Create a Meta Business account

Go to [business.facebook.com](https://business.facebook.com) and create or log in to a Meta Business account.

#### Step 2 — Create a WhatsApp Business Account (WABA)

In the Business Manager:
1. Go to **Business Settings → Accounts → WhatsApp Accounts**
2. Click **Add** and follow the setup wizard
3. Add a phone number (can be a virtual/SIM number)

#### Step 3 — Get your Phone Number ID

In the Meta Developer portal ([developers.facebook.com](https://developers.facebook.com)):
1. Go to your app → **WhatsApp → Getting Started**
2. Copy the **Phone Number ID** (this is NOT the phone number itself — it's a long numeric ID)

#### Step 4 — Generate a permanent access token

1. Go to **Business Settings → System Users**
2. Create a System User with **Manage** permission on the WABA
3. Click **Generate Token** → select your app and required permissions (`whatsapp_business_messaging`, `whatsapp_business_management`)
4. Copy the token

#### Step 5 — Add to `.env`

```env
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=123456789012345
WHATSAPP_API_VERSION=v21.0
WHATSAPP_LANG=pt_BR
```

When `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_ID` is missing, WhatsApp sends are silently skipped:
```
[WhatsAppService] Not configured — skipping template "sonho_invoice_new" to 258841234567
```

### Message Templates — What They Are

WhatsApp requires **pre-approved message templates** for all proactive (outbound) notifications — i.e., messages sent to users who have not messaged you in the last 24 hours.

Templates:
- Are created in Meta Business Manager
- Must be reviewed and approved by Meta (usually within minutes to hours)
- Contain static text with numbered placeholders: `{{1}}`, `{{2}}`, etc.
- Have a **name** (e.g. `sonho_invoice_new`) and a **language** (e.g. `pt_BR`)

### Creating & Submitting Templates

In [Meta Business Manager](https://business.facebook.com):
1. Go to **Account tools → Message Templates**
2. Click **Create Template**
3. Choose category → **Utility** (for transactional notifications)
4. Set the template name and language
5. Write the body with `{{1}}`, `{{2}}` placeholders
6. Submit for review

#### Example template: `sonho_invoice_new` (pt_BR)

```
Olá, {{1}}! Uma nova fatura foi emitida para {{2}}.
Número: {{3}} | Valor: {{4}} | Vencimento: {{5}}.
Acesse o portal para ver os detalhes.
```

Parameters map as: `{{1}}` = parent name, `{{2}}` = child name, `{{3}}` = invoice number, `{{4}}` = amount, `{{5}}` = due date.

### Template Reference

The table below lists every template used by the system. Create all of them in Meta Business Manager with the names shown (or override via env vars — see [Environment Variables Reference](#environment-variables-reference)).

| Template name | `WA_TEMPLATE_*` env var | Placeholders (in order) | Category |
|---|---|---|---|
| `sonho_welcome` | `WA_TEMPLATE_WELCOME` | `{{1}}` parent/user name | Utility |
| `sonho_password_reset` | `WA_TEMPLATE_PASSWORD_RESET` | `{{1}}` name, `{{2}}` reset link | Utility |
| `sonho_invoice_new` | `WA_TEMPLATE_INVOICE_NEW` | `{{1}}` parent, `{{2}}` child, `{{3}}` invoice#, `{{4}}` amount, `{{5}}` due date | Utility |
| `sonho_invoice_overdue` | `WA_TEMPLATE_INVOICE_OVERDUE` | `{{1}}` parent, `{{2}}` child, `{{3}}` invoice#, `{{4}}` amount, `{{5}}` due date | Utility |
| `sonho_invoice_paid` | `WA_TEMPLATE_INVOICE_PAID` | `{{1}}` parent, `{{2}}` child, `{{3}}` invoice#, `{{4}}` amount | Utility |
| `sonho_daily_report` | `WA_TEMPLATE_DAILY_REPORT` | `{{1}}` parent, `{{2}}` child, `{{3}}` date | Utility |
| `sonho_monthly_report` | `WA_TEMPLATE_MONTHLY_REPORT` | `{{1}}` parent, `{{2}}` child, `{{3}}` month+year | Utility |
| `sonho_new_message` | `WA_TEMPLATE_NEW_MESSAGE` | `{{1}}` recipient, `{{2}}` sender name | Utility |
| `sonho_attendance_checkin` | `WA_TEMPLATE_ATTENDANCE_CHECKIN` | `{{1}}` parent, `{{2}}` child, `{{3}}` time, `{{4}}` date | Utility |
| `sonho_attendance_checkout` | `WA_TEMPLATE_ATTENDANCE_CHECKOUT` | `{{1}}` parent, `{{2}}` child, `{{3}}` time, `{{4}}` date | Utility |

**Suggested body texts:**

```
sonho_welcome:
  Olá, {{1}}! A sua conta no Sonho de Criança foi criada com sucesso. Bem-vindo(a)!

sonho_password_reset:
  Olá, {{1}}! Clique no link para redefinir a sua senha: {{2}} (válido por 24 horas).

sonho_invoice_new:
  Olá, {{1}}! Nova fatura emitida para {{2}}.
  N.º {{3}} | {{4}} | Vencimento: {{5}}.
  Acesse o portal para pagar.

sonho_invoice_overdue:
  ⚠️ Olá, {{1}}! A fatura de {{2}} está em atraso.
  N.º {{3}} | {{4}} | Venceu em {{5}}. Por favor regularize o pagamento.

sonho_invoice_paid:
  ✅ Olá, {{1}}! O pagamento da fatura de {{2}} (N.º {{3}}, {{4}}) foi confirmado. Obrigado!

sonho_daily_report:
  📋 Olá, {{1}}! O relatório diário de {{2}} referente a {{3}} já está disponível no portal.

sonho_monthly_report:
  📊 Olá, {{1}}! O relatório mensal de {{2}} referente a {{3}} foi validado e está disponível.

sonho_new_message:
  💬 Olá, {{1}}! Recebeu uma nova mensagem de {{2}} no portal Sonho de Criança.

sonho_attendance_checkin:
  ✅ Olá, {{1}}! {{2}} foi registado(a) como presente às {{3}} do dia {{4}}.

sonho_attendance_checkout:
  👋 Olá, {{1}}! {{2}} saiu do centro às {{3}} do dia {{4}}.
```

---

## NotificationService API

All methods are `static async` and never throw.

### `NotificationService.welcome(params)`

Triggered on: user registration.

```typescript
await NotificationService.welcome({
  email: string;
  phone?: string;   // international format, e.g. "258841234567"
  name: string;
  role: string;     // 'responsavel' | 'staff' | 'administrador'
});
```

Sends: **email** (welcome template) + **WhatsApp** (`sonho_welcome`).

---

### `NotificationService.passwordReset(params)`

Triggered on: forgot-password request.

```typescript
await NotificationService.passwordReset({
  email: string;
  phone?: string;
  name: string;
  resetToken: string;   // raw token; link built as FRONTEND_URL/reset-password?token=...
});
```

Sends: **email** (password-reset template) + **WhatsApp** (`sonho_password_reset`).

---

### `NotificationService.newInvoice(params)`

Triggered on: invoice created.

```typescript
await NotificationService.newInvoice({
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
  invoiceNumber: string;
  amount: number;       // in MT, formatted automatically as "1500.00 MT"
  dueDate: string;      // pre-formatted date string, e.g. "31/03/2026"
});
```

Sends: **email** (invoice template) + **WhatsApp** (`sonho_invoice_new`).

---

### `NotificationService.invoiceOverdue(params)`

Triggered on: invoice status changed to `overdue`.

Same params as `newInvoice`. Sends: **email** (invoice-overdue template) + **WhatsApp** (`sonho_invoice_overdue`).

---

### `NotificationService.invoicePaid(params)`

Triggered on: invoice status changed to `paid`.

```typescript
await NotificationService.invoicePaid({
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
  invoiceNumber: string;
  amount: number;
});
```

Sends: **email** (invoice-paid template) + **WhatsApp** (`sonho_invoice_paid`).

---

### `NotificationService.newDailyReport(params)`

Triggered on: daily report created.

```typescript
await NotificationService.newDailyReport({
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
  childId: string;      // used to build link to /responsavel/relatorio/:childId
  reportDate: string;   // pre-formatted, e.g. "18/03/2026"
  mood?: string;        // e.g. "Feliz" — shown in email if provided
});
```

Sends: **email** (daily-report template) + **WhatsApp** (`sonho_daily_report`).

---

### `NotificationService.monthlyReportValidated(params)`

Triggered on: monthly report validated by admin.

```typescript
await NotificationService.monthlyReportValidated({
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
  childId: string;
  month: number;    // 1–12
  year: number;
});
```

Sends: **email** (monthly-report template) + **WhatsApp** (`sonho_monthly_report`).

---

### `NotificationService.newMessage(params)`

Triggered on: direct message sent to a specific user.  
Role-broadcast messages (no `recipient_id`) are **not** notified — too noisy.

```typescript
await NotificationService.newMessage({
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  senderName: string;
  subject?: string;
  preview: string;    // message content — auto-truncated to 200 chars in email
  role: string;       // determines which inbox URL is linked
});
```

Sends: **email** (new-message template) + **WhatsApp** (`sonho_new_message`).

---

### `NotificationService.attendanceCheckIn(params)`

Triggered on: attendance record created with `status: 'present' | 'late'` and a `check_in` time.

```typescript
await NotificationService.attendanceCheckIn({
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
  checkInTime: string;   // e.g. "07:45"
  date: string;          // e.g. "18/03/2026"
});
```

Sends: **WhatsApp only** (`sonho_attendance_checkin`). No email — attendance pings are brief.

---

### `NotificationService.attendanceCheckOut(params)`

Triggered on: attendance record updated with `check_out` time.

Same params as `attendanceCheckIn` but with `checkOutTime`. Sends: **WhatsApp only** (`sonho_attendance_checkout`).

---

## Event Matrix

| Controller action | Method called | Email | WhatsApp |
|---|---|---|---|
| `POST /auth/register` | `welcome()` | ✅ | ✅ |
| `POST /auth/forgot-password` | `passwordReset()` | ✅ | ✅ |
| `POST /invoices` | `newInvoice()` | ✅ | ✅ |
| `PATCH /invoices/:id/status` → `overdue` | `invoiceOverdue()` | ✅ | ✅ |
| `PATCH /invoices/:id/status` → `paid` | `invoicePaid()` | ✅ | ✅ |
| `POST /daily-reports` | `newDailyReport()` | ✅ | ✅ |
| `PATCH /monthly-reports/:id/validate` | `monthlyReportValidated()` | ✅ | ✅ |
| `POST /messages` (direct recipient) | `newMessage()` | ✅ | ✅ |
| `POST /messages` (role broadcast) | — | — | — |
| `POST /attendance` (present/late + check_in) | `attendanceCheckIn()` | — | ✅ |
| `PUT /attendance/:id` (adds check_out) | `attendanceCheckOut()` | — | ✅ |

---

## Environment Variables Reference

```env
# ─── General ─────────────────────────────────────────────────────────────────
FRONTEND_URL=https://sonhodecrianca.co.mz

# ─── Email (SMTP) ─────────────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false           # true for port 465
SMTP_USER=                  # leave empty to disable email
SMTP_PASS=

# ─── WhatsApp (Meta Cloud API) ────────────────────────────────────────────────
WHATSAPP_TOKEN=             # leave empty to disable WhatsApp
WHATSAPP_PHONE_ID=
WHATSAPP_API_VERSION=v21.0
WHATSAPP_LANG=pt_BR

# Template name overrides (default values shown)
WA_TEMPLATE_WELCOME=sonho_welcome
WA_TEMPLATE_INVOICE_NEW=sonho_invoice_new
WA_TEMPLATE_INVOICE_OVERDUE=sonho_invoice_overdue
WA_TEMPLATE_INVOICE_PAID=sonho_invoice_paid
WA_TEMPLATE_DAILY_REPORT=sonho_daily_report
WA_TEMPLATE_MONTHLY_REPORT=sonho_monthly_report
WA_TEMPLATE_NEW_MESSAGE=sonho_new_message
WA_TEMPLATE_ATTENDANCE_CHECKIN=sonho_attendance_checkin
WA_TEMPLATE_ATTENDANCE_CHECKOUT=sonho_attendance_checkout
WA_TEMPLATE_PASSWORD_RESET=sonho_password_reset
```

---

## How Notifications Are Triggered

Notifications are called after the HTTP response is sent using an immediately-invoked async IIFE. This keeps the response fast and ensures a notification error never causes a `500`:

```typescript
// Example from invoiceController.ts
static create = catchAsync(async (req: Request, res: Response) => {
  const invoice = await InvoiceService.create({ ...req.body });

  res.status(201).json(ApiResponse.success(invoice, 'Fatura criada com sucesso', 201));

  // Notification runs after response is sent — never blocks or fails the request
  (async () => {
    try {
      const [parent, child] = await Promise.all([
        User.findById(invoice.parent_id),
        Child.findById(invoice.child_id)
      ]);
      if (parent && child) {
        await NotificationService.newInvoice({ ... });
      }
    } catch (err) {
      console.error('[InvoiceController] Notification error:', err);
    }
  })();
});
```

For `authController`, notifications are placed before the `return res.json(...)` call since the user data is already available in memory (no extra DB queries needed).

---

## Adding a New Notification Event

Follow these steps when you need to add a new notification (e.g. child enrollment confirmation):

### 1. Create the email template (if needed)

`src/templates/emails/enrollment.hbs`:
```html
<p>Olá, {{parentName}}! {{childName}} foi matriculado com sucesso.</p>
```

### 2. Add a method to `NotificationService`

```typescript
static async childEnrolled(params: {
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  await EmailService.send('enrollment', params.parentEmail,
    `Matrícula confirmada — ${params.childName}`, {
      parentName: params.parentName,
      childName: params.childName
    });

  if (params.parentPhone) {
    const to = WhatsAppService.normalisePhone(params.parentPhone);
    await WhatsAppService.sendTemplate(to, 'sonho_enrollment', LANG, [
      { type: 'body', parameters: [
        { type: 'text', text: params.parentName },
        { type: 'text', text: params.childName }
      ]}
    ]);
  }
}
```

### 3. Wire it in the controller

```typescript
// After res.json(...)
(async () => {
  try {
    const parent = await User.findById(child.parent_id);
    if (parent) {
      await NotificationService.childEnrolled({
        parentEmail: parent.email,
        parentPhone: parent.phone,
        parentName: parent.fullName,
        childName: child.name
      });
    }
  } catch (err) {
    console.error('[ChildController] Notification error:', err);
  }
})();
```

### 4. Create and submit the WhatsApp template

Create `sonho_enrollment` in Meta Business Manager (see [Creating & Submitting Templates](#creating--submitting-templates)).

### 5. Add env var (optional)

If you want the template name to be configurable:
- Add `WA_TEMPLATE_ENROLLMENT` to `env.example` and `envValidation.ts`
- Reference it in `notificationService.ts` via `process.env.WA_TEMPLATE_ENROLLMENT || 'sonho_enrollment'`

---

## Troubleshooting

### Emails not sending

| Symptom | Check |
|---|---|
| Log shows "SMTP not configured — skipping" | `SMTP_USER` and `SMTP_PASS` are not set in `.env` |
| `Error: Invalid login` | Wrong credentials. For Gmail, use an App Password (not the account password) |
| `Error: connect ECONNREFUSED` | Wrong `SMTP_HOST` or `SMTP_PORT`. Check firewall rules |
| `Error: self-signed certificate` | Set `SMTP_SECURE=true` and `SMTP_PORT=465`, or add `tls: { rejectUnauthorized: false }` in the transporter |
| Template not found | Filename mismatch — ensure `.hbs` file exists in `src/templates/emails/` |

### WhatsApp messages not sending

| Symptom | Check |
|---|---|
| Log shows "Not configured — skipping" | `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_ID` not set in `.env` |
| `WhatsApp API error 401` | Access token expired or revoked — regenerate in Meta Business Manager |
| `WhatsApp API error 131030` | Template not found — name mismatch or not yet approved |
| `WhatsApp API error 131047` | Message outside 24h window — must use an approved template (not `sendText`) |
| `WhatsApp API error 100` | Invalid `WHATSAPP_PHONE_ID` or wrong API version |
| Template rejected by Meta | Review body text — avoid promotional language for Utility templates |

### Phone number format

WhatsApp requires numbers without `+`, spaces, or dashes. `WhatsAppService.normalisePhone()` handles this automatically, but the number stored in the User document must already be in international format:

```
✅  258841234567   (Mozambique, no +)
✅  +258841234567  (normalised automatically)
❌  084 123 4567   (missing country code — will fail)
```
