# Sonho de Criança — API Reference

**Base URL:** `http://localhost:3002/api/v1`  
**Version:** 1.0.0  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Roles & Permissions](#roles--permissions)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Auth](#auth)
   - [Users](#users)
   - [Classes](#classes)
   - [Children](#children)
   - [Staff Assignments](#staff-assignments)
   - [Guardians](#guardians)
   - [Pickup Persons](#pickup-persons)
   - [Daily Reports](#daily-reports)
   - [Activities](#activities)
   - [Report Photos](#report-photos)
   - [Attendance](#attendance)
   - [Calendar Events](#calendar-events)
   - [Invoices](#invoices)
   - [Payments](#payments)
   - [Expense Categories](#expense-categories)
   - [Expenses](#expenses)
   - [Messages](#messages)
   - [Monthly Reports](#monthly-reports)
6. [Pagination](#pagination)
7. [Error Reference](#error-reference)

---

## Overview

The Sonho de Criança API is a RESTful backend for a daycare management system. All resource endpoints (except Auth) require a valid JWT Bearer token. The API enforces role-based access control, meaning certain actions are restricted to specific user roles.

**Rate limit:** 1 000 requests per 15 minutes per IP.  
**Body size limit:** 10 MB.

### File Uploads (Cloudinary)

Endpoints that receive files use `multipart/form-data`. The API uploads the received file to Cloudinary and saves **only the resulting URL** in MongoDB.

Cloudinary sub-folders used by this API:
- `avatars` (user `avatar`): public
- `children` (child `photo_url`): **private**
- `pickup-persons` (pickup person `photo_url`): **private**
- `report-photos` (report photo `photo_url`): **private**
- `receipts` (expense `receipt_url`, supports images and PDFs): **private**

### Private files and signed links

Private files are uploaded to Cloudinary as `authenticated` assets: their storage URL doesn't work on its own. Responses never contain it. Instead, `photo_url` / `receipt_url` hold a **signed link to this API**:

```
https://api.example.co.mz/api/v1/media/report-photos/<id>?exp=1793620800&sig=…
```

- Only users allowed to see the record get the link, because the record endpoints are scoped by role.
- The link needs no `Authorization` header, so it works directly in `<img src>`.
- It is valid for 1–2 hours. The same link is issued throughout an hour, so browsers can cache the image. Fetch the record again for a fresh link.
- Sending the link back in an update (e.g. saving a whole child record) is ignored: the stored file is kept. To replace a photo, upload a new file.

#### `GET /media/:kind/:id?exp=…&sig=…`

`kind` is `children`, `report-photos`, `pickup-persons` or `receipts`.

- **Private file:** the API checks the signature, fetches the file from Cloudinary (images capped at 1600 px, compressed), and returns it with `Cache-Control: private` and `Cross-Origin-Resource-Policy: cross-origin`.
- **Older public file or external URL:** `302` redirect to it (the API doesn't fetch arbitrary URLs).

**Errors:** `403` invalid, tampered or expired link · `404` record or file missing · `502` Cloudinary unavailable.

Configuration: `API_PUBLIC_URL` (required in production) is the base of the links. `MEDIA_URL_SECRET` is optional; it defaults to a secret derived from `JWT_SECRET`.

---

## Authentication

Pass the access token in the `Authorization` header on every protected request:

```
Authorization: Bearer <token>
```

- **Access tokens** (`token`, 7 days) authenticate requests. **Refresh tokens** (`refreshToken`, 30 days) only work on `POST /auth/refresh`; using one as an access token gets `403`.
- An expired access token gets `401` with `"Token expirado"`: call `POST /auth/refresh` and retry.
- Every protected request also checks the account in the database:
  - a user who is deactivated, or whose role changes, is affected on their next request;
  - **changing or resetting the password ends every existing session** (`401` `"A sua sessão terminou. Entre novamente."`).

### Accounts are invite-only

There is no public registration. An administrator creates the user with `POST /users`. The user gets an invite link (by email and/or WhatsApp; the link is also returned to the admin to share by hand). Opening the link, the user chooses a password via `POST /auth/accept-invite`, which activates the account and logs them in.

User `status` values: `invited` (created, invite not yet accepted) · `active` · `inactive` · `suspended`.

The first administrator is created from the command line: `npm run create-admin -- --first <name> --last <surname> --email <email> [--phone <phone>] [--whatsapp]` (run it with `FRONTEND_URL` set to the real site, since the printed link uses it).

### Email or phone

A user has an **email, a phone number, or both** (at least one), and can log in with either. Both are unique.

- Phone numbers are accepted in any common format (`84 123 4567`, `+258 84 123 4567`, `00258…`, or another country's number with its code) and stored in E.164 format: `+258841234567`.
- **WhatsApp is only used with the user's consent** (`whatsappOptIn`). Consent is recorded by the admin when creating the user (e.g. from the enrolment form), by the user when accepting the invite, or on their profile. Without consent, messages go by email only; a user with neither email nor consent must get links from the admin.

### Rate limits

| Endpoints | Limit (15 min unless stated) |
|---|---|
| `POST /auth/login` | 20 *failed* attempts per IP (successful logins don't count) |
| `GET /auth/invite/:token`, `POST /auth/accept-invite` | 30 per invite link |
| `POST /auth/forgot-password` | 30 per IP, and 3 per account per hour |
| `POST /auth/reset-password` | 10 per reset link |
| Everything else | 1000 per IP |

In production the auth limits are stored in MongoDB (collection `ratelimits`), so they hold across serverless instances.

---

## Offline sync (attendance and daily reports)

The staff app may queue writes while offline and send them later, possibly twice. Attendance records and daily reports exist **once per child per day**. The day is the calendar day in Maputo, whatever time the device sends; it's stored as midnight UTC of that date.

- **`client_id` on create:** the app's own id for the record (e.g. a UUID, max 64 chars).
  - **The same `client_id` again** returns the record already saved: `200`, `"sync": "replayed"`. Nothing changes and no message is sent twice.
  - **Reusing a `client_id` for another child** answers `409`.
- **A record already exists for that child and day** (e.g. two tablets offline): the newest write wins. The response is `200`, `"sync": "merged"`, `"conflict": true`, and `"previous"` holds the values before the merge, so the app can show what changed.
- **Otherwise** the record is created: `201`, `"sync": "created"`.
- **`base_updated_at` on update:** the `updatedAt` of the version the app edited. If someone changed the record since, the update still applies (newest wins), and the response adds `"conflict": true` and `"previous"`.
- **Updates can't change** a record's child or date.

```json
{ "success": true, "message": "Registro de presença guardado", "data": { ... }, "sync": "merged", "conflict": true, "previous": { "status": "present", ... } }
```

---

## Response Format

### Success (single item)

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

### Success (paginated list)

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": ["field-level detail 1", "field-level detail 2"]
}
```

> `errors` is only present on validation failures (HTTP 400).

---

## Roles & Permissions

| Role | Label | Sees |
|------|-------|------|
| `administrador` | Admin | Everything |
| `staff` | Staff | The children in the classes they are assigned to (none while unassigned), and those children's records |
| `responsavel` | Parent | Their own children and those children's records; their own invoices and payments |

Route guards: `requireAdmin` → `requireStaff` (staff + admin) → `authenticateToken` (any logged-in user).

### What each role can read

Records that belong to a child follow the child: **attendance, daily reports, report photos, monthly reports, guardians, pickup persons**.

- **Lists** only contain records in the caller's scope. A `child_id` filter for a child outside it answers `404`.
- **Single records**, and the `/child/:childId` routes, answer `404` outside the scope, the same as a missing record, so their existence isn't revealed.
- **Staff writes** (attendance, daily and monthly reports, photos) are limited to children in their classes. Updates can't move a record to another child.
- **Monthly reports:** parents only see `validated` ones.
- **Invoices and payments:** admins see all; parents only their own; staff get `403`.
- **Expenses and expense categories:** admin only (`403` for others).
- **Staff assignments:** staff and admins only.
- **Calendar events:** centre-wide events (no `class_id`) are visible to everyone. Class events are only visible to that class's families and staff, and to admins.
- **`GET /users`:** staff see staff, admins, and the parents of children in their classes.
- **Classes and activities:** visible to every logged-in user.

---

## Endpoints

---

### Health Check

#### `GET /health`

Public endpoint. Verifies the server is running.

**Response `200`**

```json
{
  "status": "OK",
  "message": "API is running",
  "timestamp": "2026-03-18T10:00:00.000Z"
}
```

---

### Auth

**Base path:** `/api/v1/auth`

The user object returned by auth endpoints:

```json
{ "id": "...", "email": "ana@example.com", "name": "Ana Cossa", "role": "responsavel", "phone": "+258841234567", "whatsappOptIn": true }
```

`email` or `phone` may be `""` (a user has at least one).

---

#### `POST /auth/login`

Log in with an email **or** a phone number.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `identifier` | string | ✅* | Email or phone number, any format |
| `email` | string | ✅* | Older clients: same as `identifier` |
| `password` | string | ✅ | |

\* Send `identifier` (preferred) or `email`.

**Response `200`**

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": { ... },
    "token": "<access_jwt>",
    "refreshToken": "<refresh_jwt>"
  }
}
```

**Errors:** `401` — Invalid credentials, or account not active (`"Conta desactivada. Contacte a administração."` is only returned after a correct password). A server problem is a `500` with a generic message.

---

#### `POST /auth/refresh`

Exchange a refresh token for a new token pair.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Response `200`** — `data: { "token": "<new_access_jwt>", "refreshToken": "<new_refresh_jwt>" }`

**Errors:** `401` — Invalid, expired or revoked refresh token, an access token, or an account that is no longer active.

---

#### `GET /auth/me` 🔒

Get the profile of the currently authenticated user.

**Response `200`** — `data: { "user": { ... } }`

---

#### `PUT /auth/me` 🔒

Update the authenticated user's own profile. Email and role are managed by admins.

Supports `multipart/form-data` upload for the `avatar` file field. The uploaded file is sent to Cloudinary and the returned URL is stored in `avatar` (no base64 storage).

**Body (JSON or multipart)**

| Field | Type | Notes |
|-------|------|-------|
| `firstName` | string | 2–50 chars |
| `lastName` | string | 2–50 chars |
| `phone` | string | Any common format; `""` removes it (only if the user has an email). Must be unique |
| `whatsappOptIn` | boolean | Give or withdraw consent to WhatsApp messages |
| `avatar` | string / file | A URL string (JSON) or a file upload (field name `avatar`) |

**Response `200`** — Updated user object. **Errors:** `400` validation (e.g. removing the only contact) · `409` phone already registered.

---

#### `PUT /auth/change-password` 🔒

Changes the password and **ends every other session**. The response carries new tokens for the current session: store them, the old ones stop working.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `currentPassword` | string | ✅ |
| `newPassword` | string | ✅ |
| `confirmNewPassword` | string | ✅ |

**Response `200`**

```json
{ "success": true, "message": "Senha alterada. As outras sessões foram terminadas.", "data": { "token": "...", "refreshToken": "..." } }
```

**Errors:** `400` — Validation failed, or wrong current password.

---

#### `GET /auth/invite/:token`

Look up a pending invite, so the accept page can greet the user. Public.

**Response `200`**

```json
{
  "success": true,
  "message": "Convite válido",
  "data": { "firstName": "Joana", "lastName": "Cossa", "email": "joana@example.com", "phone": "+258841234567", "role": "staff", "whatsappOptIn": false }
}
```

`whatsappOptIn` is the consent recorded by the admin, so the page can pre-tick it.

**Errors:** `400` — Invite invalid, expired (7 days), already used, or cancelled (the user was deactivated).

---

#### `POST /auth/accept-invite`

Set the password and activate the account. Returns tokens (the user is logged in). Each invite works once.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | From the invite link `/convite/<token>` |
| `password` | string | ✅ | Min 8 chars, with uppercase, lowercase, digit and special char (`@$!%*?&`) |
| `confirmPassword` | string | ✅ | Must match `password` |
| `whatsappOptIn` | boolean | — | The user's WhatsApp choice. When omitted, the consent recorded by the admin is kept |

**Response `200`** — same shape as login.

**Errors:** `400` — Validation failed, or invite invalid/expired/used.

---

#### `POST /auth/forgot-password`

Request a password reset by email **or** phone. Always returns the same `200` immediately, whether or not the account exists; the work happens after the response.

- Active account: a reset link (`{FRONTEND_URL}/redefinir-senha?token=…`, valid 24 h) is sent by email and/or WhatsApp (WhatsApp only with consent).
- Account that was invited but never activated: the invite is sent again instead (new link; the old one stops working).

**Body:** `identifier` (email or phone), or `email` from older clients.

**Response `200`**

```json
{ "success": true, "message": "Se a conta existir, enviaremos um link de redefinição por email ou WhatsApp", "data": null }
```

---

#### `POST /auth/reset-password`

Complete the password reset using the token from the link. **Ends every existing session.**

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | ✅ | |
| `newPassword` | string | ✅ | Same rules as `password` above |
| `confirmNewPassword` | string | — | Must match `newPassword` if sent |

**Response `200`** — `{ "success": true, "message": "Senha redefinida com sucesso", "data": null }`

**Errors:** `400` — Validation failed, or token invalid/expired.

---

#### `POST /auth/logout` 🔒

The client discards its tokens (they are not revoked server-side; changing the password does that).

**Response `200`** — `{ "success": true, "message": "Logout realizado com sucesso" }`

---

### Users

**Base path:** `/api/v1/users`
All routes require authentication. Everything except the list is admin-only.

The admin user object:

```json
{
  "id": "...", "name": "Joana Cossa", "firstName": "Joana", "lastName": "Cossa",
  "email": "joana@example.com", "phone": "+258841234567", "role": "staff", "status": "invited",
  "invitedAt": "2026-11-02T10:00:00.000Z", "activatedAt": null,
  "whatsappOptIn": false, "whatsappOptInAt": null, "createdAt": "2026-11-02T10:00:00.000Z"
}
```

Invite and reset responses include `delivery`, saying which channels the message actually went out on: `{ "email": true, "whatsapp": false }`. When both are `false` (no email, no WhatsApp consent, or the services aren't configured), show the admin the link to share by hand.

---

#### `GET /users` 🔒 (staff+)

List users (paginated), e.g. to pick a parent for a child or a message recipient.

| Query | Notes |
|---|---|
| `role` | `responsavel` \| `staff` \| `administrador` |
| `search` | Matches first name, last name, email, or phone digits (3+) |
| `status` | Admin only: `invited` \| `active` \| `inactive` \| `suspended` \| `all`. Staff always get `active` users |
| `page`, `limit` | Pagination |

**Response `200`** — `data: [{ "id", "name", "email", "phone", "role", "status" }]` plus `pagination`.

---

#### `POST /users` 🔒 (admin)

Create a user and send them an invite.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | ✅ | 2–50 chars |
| `lastName` | string | ✅ | 2–50 chars |
| `email` | string | ✅* | Unique |
| `phone` | string | ✅* | Unique; any common format |
| `role` | string | ✅ | `responsavel` \| `staff` \| `administrador` |
| `whatsappOptIn` | boolean | — | The person already agreed to WhatsApp messages (e.g. on the enrolment form). Default `false` |

\* At least one of `email` / `phone`.

**Response `201`**

```json
{
  "success": true,
  "message": "Utilizador criado e convite enviado",
  "data": {
    "user": { "...": "admin user object, status invited" },
    "inviteLink": "https://app.../convite/<token>",
    "delivery": { "email": true, "whatsapp": false }
  }
}
```

**Errors:** `400` validation (including neither email nor phone) · `409` email or phone already registered.

---

#### `GET /users/:id` 🔒 (admin)

**Response `200`** — admin user object. **Errors:** `400` malformed id · `404` not found.

---

#### `PUT /users/:id` 🔒 (admin)

Update `firstName`, `lastName`, `email`, `phone`, `role` and/or `whatsappOptIn` (at least one). `""` removes the email or phone, as long as the user keeps one of them.

**Errors:** `400` validation, or an admin changing their own role · `404` · `409` email or phone already registered.

---

#### `PATCH /users/:id/status` 🔒 (admin)

**Body:** `{ "status": "active" | "inactive" | "suspended" }`. Deactivation takes effect on the user's next request, and also cancels a pending invite link.

**Errors:** `400` an admin changing their own status · `404` · `409` activating someone who never set a password (re-invite them instead).

---

#### `POST /users/:id/resend-invite` 🔒 (admin)

For someone who never activated their account (status `invited`, or deactivated before activating): generates a new invite link (the previous one stops working), sets the status to `invited`, and sends it. Same response as `POST /users`.

**Errors:** `404` · `409` the user has already activated their account (use a password-reset link).

---

#### `POST /users/:id/password-reset-link` 🔒 (admin)

For an active user who forgot their password and can't receive the link themselves: creates a reset link (24 h), sends it on the user's channels, and returns it.

**Response `200`** — `data: { "user": { ... }, "resetLink": "https://app.../redefinir-senha?token=…", "delivery": { ... } }`

**Errors:** `404` · `409` the user isn't active (for someone who never activated, resend the invite).

---

### Enrolments

**Base path:** `/api/v1/enrollments`

A family fills in the public form (`/matricula`); an admin can also enter it for them. The request waits in a queue. **Nothing is created until an admin approves it.**

`status`: `submitted` → `under_review` → `approved` | `rejected`. Approved and rejected requests can't be changed.

---

#### `POST /enrollments` (public)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `child` | object | ✅ | `name`, `birth_date` (not in the future) required. Optional: `gender` (`Masculino`/`Feminino`), `nationality`, `address`, `languages_spoken`, `allergies`, `medications`, `dietary_restrictions`, `sleep_schedule`, `preferred_foods`, `separation_reaction`, `plays_with_others`, `behavior_notes`, `previous_center`, `transfer_reason`, `emergency_contact_name`, `emergency_contact_phone` |
| `guardians` | array (1–4) | ✅ | `name` required; `relationship`, `phone`, `email`, `profession`, `workplace`, `address`. **The first guardian is the main contact** and gets the parent account, so needs a phone or an email |
| `pickup_persons` | array (0–6) | — | `name`, `phone` required; `relationship`, `id_document` |
| `consents` | object | ✅ | `data_processing` must be `true`; `image_usage_authorized`, `whatsapp_opt_in` (default `false`) |
| `requested_class_id` | string | — | |
| `requested_start_date` | date | — | |
| `notes` | string | — | |
| `signature` | string | — | Full name typed as signature |
| `website` | string | — | Honeypot: hidden on the form. When filled in, the API answers as usual but stores nothing |

**Response `201`** — only the reference, never the data:

```json
{ "success": true, "message": "Pedido de matrícula recebido", "data": { "reference": "MAT-2026-0001", "status": "submitted" } }
```

The main guardian gets a confirmation by email and/or WhatsApp (WhatsApp only with `whatsapp_opt_in`).

When a logged-in admin submits, the request is recorded as theirs (`source: "admin"`, `submitted_by`) and isn't rate-limited. Otherwise: 10 per hour per IP.

**Errors:** `400` validation · `429` too many requests.

---

#### `GET /enrollments` 🔒 (admin)

Paginated, newest first. Query: `status` (`submitted` | `under_review` | `approved` | `rejected`), `page`, `limit`.

#### `GET /enrollments/:id` 🔒 (admin)

#### `PUT /enrollments/:id` 🔒 (admin)

Correct an open request (same fields as the form, all optional) and/or move it to review: `{ "status": "under_review" }`. **Errors:** `409` already approved or rejected.

---

#### `POST /enrollments/:id/approve` 🔒 (admin)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `class_id` | string | ✅ | The class the child joins |
| `start_date` | date | — | Defaults to the requested start date, or today |
| `override_capacity` | boolean | — | Approve even if the class is full |

In **one transaction** (all or nothing), approval:
1. finds the family's account by the main guardian's phone or email (a second child), or creates an invited parent account, with WhatsApp consent from the form;
2. creates the child (class, parent, image consent, signature, enrolment date);
3. creates all guardians (the first as primary) and the pickup persons (authorised);
4. marks the request `approved`.

After that, a new parent gets the account invite. The family gets an "enrolment approved" message.

**Response `200`**

```json
{
  "success": true,
  "message": "Matrícula aprovada",
  "data": {
    "enrollment": { "...": "status approved, child_id, parent_user_id" },
    "child": { "...": "the new child" },
    "parent": { "id": "...", "created": true },
    "inviteLink": "https://app.../convite/<token>",
    "delivery": { "email": true, "whatsapp": true }
  }
}
```

`inviteLink` and `delivery` are only there when a parent account was created (see `POST /users`).

**Errors:**
- `404` request or class not found.
- `409`:
  - already decided;
  - class full (without `override_capacity`);
  - the guardian's phone and email belong to two different accounts;
  - the contact belongs to a staff or admin account.

---

#### `POST /enrollments/:id/reject` 🔒 (admin)

**Body:** `{ "reason": "..." }`. Closes the request. No message is sent to the family: the centre contacts them itself. **Errors:** `409` already decided.

---

### Reports

**Base path:** `/api/v1/reports`. Amounts are in MT. Periods: `from` and `to` as `YYYY-MM-DD`, both inclusive; the default is the current month so far. `400` for an invalid period.

#### `GET /reports/finance/summary` 🔒 (admin)

```json
{
  "period": { "from": "2026-11-01", "to": "2026-11-02" },
  "invoiced": 1000, "received": 600, "expenses": 200, "net": 400,
  "outstanding": { "amount": 400, "count": 1, "overdue_amount": 0, "overdue_count": 0 },
  "by_month": [{ "month": "2026-11", "invoiced": 1000, "received": 600, "expenses": 200 }]
}
```

- `invoiced`: invoices issued in the period, excluding cancelled ones.
- `received`: payments in the period.
- `net`: received minus expenses.
- `outstanding`: **today's** unpaid balance (pending and overdue invoices, minus payments already made on them), whatever the period.

#### `GET /reports/payments` 🔒 (admin)

Query: `from`, `to`, `method`. Returns `total`, `count`, `by_method` [{ method, amount, count }] and `by_month`.

#### `GET /reports/expenses` 🔒 (admin)

Query: `from`, `to`, `category_id`. Returns `total`, `by_category` [{ category_id, category, amount, count }] and `by_month`.

#### `GET /reports/attendance` 🔒 (staff+)

Query: `month` (`YYYY-MM`, default current) and `class_id`. Admins may omit `class_id` (all classes). Staff must give one of their own classes (`403` otherwise).

```json
{
  "month": "2026-10", "class_id": "...",
  "totals": { "present": 2, "late": 1, "absent": 1, "excused": 0, "days": 4, "rate": 0.75 },
  "children": [{ "child_id": "...", "name": "...", "class": "Turma X", "present": 1, "late": 1, "absent": 1, "excused": 0, "days": 3, "rate": 0.67 }]
}
```

`rate` = (present + late) / days recorded (`null` when there are none).

---

### Scheduled jobs

**Base path:** `/api/v1/jobs`. Called by Vercel Cron with `Authorization: Bearer <CRON_SECRET>`. **Without `CRON_SECRET` the jobs are disabled** (`503`); a wrong secret gets `401`.

#### `GET|POST /jobs/mark-overdue`

Run daily (suggested: 04:00 UTC, i.e. 06:00 in Maputo). It marks `pending` invoices whose due date is before today as `overdue`, and sends each family the overdue notification (WhatsApp only with consent). Running it twice in a day changes nothing the second time.

**Response `200`** — `data: { "marked_overdue": 3 }`

---

### Classes

**Base path:** `/api/v1/classes`  
All routes require authentication.

---

#### `GET /classes` 🔒

List all classes.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Default `1` |
| `limit` | number | Default `10` |

**Response `200` — paginated**

---

#### `GET /classes/:id` 🔒

Get a single class by ID.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Berçário A",
    "min_age_months": 3,
    "max_age_months": 12,
    "capacity": 10,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### `POST /classes` 🔒 (admin)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | |
| `min_age_months` | number | ✅ | ≥ 0 |
| `max_age_months` | number | ✅ | ≥ `min_age_months` |
| `capacity` | number | ✅ | ≥ 1 |

**Response `201`**

---

#### `PUT /classes/:id` 🔒 (admin)

Partial update — same fields as `POST`, all optional.

**Response `200`**

---

#### `DELETE /classes/:id` 🔒 (admin)

**Response `200`**

```json
{ "success": true, "message": "Turma excluída com sucesso", "data": null }
```

---

### Children

**Base path:** `/api/v1/children`  
All routes require authentication.

> **Role-based filtering:**  
> - `administrador` — sees all children.  
> - `staff` — sees only children in their assigned classes.  
> - `responsavel` — sees only their own children.

---

#### `GET /children` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

Each item is populated with `class_id` (name) and `parent_id` (firstName, lastName, email).

---

#### `GET /children/:id` 🔒

Access is denied if the requesting user does not have permission to view the child.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Ana Silva",
    "birth_date": "2023-05-15",
    "gender": "Feminino",
    "class_id": { "_id": "...", "name": "Berçário A" },
    "parent_id": { "_id": "...", "firstName": "Maria", "lastName": "Silva", "email": "..." },
    "allergies": "",
    "medications": "",
    "emergency_contact_name": "João Silva",
    "emergency_contact_phone": "+258841234567",
    "photo_url": "",
    "enrollment_date": "...",
    "image_usage_authorized": true
  }
}
```

---

#### `POST /children` 🔒 (admin)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | |
| `birth_date` | date | ✅ | |
| `class_id` | ObjectId | ✅ | |
| `parent_id` | ObjectId | ✅ | |
| `photo_url` | string | — | Cloudinary URL (if you do not upload a file) |
| `photo` | file | — | Multipart image (field name `photo`); uploaded to Cloudinary and stored as `photo_url` |
| `gender` | string | — | `Masculino` \| `Feminino` |
| `allergies` | string | — | |
| `medications` | string | — | |
| `emergency_contact_name` | string | — | |
| `emergency_contact_phone` | string | — | |
| `nationality` | string | — | |
| `address` | string | — | |
| `languages_spoken` | string | — | |
| `dietary_restrictions` | string | — | |
| `sleep_schedule` | string | — | |
| `preferred_foods` | string | — | |
| `separation_reaction` | string | — | |
| `plays_with_others` | boolean | — | |
| `behavior_notes` | string | — | |
| `previous_center` | string | — | |
| `transfer_reason` | string | — | |
| `image_usage_authorized` | boolean | — | |
| `enrollment_signature` | string | — | |
| `enrollment_date` | date | — | |

**Response `201`**

---

#### `PUT /children/:id` 🔒 (admin)

Same fields as `POST`, all optional. For photo updates, upload multipart with field name `photo`.

**Response `200`**

---

#### `DELETE /children/:id` 🔒 (admin)

**Response `200`**

---

### Staff Assignments

**Base path:** `/api/v1/staff-assignments`  
All routes require authentication.

> Assigns a staff member to a class. A staff member can be assigned to multiple classes.

---

#### `GET /staff-assignments` 🔒

- Admin: returns all assignments, optionally filtered by `?staff_id=<id>`.
- Staff: returns only their own assignments.

**Query params:** `page`, `limit`, `staff_id`

**Response `200` — paginated**

Each item is populated with `staff_id` (firstName, lastName, email) and `class_id` (name).

---

#### `GET /staff-assignments/:id` 🔒

**Response `200`**

---

#### `POST /staff-assignments` 🔒 (admin)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `staff_id` | ObjectId | ✅ |
| `class_id` | ObjectId | ✅ |

**Response `201`**

---

#### `DELETE /staff-assignments/:id` 🔒 (admin)

**Response `200`**

---

### Guardians

**Base path:** `/api/v1/guardians`  
All routes require authentication.

> A guardian is a secondary contact (different from the `parent_id` on a child). Type `1` = primary, `2` = secondary.

---

#### `GET /guardians` 🔒

**Query params:** `page`, `limit`, `child_id`

**Response `200` — paginated**

---

#### `GET /guardians/child/:childId` 🔒

Returns all guardians for the given child.

**Response `200` — paginated**

---

#### `GET /guardians/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "name": "Carlos Mendes",
    "relationship": "Avô",
    "phone": "+258841234567",
    "email": "carlos@example.com",
    "guardian_type": 2
  }
}
```

---

#### `POST /guardians` 🔒 (admin)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `child_id` | ObjectId | ✅ | |
| `name` | string | ✅ | |
| `guardian_type` | number | ✅ | `1` (primary) \| `2` (secondary) |
| `relationship` | string | — | |
| `phone` | string | — | |
| `email` | string | — | Valid email |
| `profession` | string | — | |
| `workplace` | string | — | |
| `address` | string | — | |

**Response `201`**

---

#### `PUT /guardians/:id` 🔒 (admin)

All fields optional (except `child_id` which is not updatable).

**Response `200`**

---

#### `DELETE /guardians/:id` 🔒 (admin)

**Response `200`**

---

### Pickup Persons

**Base path:** `/api/v1/pickup-persons`  
All routes require authentication.

> Authorized individuals allowed to pick up a child.

---

#### `GET /pickup-persons` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /pickup-persons/child/:childId` 🔒

Returns all pickup persons for the given child.

---

#### `GET /pickup-persons/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "name": "Tia Beatriz",
    "relationship": "Tia",
    "phone": "+258841234567",
    "id_document": "12345678A",
    "is_authorized": true
  }
}
```

---

#### `POST /pickup-persons` 🔒 (admin)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `child_id` | ObjectId | ✅ |
| `name` | string | ✅ |
| `phone` | string | ✅ |
| `relationship` | string | — |
| `email` | string | — |
| `id_document` | string | — |
| `photo_url` | string | — Cloudinary URL (if you do not upload a file) |
| `photo` | file | — Multipart image (field name `photo`); uploaded to Cloudinary and stored as `photo_url` |
| `is_authorized` | boolean | — defaults to `true` |

**Response `201`**

---

#### `PUT /pickup-persons/:id` 🔒 (admin)

Supports the same multipart file upload as `POST` (`photo` → Cloudinary → `photo_url`). All other fields are optional.

**Response `200`**

---

#### `DELETE /pickup-persons/:id` 🔒 (admin)

**Response `200`**

---

### Daily Reports

**Base path:** `/api/v1/daily-reports`  
All routes require authentication.

---

#### `GET /daily-reports` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /daily-reports/child/:childId` 🔒

Returns all daily reports for a specific child.

**Query params:** `page`, `limit`

---

#### `GET /daily-reports/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "date": "2026-03-18T00:00:00.000Z",
    "meals": {
      "breakfast": "Comeu bem",
      "lunch": "Comeu tudo",
      "snack": "Comeu pouco",
      "dinner": ""
    },
    "activities": ["Pintura", "Música"],
    "nap_time": { "start": "...", "end": "...", "duration_minutes": 90 },
    "mood": "Feliz",
    "notes": "Teve um ótimo dia!",
    "behavior_notes": "",
    "health_notes": "",
    "created_by": { "_id": "...", "firstName": "Sofia", "lastName": "Lima" }
  }
}
```

---

#### `POST /daily-reports` 🔒 (staff+)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `child_id` | ObjectId | ✅ | |
| `date` | date | — | defaults to today |
| `meals` | object | — | `{ breakfast, lunch, snack, dinner }` all strings |
| `activities` | string[] | — | Activity labels |
| `nap_time` | object | — | `{ start, end, duration_minutes }` |
| `mood` | string | — | Free text |
| `notes` | string | — | |
| `behavior_notes` | string | — | |
| `health_notes` | string | — | |

Triggers a **new daily report** email/WhatsApp notification to the parent (fire-and-forget).

**Response `201`**

---

#### `PUT /daily-reports/:id` 🔒 (staff+)

Same fields as `POST`, all optional.

**Response `200`**

---

#### `DELETE /daily-reports/:id` 🔒 (staff+)

**Response `200`**

---

### Activities

**Base path:** `/api/v1/activities`  
All routes require authentication.

> A catalog of reusable activities that can be referenced in daily reports.

---

#### `GET /activities` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /activities/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Pintura com dedos",
    "description": "Atividade criativa com tintas",
    "class_id": "...",
    "age_group": "12-24 meses",
    "duration_minutes": 30,
    "materials_needed": ["tinta", "papel"],
    "learning_objectives": ["coordenação motora"],
    "is_active": true
  }
}
```

---

#### `POST /activities` 🔒 (admin)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `description` | string | — |
| `class_id` | ObjectId | — |
| `age_group` | string | — |
| `duration_minutes` | number | — |
| `materials_needed` | string[] | — |
| `learning_objectives` | string[] | — |
| `is_active` | boolean | — |

**Response `201`**

---

#### `PUT /activities/:id` 🔒 (admin)

**Response `200`**

---

#### `DELETE /activities/:id` 🔒 (admin)

**Response `200`**

---

### Report Photos

**Base path:** `/api/v1/report-photos`  
All routes require authentication.

---

#### `GET /report-photos/report/:reportId` 🔒

Returns all photos associated with a specific daily report.

**Response `200` — paginated**

---

#### `GET /report-photos/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "daily_report_id": "...",
    "photo_url": "https://...",
    "caption": "Hora da pintura",
    "uploaded_by": { "_id": "...", "firstName": "Sofia", "lastName": "Lima" }
  }
}
```

---

#### `POST /report-photos` 🔒 (staff+)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `daily_report_id` | ObjectId | ✅ | |
| `photo_url` | string | — | Cloudinary URL (if you do not upload a file) |
| `photo` | file | — | Multipart image (field name `photo`); uploaded to Cloudinary and stored as `photo_url` |
| `caption` | string | — | |

> At least one of `photo` or `photo_url` must be provided.

**Response `201`**

---

#### `DELETE /report-photos/:id` 🔒 (staff+)

**Response `200`**

---

### Attendance

**Base path:** `/api/v1/attendance`  
All routes require authentication.

---

#### `GET /attendance` 🔒

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | |
| `limit` | number | |
| `child_id` | ObjectId | Filter by child |
| `date` | ISO date | Filter by exact date (overrides start/end) |
| `start_date` | ISO date | Range start |
| `end_date` | ISO date | Range end |

**Response `200` — paginated**

---

#### `GET /attendance/child/:childId` 🔒

Returns all attendance records for the given child.

**Query params:** `page`, `limit`, `start_date`, `end_date`

---

#### `GET /attendance/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "date": "2026-03-18T00:00:00.000Z",
    "status": "present",
    "check_in": "2026-03-18T07:45:00.000Z",
    "check_out": "2026-03-18T17:00:00.000Z",
    "notes": "",
    "recorded_by": { "_id": "...", "firstName": "Sofia", "lastName": "Lima" }
  }
}
```

---

#### `POST /attendance` 🔒 (staff+)

Creates an attendance record. Triggers a **check-in** WhatsApp/email notification to the parent when `status` is `present` or `late` (fire-and-forget).

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `child_id` | ObjectId | ✅ | |
| `date` | date | ✅ | |
| `status` | string | ✅ | `present` \| `absent` \| `late` \| `excused` |
| `check_in` | date | — | |
| `check_out` | date | — | |
| `notes` | string | — | |

**Response `201`**

---

#### `PUT /attendance/:id` 🔒 (staff+)

Update an existing attendance record. Triggers a **check-out** notification when `check_out` is set.

**Body**

| Field | Type |
|-------|------|
| `check_in` | date |
| `check_out` | date |
| `status` | string |
| `notes` | string |

**Response `200`**

---

#### `DELETE /attendance/:id` 🔒 (staff+)

**Response `200`**

---

### Calendar Events

**Base path:** `/api/v1/calendar-events`  
All routes require authentication.

---

#### `GET /calendar-events` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /calendar-events/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Festa Junina",
    "description": "Comemoração junina para todas as turmas",
    "start_date": "2026-06-13T00:00:00.000Z",
    "end_date": "2026-06-13T18:00:00.000Z",
    "is_all_day": true,
    "event_type": "activity",
    "class_id": null,
    "created_by": { "_id": "...", "firstName": "Admin", "lastName": "User" }
  }
}
```

---

#### `POST /calendar-events` 🔒 (staff+)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | ✅ | |
| `description` | string | — | |
| `start_date` | date | ✅ | |
| `end_date` | date | — | |
| `is_all_day` | boolean | — | |
| `event_type` | string | — | `holiday` \| `activity` \| `meeting` \| `reminder` \| `other` |
| `class_id` | ObjectId | — | Scope to a specific class |

**Response `201`**

---

#### `PUT /calendar-events/:id` 🔒 (staff+)

**Response `200`**

---

#### `DELETE /calendar-events/:id` 🔒 (staff+)

**Response `200`**

---

### Invoices

**Base path:** `/api/v1/invoices`  
All routes require authentication.

---

#### `GET /invoices` 🔒

- `responsavel` role: automatically filtered to their own invoices only.
- Admin/staff: all invoices, optionally filtered.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | |
| `limit` | number | |
| `parent_id` | ObjectId | Admin/staff only |
| `status` | string | `pending` \| `paid` \| `overdue` \| `cancelled` |

**Response `200` — paginated**

---

#### `GET /invoices/:id` 🔒

Guardians (`responsavel`) can only view their own invoices.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "invoice_number": "INV-2026-0001",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "parent_id": { "_id": "...", "firstName": "Maria", "lastName": "Silva" },
    "issue_date": "2026-03-01T00:00:00.000Z",
    "due_date": "2026-03-20T00:00:00.000Z",
    "amount": 5500.00,
    "status": "pending",
    "items": [
      { "description": "Mensalidade Março", "quantity": 1, "unit_price": 5500, "total": 5500 }
    ],
    "notes": "",
    "created_by": "..."
  }
}
```

---

#### `POST /invoices` 🔒 (admin)

Invoice numbers are assigned automatically using an atomic counter (`INV-YYYY-NNNN`). Triggers a **new invoice** email/WhatsApp notification to the parent.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `child_id` | ObjectId | ✅ | |
| `parent_id` | ObjectId | ✅ | |
| `due_date` | date | ✅ | |
| `amount` | number | ✅ | ≥ 0 |
| `items` | array | ✅ | See below |
| `issue_date` | date | — | defaults to now |
| `notes` | string | — | |

**`items` array element**

| Field | Type | Required |
|-------|------|----------|
| `description` | string | ✅ |
| `unit_price` | number | ✅ |
| `total` | number | ✅ |
| `quantity` | number | — |

**Response `201`**

---

#### `PUT /invoices/:id` 🔒 (admin)

Update editable fields. Does not re-trigger notifications.

**Body** — all optional: `due_date`, `amount`, `items`, `notes`, `status`

**Response `200`**

---

#### `PATCH /invoices/:id/status` 🔒 (admin)

Change only the status. Triggers a **overdue** or **paid** notification depending on the new status.

**Body**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | string | ✅ | `pending` \| `paid` \| `overdue` \| `cancelled` |

**Response `200`**

---

#### `DELETE /invoices/:id` 🔒 (admin)

**Response `200`**

---

### Payments

**Base path:** `/api/v1/payments`  
All routes require authentication.

---

#### `GET /payments` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /payments/invoice/:invoiceId` 🔒

Returns all payments linked to a specific invoice.

**Response `200` — paginated**

---

#### `GET /payments/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "invoice_id": { "_id": "...", "invoice_number": "INV-2026-0001" },
    "parent_id": { "_id": "...", "firstName": "Maria", "lastName": "Silva" },
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "amount": 5500.00,
    "payment_date": "2026-03-18T00:00:00.000Z",
    "payment_method": "bank_transfer",
    "payment_method_details": "Banco BCI",
    "reference_number": "REF-001",
    "notes": "",
    "recorded_by": "..."
  }
}
```

---

#### `POST /payments` 🔒 (admin)

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `parent_id` | ObjectId | ✅ | |
| `child_id` | ObjectId | ✅ | |
| `amount` | number | ✅ | ≥ 0 |
| `payment_method` | string | ✅ | `cash` \| `card` \| `bank_transfer` \| `check` \| `mobile_money` \| `other` |
| `invoice_id` | ObjectId | — | |
| `payment_date` | date | — | defaults to now |
| `payment_method_details` | string | — | |
| `reference_number` | string | — | |
| `notes` | string | — | |

**Response `201`**

---

#### `DELETE /payments/:id` 🔒 (admin)

**Response `200`**

---

### Expense Categories

**Base path:** `/api/v1/expense-categories`  
All routes require authentication.

---

#### `GET /expense-categories` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /expense-categories/:id` 🔒

**Response `200`**

---

#### `POST /expense-categories` 🔒 (admin)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `description` | string | — |
| `is_active` | boolean | — |

**Response `201`**

---

#### `PUT /expense-categories/:id` 🔒 (admin)

**Response `200`**

---

#### `DELETE /expense-categories/:id` 🔒 (admin)

**Response `200`**

---

### Expenses

**Base path:** `/api/v1/expenses`  
All routes require authentication.

---

#### `GET /expenses` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /expenses/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "category_id": { "_id": "...", "name": "Material" },
    "amount": 850.00,
    "description": "Compra de tintas e papel",
    "expense_date": "2026-03-15T00:00:00.000Z",
    "receipt_url": "https://...",
    "vendor": "Papelaria Central",
    "created_by": { "_id": "...", "firstName": "Admin", "lastName": "User" }
  }
}
```

---

#### `POST /expenses` 🔒 (admin)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `category_id` | ObjectId | ✅ |
| `amount` | number | ✅ |
| `description` | string | ✅ |
| `expense_date` | date | — |
| `receipt_url` | string | — Cloudinary URL (if you do not upload a file) |
| `receipt` | file | — Multipart file (field name `receipt`); supports images or PDFs and is uploaded to Cloudinary as `receipts` |
| `vendor` | string | — |

**Response `201`**

---

#### `PUT /expenses/:id` 🔒 (admin)

Supports multipart upload with field name `receipt` (image or PDF) to update `receipt_url`.

**Response `200`**

---

#### `DELETE /expenses/:id` 🔒 (admin)

**Response `200`**

---

### Messages

**Base path:** `/api/v1/messages`  
All routes require authentication.

> Messages can be sent to a specific user (`recipient_id`) or broadcast to all users with a given role (`recipient_role`). One of the two must be provided. Triggers an email/WhatsApp notification to each recipient (fire-and-forget).

---

#### `GET /messages/recipients` 🔒

Who the user may write to, for the recipient picker. Query: `search` (name).

- **Parent:** the administration, and the staff of their children's classes.
- **Staff:** colleagues, the administration, and the parents of children in their classes.
- **Admin:** every active user.

```json
{ "data": [
  { "id": "...", "name": "Joana Cossa", "role": "staff", "classes": ["Turma X"] },
  { "id": "...", "name": "Ana Machava", "role": "responsavel", "children": ["Lara Machava"] }
] }
```

`POST /messages` applies the same rules:
- A `recipient_id` outside the list gets `404`.
- Messages to a whole role (`recipient_role`) are for admins only (`403`).
- A `child_id` must be one of the sender's children or classes (`404`).
- Either `recipient_id` or `recipient_role` is required (`400`).

#### `GET /messages/inbox` 🔒

Returns messages received by the current user.

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /messages/sent` 🔒

Returns messages sent by the current user.

**Query params:** `page`, `limit`

---

#### `GET /messages/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "sender_id": { "_id": "...", "firstName": "Sofia", "lastName": "Lima" },
    "recipient_id": { "_id": "...", "firstName": "Maria", "lastName": "Silva" },
    "recipient_role": null,
    "subject": "Reunião de pais",
    "content": "Olá! Gostaríamos de agendar...",
    "message_type": "info",
    "is_read": false,
    "child_id": null,
    "createdAt": "..."
  }
}
```

---

#### `POST /messages` 🔒

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `subject` | string | ✅ | |
| `content` | string | ✅ | |
| `recipient_id` | ObjectId | — | Required if `recipient_role` not provided |
| `recipient_role` | string | — | `responsavel` \| `staff` \| `administrador` |
| `message_type` | string | — | `info` \| `reminder` \| `alert` \| `general` |
| `child_id` | ObjectId | — | Optional context reference |

**Response `201`**

---

#### `PATCH /messages/:id/read` 🔒

Marks the message as read.

**Response `200`**

```json
{ "success": true, "message": "Mensagem marcada como lida" }
```

---

#### `DELETE /messages/:id` 🔒

**Response `200`**

---

### Monthly Reports

**Base path:** `/api/v1/monthly-reports`  
All routes require authentication.

---

#### `GET /monthly-reports` 🔒

**Query params:** `page`, `limit`

**Response `200` — paginated**

---

#### `GET /monthly-reports/child/:childId` 🔒

Returns all monthly reports for the given child.

**Query params:** `page`, `limit`

---

#### `GET /monthly-reports/:id` 🔒

**Response `200`**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "child_id": { "_id": "...", "name": "Ana Silva" },
    "month": 3,
    "year": 2026,
    "status": "validated",
    "attendance_summary": {
      "total_days": 22,
      "present_days": 20,
      "absent_days": 1,
      "late_days": 1
    },
    "physical_development": "Excelente progresso",
    "cognitive_development": "...",
    "social_development": "...",
    "emotional_development": "...",
    "general_notes": "...",
    "achievements": "...",
    "areas_for_improvement": "...",
    "behavior_summary": "...",
    "activities_participated": ["Pintura", "Música"],
    "recommendations": "...",
    "parent_feedback": "...",
    "created_by": { "_id": "...", "firstName": "Sofia", "lastName": "Lima" },
    "validated_by": { "_id": "...", "firstName": "Admin" }
  }
}
```

---

#### `POST /monthly-reports` 🔒 (staff+)

**Body**

| Field | Type | Required |
|-------|------|----------|
| `child_id` | ObjectId | ✅ |
| `month` | number | ✅ | 1–12 |
| `year` | number | ✅ | ≥ 2000 |
| `status` | string | — | `draft` \| `submitted` \| `validated` \| `rejected` |
| `attendance_summary` | object | — | `{ total_days, present_days, absent_days, late_days }` |
| `physical_development` | string | — | |
| `cognitive_development` | string | — | |
| `social_development` | string | — | |
| `emotional_development` | string | — | |
| `general_notes` | string | — | |
| `achievements` | string | — | |
| `areas_for_improvement` | string | — | |
| `development_notes` | string | — | |
| `behavior_summary` | string | — | |
| `activities_participated` | string[] | — | |
| `recommendations` | string | — | |
| `parent_feedback` | string | — | |
| `rejection_reason` | string | — | |

**Response `201`**

---

#### `PUT /monthly-reports/:id` 🔒 (staff+)

Same fields as `POST`, all optional.

**Response `200`**

---

#### `PATCH /monthly-reports/:id/validate` 🔒 (admin)

Marks the report as `validated`. Triggers a **monthly report validated** email/WhatsApp notification to the parent.

**Response `200`**

---

#### `PATCH /monthly-reports/:id/reject` 🔒 (admin)

**Body**

| Field | Type | Notes |
|-------|------|-------|
| `rejection_reason` | string | Optional explanation |

**Response `200`**

---

#### `DELETE /monthly-reports/:id` 🔒 (admin)

**Response `200`**

---

## Pagination

All list endpoints accept `page` and `limit` query parameters.

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `10` | `100` |

Paginated responses include a `pagination` envelope:

```json
"pagination": {
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5
}
```

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Validation failed — check the `errors` array |
| `401` | Unauthorized — missing or invalid JWT |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Resource not found |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |

### Validation error response example

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Nome da criança é obrigatório",
    "Data de nascimento inválida"
  ]
}
```
