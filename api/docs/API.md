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

---

## Authentication

Pass the access token in the `Authorization` header on every protected request:

```
Authorization: Bearer <token>
```

Tokens are short-lived JWTs. Use `POST /auth/refresh` to obtain a new pair when the access token expires.

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

| Role | Label | Description |
|------|-------|-------------|
| `administrador` | Admin | Full access to all resources |
| `staff` | Staff | Can manage children in assigned classes, write reports, record attendance |
| `responsavel` | Parent/Guardian | Read-only access to data about their own children |

The middleware enforces the following hierarchy for route guards:  
`requireAdmin` → `requireStaff` (staff + admin) → `authenticateToken` (any logged-in user)

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

---

#### `POST /auth/register`

Create a new user account. Sends a welcome email/WhatsApp notification after registration.

**Body**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | ✅ | 2–50 chars |
| `lastName` | string | ✅ | 2–50 chars |
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | Min 8 chars, must contain uppercase, lowercase, digit, special char |
| `confirmPassword` | string | ✅ | Must match `password` |
| `role` | string | — | `responsavel` \| `staff` \| `administrador` — defaults to `responsavel` |
| `phone` | string | — | Any format |

**Response `201`**

```json
{
  "success": true,
  "message": "Usuário registrado com sucesso",
  "data": {
    "user": { "id": "...", "firstName": "...", "lastName": "...", "email": "...", "role": "responsavel" },
    "token": "<access_jwt>",
    "refreshToken": "<refresh_jwt>"
  }
}
```

---

#### `POST /auth/login`

Authenticate a user and receive tokens.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

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

**Errors:** `401` — Invalid credentials.

---

#### `POST /auth/refresh`

Exchange a refresh token for a new access token pair.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | ✅ |

**Response `200`**

```json
{
  "success": true,
  "message": "Token renovado com sucesso",
  "data": {
    "token": "<new_access_jwt>",
    "refreshToken": "<new_refresh_jwt>"
  }
}
```

**Errors:** `401` — Invalid or expired refresh token.

---

#### `GET /auth/me` 🔒

Get the profile of the currently authenticated user.

**Response `200`**

```json
{
  "success": true,
  "message": "Perfil recuperado com sucesso",
  "data": { "user": { ... } }
}
```

---

#### `PUT /auth/me` 🔒

Update the authenticated user's profile. Supports multipart form upload for the `avatar` file field; the file is base64-encoded automatically.

**Body (JSON or multipart)**

| Field | Type | Notes |
|-------|------|-------|
| `firstName` | string | 2–50 chars |
| `lastName` | string | 2–50 chars |
| `phone` | string | |
| `avatar` | string / file | Base64 data-URI or file upload |

**Response `200`** — Updated user object.

---

#### `PUT /auth/change-password` 🔒

**Body**

| Field | Type | Required |
|-------|------|----------|
| `currentPassword` | string | ✅ |
| `newPassword` | string | ✅ |
| `confirmNewPassword` | string | ✅ |

**Response `200`**

```json
{ "success": true, "message": "Senha alterada com sucesso" }
```

---

#### `POST /auth/forgot-password`

Request a password reset token. Always returns `200` regardless of whether the email exists (to prevent email enumeration). Sends a reset link via email/WhatsApp if configured.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

**Response `200`**

```json
{ "success": true, "message": "Se este email estiver cadastrado, você receberá um link de redefinição." }
```

---

#### `POST /auth/reset-password`

Complete the password reset flow using the token received by email.

**Body**

| Field | Type | Required |
|-------|------|----------|
| `token` | string | ✅ |
| `newPassword` | string | ✅ |

**Response `200`**

```json
{ "success": true, "message": "Senha redefinida com sucesso" }
```

---

#### `POST /auth/logout` 🔒

Invalidates the session on the client side (token removal is client-handled).

**Response `200`**

```json
{ "success": true, "message": "Logout realizado com sucesso" }
```

---

### Users

**Base path:** `/api/v1/users`  
All routes require authentication.

---

#### `GET /users` 🔒 (staff+)

Return a flat list of all users. Used by staff/admin to look up user IDs for assigning children, sending messages, etc.

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "_id": "...", "firstName": "...", "lastName": "...", "email": "...", "role": "...", "phone": "..." }
  ]
}
```

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
| `photo_url` | string | — | URI |
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

Same fields as `POST`, all optional.

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
| `photo_url` | string | — URI |
| `is_authorized` | boolean | — defaults to `true` |

**Response `201`**

---

#### `PUT /pickup-persons/:id` 🔒 (admin)

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
| `photo_url` | string | ✅ | URL of the hosted photo |
| `caption` | string | — | |

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
| `receipt_url` | string | — URI |
| `vendor` | string | — |

**Response `201`**

---

#### `PUT /expenses/:id` 🔒 (admin)

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
