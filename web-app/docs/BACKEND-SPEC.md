# Backend Specification — Daycare Management System

This document describes what the **backend API** must provide so the Next.js web app can work end-to-end. The backend is built from the **API starter kit** (`../api`). Use this spec together with the starter kit guide: [../api/docs/STARTER-KIT-GUIDE.md](../api/docs/STARTER-KIT-GUIDE.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Auth & Users](#2-auth--users)
3. [Response Format](#3-response-format)
4. [Language](#4-language)
5. [Resources & Endpoints](#5-resources--endpoints)
6. [Access Rules by Role](#6-access-rules-by-role)
7. [Implementation Checklist](#7-implementation-checklist)
8. [Frontend Types Reference](#8-frontend-types-reference)

---

## 1. Overview

### Product

- **Daycare management system** (“Sonho de Criança”) for children 0–5 years.
- **Three portals**: Responsável (parent/guardian), Staff (educator), Administrador (admin).

### Stack (starter kit)

- **Runtime**: Node.js, Express, TypeScript  
- **Database**: MongoDB (Mongoose)  
- **Auth**: JWT (access + refresh), existing auth routes  
- **Pattern**: For each resource add **model → service → controller → route**, then mount in `app.ts`. See [Adding a New Resource](../api/docs/STARTER-KIT-GUIDE.md#5-adding-a-new-resource) in the starter kit.

### Base URL & versioning

- All daycare resources live under **`/api/v1/`** (e.g. `/api/v1/classes`, `/api/v1/children`).
- Auth stays at **`/api/v1/auth`** (login, register, me, refresh, logout, etc.).

---

## 2. Auth & Users

### User roles

The frontend expects **three roles**. Extend the starter kit User model (or map existing `user`/`admin` to these):

| Role (frontend) | Description        | Suggested backend value |
|-----------------|--------------------|--------------------------|
| `responsavel`   | Parent/guardian    | e.g. `role: 'responsavel'` |
| `staff`         | Educator           | e.g. `role: 'staff'` |
| `administrador`  | Admin              | e.g. `role: 'administrador'` or reuse `admin` |

### User shape (for frontend)

Every **login**, **register**, and **GET /api/v1/auth/me** response must include a user object that the frontend can map to:

```ts
{
  id: string;           // _id as string
  email: string;
  name: string;         // full name (e.g. firstName + " " + lastName)
  role: 'responsavel' | 'staff' | 'administrador';
  phone: string;        // optional in API, default ""
}
```

- **Register**: Accept at least `firstName`, `lastName`, `email`, `password`, and optionally `role`, `phone`. Return `user` + `token` (and optionally `refreshToken`).
- **Login**: Return `user` (shape above), `token`, and `refreshToken` (if you support refresh).
- **GET /auth/me**: Return `{ user }` with the same shape. Use JWT to resolve current user.

If the starter kit uses `firstName`/`lastName`, either add a virtual `name` in the API response or document that the frontend will concatenate them.

### Protecting routes by role

- Add middleware (e.g. `requireRole('administrador')`, `requireRole('staff')`) and use it on routes that must be restricted.
- **Responsável**: can access only their own children, invoices, messages, etc. (filter by `parent_id === req.user.userId`).
- **Staff**: can access children and data for classes they are assigned to (use a staff_classes or equivalent table).
- **Administrador**: can access all resources.

---

## 3. Response Format

All JSON responses must follow this shape so the frontend can use them consistently:

```ts
{
  success: boolean;   // true for 2xx, false for 4xx/5xx
  message: string;   // short human-readable message
  data?: T;          // payload (user, list, single entity, etc.)
  error?: string;    // optional; for validation or server errors
}
```

- **Success (2xx)**: `success: true`, optional `data`, optional `message`.
- **Error (4xx/5xx)**: `success: false`, `message` (and optionally `error`) describing the problem.

The frontend uses `data` for typed responses (e.g. `data.children`, `data.user`).

---

## 4. Resources & Endpoints

Below, **Auth** means the route requires a valid JWT (`Authorization: Bearer <token>`). **Admin** / **Staff** / **Responsável** mean the route is restricted to that role (or more privileged). **Filter by user** means the API must filter results by the current user (e.g. responsável sees only their children).

IDs are strings (e.g. MongoDB ObjectId as string). Dates: ISO 8601 strings (e.g. `"2025-11-12"`, `"2025-11-12T16:30:00.000Z"`).

---

### 5.1 Classes

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/classes | Yes | Any | List all classes |
| GET    | /api/v1/classes/:id | Yes | Any | Get one class by id |
| POST   | /api/v1/classes | Yes | Admin | Create class |
| PUT    | /api/v1/classes/:id | Yes | Admin | Update class |
| DELETE | /api/v1/classes/:id | Yes | Admin | Delete class (ensure no children assigned or handle constraint) |

**Body (POST/PUT):**

```ts
{
  name: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
}
```

**Response (single):** `data: { id, name, min_age_months, max_age_months, capacity }`  
**Response (list):** `data: { classes: Class[] }` or `data: Class[]`

---

### 5.2 Children

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/children | Yes | Admin / Staff / Responsável | List children (Admin: all; Staff: assigned classes; Responsável: own by parent_id) |
| GET    | /api/v1/children/:id | Yes | Admin / Staff / Responsável | Get one child (respect access) |
| POST   | /api/v1/children | Yes | Admin | Create child |
| PUT    | /api/v1/children/:id | Yes | Admin | Update child |
| DELETE | /api/v1/children/:id | Yes | Admin | Delete child (or soft-delete) |

**Body (POST/PUT):** All fields below are optional except where noted.

```ts
{
  name: string;
  birth_date: string;           // YYYY-MM-DD
  class_id: string;
  parent_id: string;           // user id of responsável
  photo_url?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  gender?: 'Masculino' | 'Feminino';
  nationality?: string;
  address?: string;
  languages_spoken?: string;
  dietary_restrictions?: string;
  sleep_schedule?: string;
  preferred_foods?: string;
  separation_reaction?: string;
  plays_with_others?: boolean;
  behavior_notes?: string;
  previous_center?: string;
  transfer_reason?: string;
  image_usage_authorized?: boolean;
  enrollment_signature?: string;
  enrollment_date?: string;
}
```

**Response (single):** `data: { child: Child }`  
**Response (list):** `data: { children: Child[] }` or `data: Child[]`

---

### 5.3 Staff–Class assignments

Staff are assigned to classes. Used so staff see only children in their classes.

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/staff-assignments | Yes | Admin / Staff | List assignments (Staff: only own) |
| GET    | /api/v1/staff-assignments?staff_id=:id | Yes | Admin | List by staff id |
| POST   | /api/v1/staff-assignments | Yes | Admin | Assign staff to class |
| DELETE | /api/v1/staff-assignments/:id | Yes | Admin | Remove assignment |

**Body (POST):**

```ts
{ staff_id: string; class_id: string; }
```

**Response (list):** `data: { assignments: { id, staff_id, class_id }[] }`

---

### 5.4 Guardians (per child)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/children/:childId/guardians | Yes | Admin / Staff / Responsável (own child) | List guardians for a child |
| POST   | /api/v1/children/:childId/guardians | Yes | Admin | Add guardian |
| PUT    | /api/v1/guardians/:id | Yes | Admin | Update guardian |
| DELETE | /api/v1/guardians/:id | Yes | Admin | Remove guardian |

**Body (POST/PUT):**

```ts
{
  name: string;
  profession?: string;
  workplace?: string;
  phone?: string;
  email?: string;
  guardian_type: 1 | 2;  // 1 = primary, 2 = secondary
}
```

---

### 5.5 Authorized pickup persons

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/children/:childId/pickup-persons | Yes | Admin / Staff / Responsável (own child) | List |
| POST   | /api/v1/children/:childId/pickup-persons | Yes | Admin | Add |
| PUT    | /api/v1/pickup-persons/:id | Yes | Admin | Update |
| DELETE | /api/v1/pickup-persons/:id | Yes | Admin | Remove |

**Body (POST/PUT):** `{ name: string; kinship_degree?: string; }`

---

### 5.6 Daily reports

One report per child per day. Created by staff.

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/daily-reports | Yes | Admin / Staff / Responsável | List (Staff: own classes; Responsável: own children). Query: `?child_id= &report_date=` |
| GET    | /api/v1/daily-reports/:id | Yes | Admin / Staff / Responsável | Get one |
| POST   | /api/v1/daily-reports | Yes | Staff / Admin | Create |
| PUT    | /api/v1/daily-reports/:id | Yes | Staff / Admin | Update |
| DELETE | /api/v1/daily-reports/:id | Yes | Admin | Delete |

**Body (POST/PUT):**

```ts
{
  child_id: string;
  report_date: string;   // YYYY-MM-DD
  mood?: string;
  summary_note?: string;
  created_by: string;    // user id, or set from token
}
```

**Response:** `data: { dailyReport }` or `data: { dailyReports: [] }`

---

### 5.7 Activities (within a daily report)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/daily-reports/:reportId/activities | Yes | Any (respect report access) | List activities |
| POST   | /api/v1/daily-reports/:reportId/activities | Yes | Staff / Admin | Add activity |
| PUT    | /api/v1/activities/:id | Yes | Staff / Admin | Update |
| DELETE | /api/v1/activities/:id | Yes | Staff / Admin | Delete |

**Body (POST/PUT):**

```ts
{
  activity_type: 'nap' | 'feeding' | 'diaper' | 'pedagogical';
  time: string;           // e.g. "09:30"
  duration_minutes?: number;
  food_item?: string;
  amount?: string;
  diaper_condition?: string;
  description?: string;
}
```

---

### 5.8 Report photos

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/daily-reports/:reportId/photos | Yes | Any (respect report access) | List photos |
| POST   | /api/v1/daily-reports/:reportId/photos | Yes | Staff / Admin | Upload photo (URL or multipart; use starter kit Cloudinary) |
| DELETE | /api/v1/report-photos/:id | Yes | Staff / Admin | Delete |

**Body (POST):** `{ photo_url: string }` or multipart file upload.

---

### 5.9 Attendance (check-in/out per child per day)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/attendance | Yes | Admin / Staff / Responsável | List. Query: `?child_id= &attendance_date=` |
| GET    | /api/v1/attendance/:id | Yes | Same | Get one |
| POST   | /api/v1/attendance | Yes | Staff / Admin | Create or upsert by child_id + date |
| PUT    | /api/v1/attendance/:id | Yes | Staff / Admin | Update (e.g. check_out_time, picked_up_by) |
| DELETE | /api/v1/attendance/:id | Yes | Admin | Delete |

**Body (POST/PUT):**

```ts
{
  child_id: string;
  attendance_date: string;  // YYYY-MM-DD
  check_in_time?: string;
  check_out_time?: string;
  brought_by?: string;
  picked_up_by?: string;
}
```

---

### 5.10 Calendar events

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/calendar-events | Yes | Any | List. Optional query: `?class_id= &event_date=` |
| GET    | /api/v1/calendar-events/:id | Yes | Any | Get one |
| POST   | /api/v1/calendar-events | Yes | Admin | Create |
| PUT    | /api/v1/calendar-events/:id | Yes | Admin | Update |
| DELETE | /api/v1/calendar-events/:id | Yes | Admin | Delete |

**Body (POST/PUT):**

```ts
{
  title: string;
  description?: string;
  event_date: string;   // YYYY-MM-DD
  event_type: string;
  class_id?: string;    // optional; null = all classes
}
```

---

### 5.11 Invoices

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/invoices | Yes | Admin / Responsável | List (Responsável: own by parent_id) |
| GET    | /api/v1/invoices/:id | Yes | Admin / Responsável (own) | Get one |
| POST   | /api/v1/invoices | Yes | Admin | Create |
| PUT    | /api/v1/invoices/:id | Yes | Admin | Update (e.g. status, paid_amount) |
| DELETE | /api/v1/invoices/:id | Yes | Admin | Delete or void |

**Body (POST/PUT):**

```ts
{
  parent_id: string;
  child_id: string;
  amount: number;
  due_date: string;
  issue_date: string;
  status?: 'pendente' | 'pago';
  paid_amount?: number;
  last_payment_date?: string;
}
```

---

### 5.12 Payments

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/payments | Yes | Admin / Responsável (own) | List. Query: `?parent_id= &child_id= &invoice_id=` |
| GET    | /api/v1/payments/:id | Yes | Admin / Responsável (own) | Get one |
| POST   | /api/v1/payments | Yes | Admin | Record payment |
| PUT    | /api/v1/payments/:id | Yes | Admin | Update |
| DELETE | /api/v1/payments/:id | Yes | Admin | Delete (e.g. correction) |

**Body (POST/PUT):**

```ts
{
  invoice_id?: string;
  parent_id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
  recorded_by: string;  // or set from token
}
```

---

### 5.13 Expense categories

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/expense-categories | Yes | Admin | List |
| GET    | /api/v1/expense-categories/:id | Yes | Admin | Get one |
| POST   | /api/v1/expense-categories | Yes | Admin | Create |
| PUT    | /api/v1/expense-categories/:id | Yes | Admin | Update |
| DELETE | /api/v1/expense-categories/:id | Yes | Admin | Delete |

**Body (POST/PUT):** `{ name: string; description?: string; }`

---

### 5.14 Expenses

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/expenses | Yes | Admin | List. Query: `?category_id= &from= &to=` |
| GET    | /api/v1/expenses/:id | Yes | Admin | Get one |
| POST   | /api/v1/expenses | Yes | Admin | Create |
| PUT    | /api/v1/expenses/:id | Yes | Admin | Update |
| DELETE | /api/v1/expenses/:id | Yes | Admin | Delete |

**Body (POST/PUT):**

```ts
{
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  supplier_name?: string;
  notes?: string;
  receipt_url?: string;
  recorded_by: string;
}
```

---

### 5.15 Messages (conversations between users)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/messages | Yes | Any | List messages for current user. Query: `?receiver_id= &sender_id= &limit= &offset=` or thread with another user |
| GET    | /api/v1/messages/:id | Yes | Any | Get one (only if participant) |
| POST   | /api/v1/messages | Yes | Any | Send message |
| PATCH  | /api/v1/messages/:id/read | Yes | Any | Mark as read |

**Body (POST):** `{ receiver_id: string; message: string; }`  
**Response (list):** `data: { messages: Message[] }` — each with `id, sender_id, receiver_id, message, read, created_at`.

---

### 5.16 Monthly reports (per child, per month)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/monthly-reports | Yes | Admin / Staff / Responsável | List. Query: `?child_id= &report_month= &report_year=` |
| GET    | /api/v1/monthly-reports/:id | Yes | Same | Get one |
| POST   | /api/v1/monthly-reports | Yes | Staff / Admin | Create (draft) |
| PUT    | /api/v1/monthly-reports/:id | Yes | Staff / Admin | Update; Admin can validate/reject |
| DELETE | /api/v1/monthly-reports/:id | Yes | Admin | Delete |

**Body (POST/PUT):**

```ts
{
  child_id: string;
  report_month: number;  // 1-12
  report_year: number;
  physical_development?: string;
  cognitive_development?: string;
  social_development?: string;
  emotional_development?: string;
  general_notes?: string;
  achievements?: string;
  areas_for_improvement?: string;
  status?: 'draft' | 'submitted' | 'validated' | 'rejected';
  rejection_reason?: string;  // when status = rejected
}
```

**Validated by:** Admin sets `validated_by`, `validated_at` when status becomes `validated`.

---

### 5.17 Enrollment documents (optional / later)

If you support document uploads per child:

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET    | /api/v1/children/:childId/documents | Yes | Admin / Staff / Responsável (own child) | List |
| POST   | /api/v1/children/:childId/documents | Yes | Admin | Upload (type, file → URL via Cloudinary) |
| PATCH  | /api/v1/enrollment-documents/:id | Yes | Admin | Set status: pending / verified |

**Document types:** `birth_certificate` | `guardian_id` | `proof_of_residence` | `child_photo` | `vaccination_record`

---

## 6. Access Rules by Role

| Role          | Can see / do |
|---------------|----------------|
| **responsavel** | Own profile; own children; guardians & pickup persons for own children; daily reports & activities & photos for own children; attendance for own children; own invoices & payments; calendar events (all or by class of own children); messages sent/received; monthly reports for own children (read-only when validated). Cannot create/update/delete backend data except profile and possibly messages. |
| **staff**       | Profile; classes they are assigned to; children in those classes; guardians & pickup persons for those children; daily reports & activities & photos for those classes (create/update); attendance for those children (create/update); calendar events; messages; monthly reports for assigned classes (create/update draft/submitted). Cannot access invoices, payments, expenses, or other staff assignments. |
| **administrador** | Full access: users, classes, children, staff assignments, guardians, pickup persons, daily reports, activities, report photos, attendance, calendar events, invoices, payments, expense categories, expenses, messages, monthly reports (including validate/reject). |

Implement these rules in services or middleware by checking `req.user.role` and `req.user.userId` and filtering or rejecting accordingly.

---

## 7. Implementation Checklist

Use the [API starter kit guide](../api/docs/STARTER-KIT-GUIDE.md) for each resource.

1. **Extend User model**  
   Add `role` (`responsavel` | `staff` | `administrador`) and `phone`. Ensure login/register/me return the [User shape](#2-auth--users) expected by the frontend.

2. **Add role middleware**  
   e.g. `requireRole('administrador')`, `requireRole('staff')`, and optionally `requireResponsavel` (or filter by `parent_id` in services).

3. **Resources (suggested order)**  
   - Classes  
   - Children  
   - Staff assignments  
   - Guardians, Authorized pickup persons  
   - Daily reports → Activities → Report photos  
   - Attendance  
   - Calendar events  
   - Invoices → Payments  
   - Expense categories → Expenses  
   - Messages  
   - Monthly reports  
   - (Optional) Enrollment documents  

4. **For each resource**  
   - Define Mongoose model (align field names and types with [Frontend types](#7-frontend-types-reference)).  
   - Implement service (business logic + access filters).  
   - Controller (parse body/params, call service, return `{ success, message, data }`).  
   - Routes with `authenticateToken` and role checks.  
   - Mount in `app.ts` under `/api/v1/<resource>`.  
   - Add Joi validation for body/query where useful.  
   - Optionally exclude noisy routes from audit log.

5. **CORS**  
   Allow the frontend origin (e.g. `http://localhost:3000` in dev, production URL in prod).

6. **File uploads**  
   Use the starter kit’s Multer + Cloudinary for report photos and enrollment documents (avatar already supported).

---

## 8. Frontend Types Reference

The frontend uses these TypeScript types. API responses should align so that `data` can be typed with them (e.g. `data.child` matches `Child`). IDs and dates are strings.

- **User**: `id`, `email`, `name`, `role`, `phone`  
- **Class**: `id`, `name`, `min_age_months`, `max_age_months`, `capacity`  
- **Child**: see [4.2 Children](#42-children) body; plus `id`.  
- **Guardian**: `id`, `child_id`, `name`, `profession`, `workplace`, `phone`, `email`, `guardian_type`  
- **AuthorizedPickupPerson**: `id`, `child_id`, `name`, `kinship_degree`  
- **DailyReport**: `id`, `child_id`, `report_date`, `mood`, `summary_note`, `created_by`  
- **Activity**: `id`, `daily_report_id`, `activity_type`, `time`, `duration_minutes`, `food_item`, `amount`, `diaper_condition`, `description`  
- **ReportPhoto**: `id`, `daily_report_id`, `photo_url`  
- **Attendance**: `id`, `child_id`, `attendance_date`, `check_in_time`, `check_out_time`, `brought_by`, `picked_up_by`  
- **CalendarEvent**: `id`, `title`, `description`, `event_date`, `event_type`, `class_id?`  
- **Invoice**: `id`, `parent_id`, `child_id`, `amount`, `due_date`, `issue_date`, `status`, `paid_amount?`, `last_payment_date?`  
- **Payment**: `id`, `invoice_id?`, `parent_id`, `child_id`, `amount`, `payment_date`, `payment_method`, `payment_method_details?`, `reference_number?`, `notes?`, `recorded_by`, `created_at`  
- **ExpenseCategory**: `id`, `name`, `description?`  
- **Expense**: `id`, `category_id`, `description`, `amount`, `expense_date`, `payment_method`, etc., `recorded_by`, `created_at`  
- **Message**: `id`, `sender_id`, `receiver_id`, `message`, `read`, `created_at`  
- **MonthlyReport**: `id`, `child_id`, `report_month`, `report_year`, status fields, `created_by`, `validated_by?`, `validated_at?`, `rejection_reason?`, `created_at`, `updated_at`

Full definitions: see `lib/types.ts` in the web-app.

---

**End of Backend Specification.** For implementation details and patterns, always refer to [../api/docs/STARTER-KIT-GUIDE.md](../api/docs/STARTER-KIT-GUIDE.md).
