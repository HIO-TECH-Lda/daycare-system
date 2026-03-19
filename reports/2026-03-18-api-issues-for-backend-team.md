# API Issues & Missing Features — Backend Team
**Date:** 2026-03-18  
**Prepared by:** Frontend Team  
**Project:** Sonho de Criança — Daycare Management System

This document lists all bugs, missing endpoints, security gaps, and contract mismatches found in `../api` through code review. Items are grouped by severity. Please address **🔴 Critical** items before the next frontend integration milestone.

---

## 🔴 Critical — Bugs (Runtime Errors)

### 1. `GET /attendance` — Wrong response shape crashes the frontend

**File:** `src/controllers/attendanceController.ts` — `getAll`

`AttendanceService.findByDate()` and `findByChildId()` both return `{ attendances, total }`, but the controller passes the whole object directly to `ApiResponse.success()`:

```ts
// Bug: `attendances` here is actually { attendances: [...], total: N }
attendances = await AttendanceService.findByDate(date);
res.json(ApiResponse.success(attendances, '...'));
```

The frontend receives `data: { attendances: [...], total: N }` instead of `data: [...]` and crashes when trying to iterate.

**Fix:** Destructure the result before sending.
```ts
const { attendances, total } = await AttendanceService.findByDate(date);
res.json(ApiResponse.paginated(attendances, { page, limit, total }, '...'));
```

---

### 2. `getPaginationParams` not imported in `AttendanceController` — `ReferenceError` at runtime

**File:** `src/controllers/attendanceController.ts` — `getByChildId`

The method calls `getPaginationParams(req)` but `getPaginationParams` is not in the import list. This throws a `ReferenceError` the moment `GET /attendance/child/:childId` is called.

**Fix:** Add the missing import:
```ts
import { getPaginationParams } from '../utils/pagination';
```

---

### 3. `forgotPassword` is a completely empty stub — password reset is non-functional

**File:** `src/controllers/authController.ts` — `forgotPassword`

The handler ignores the request body entirely and returns a hardcoded success message. `AuthService.requestPasswordReset()` is fully implemented but **never called**.

```ts
// Current implementation — does nothing
static async forgotPassword(_req: Request, res: Response) {
  return res.json({ success: true, message: Messages.AUTH.PASSWORD_RESET_EMAIL_SENT });
}
```

**Fix:** Call the service method and wire it to an email transport (SMTP credentials are already in `.env` schema):
```ts
static async forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const { resetToken } = await AuthService.requestPasswordReset(email);
  // TODO: Send email with resetToken
  return res.json({ success: true, message: Messages.AUTH.PASSWORD_RESET_EMAIL_SENT });
}
```

---

## 🔴 Critical — Missing Endpoints

### 4. No `GET /users` endpoint — blocks multiple frontend features

There is no endpoint to list or search users. The frontend currently needs this in at least two places:

- **Admin > Alunos (Students):** selecting an existing `responsavel` (parent) when creating or editing a child. The form currently has a hardcoded stub with a `TODO` comment.
- **Messaging:** selecting a specific `recipient_id` for a direct message.

**Required endpoint (minimum):**
```
GET /api/v1/users?role=responsavel&page=1&limit=50
```

Should return `id`, `name`, `email`, `phone` — no passwords or sensitive fields. Access should require `authenticateToken` and optionally be restricted to `requireStaff`.

---

### 5. `GET /payments/invoice/:invoiceId` is missing — frontend will 404

**File:** `src/routes/payments.ts`

The frontend's API client calls `GET /payments/invoice/:invoiceId` (see `web-app/lib/api-services.ts → paymentsApi.getByInvoice`). The payments router only has `GET /` and `GET /:id`. This route does not exist.

**Fix:** Add the route and a `getByInvoice` method to `PaymentService` and `PaymentController`:
```ts
router.get('/invoice/:invoiceId', PaymentController.getByInvoiceId);
```

---

### 6. Monthly Report workflow endpoints missing — `validated_by` and `validated_at` are never set

**Files:** `src/routes/monthlyReports.ts`, `src/controllers/monthlyReportController.ts`

The `MonthlyReport` model has a `draft → submitted → validated/rejected` workflow with dedicated fields (`validated_by`, `validated_at`, `rejection_reason`), but:

- There is no `PATCH /:id/validate` endpoint.
- There is no `PATCH /:id/reject` endpoint.
- `validated_by` and `validated_at` are **never populated by any code path**. The only way to change status is a raw `PUT`, which doesn't auto-set the validator's identity or timestamp.

**Fix:** Add two dedicated endpoints, restricted to `requireAdmin`:

```ts
// PATCH /api/v1/monthly-reports/:id/validate
router.patch('/:id/validate', requireAdmin, MonthlyReportController.validate);

// PATCH /api/v1/monthly-reports/:id/reject
router.patch('/:id/reject', requireAdmin, MonthlyReportController.reject);
```

The `validate` handler should set `status: 'validated'`, `validated_by: req.user.userId`, `validated_at: new Date()`.  
The `reject` handler should set `status: 'rejected'` and `rejection_reason` from the request body.

---

## 🔴 Critical — Security Vulnerabilities

### 7. Invoice reads are not role-scoped — any parent can see any family's invoices

**File:** `src/controllers/invoiceController.ts` — `getAll`

`GET /invoices?parent_id=<id>` accepts any `parent_id` with no ownership check. A `responsavel` user can pass another parent's ID and read their financial data.

**Fix:** Enforce ownership when the requester is a `responsavel`:
```ts
if (req.user!.role === 'responsavel') {
  parentId = req.user!.userId; // Override — ignore query param
}
```

---

### 8. Daily report reads are not role-scoped — parents can access other children's reports

**File:** `src/controllers/dailyReportController.ts` — `getAll`

No role-based filtering is applied. A `responsavel` can call `GET /daily-reports` (or with any `?child_id=`) with no check that the child belongs to them.

**Fix:** Apply the same role-scoped filter pattern used in `ChildController`:
- `responsavel`: only allow `child_id` values that belong to `req.user.userId`
- `staff`: only allow children from assigned classes
- `administrador`: no restriction

---

### 9. Message endpoints have no authorization checks

**File:** `src/controllers/messageController.ts`

The following endpoints have no check that the requester is the sender or recipient of the message:

| Endpoint | Issue |
|---|---|
| `GET /messages/:id` | Any authenticated user can read any message |
| `PATCH /messages/:id/read` | Any user can mark any message as read |
| `DELETE /messages/:id` | Any user can delete any message |

**Fix:** After fetching the message, verify ownership:
```ts
const isOwner = message.sender_id.toString() === userId
  || message.recipient_id?.toString() === userId
  || message.recipient_role === userRole;
if (!isOwner) return res.status(403).json({ ... });
```

---

### 10. Admin/staff inbox misses direct messages sent to them by `recipient_id`

**File:** `src/controllers/messageController.ts` — `getInbox`

For `administrador` and `staff` roles, the inbox query only fetches messages where `recipient_role` matches. If someone sends a direct message to an admin by their user ID (`recipient_id`), it is **never shown** in that admin's inbox.

**Fix:** Use an `$or` query:
```ts
const query = {
  $or: [
    { recipient_id: new mongoose.Types.ObjectId(userId) },
    { recipient_role: role }
  ]
};
```

---

## 🟡 Important — Schema / Contract Mismatches

### 11. `phone` is silently stripped on profile update — can never be updated

**File:** `src/utils/validation.ts` — `updateProfileSchema`

The schema only allows `firstName`, `lastName`, `avatar`. The `phone` field is absent. Because all Joi validation runs with `stripUnknown: true`, any `phone` value sent by the frontend is **silently discarded** and the user's phone number can never be changed via `PUT /auth/me`.

**Fix:**
```ts
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().optional().allow(''),  // ← add this
  avatar: Joi.string().optional().allow('')
});
```

---

### 12. `message_type` enum is completely mismatched between frontend and backend

| Side | Allowed values |
|---|---|
| Frontend (`lib/types.ts`) | `'info'`, `'reminder'`, `'alert'`, `'general'` |
| Backend model + Joi schema | `'announcement'`, `'direct'`, `'reminder'`, `'other'` |

Only `'reminder'` overlaps. The frontend will send `'info'`, `'alert'`, or `'general'` and the Joi validation will reject them with a **400 error**. One side must be updated to match the other.

**Recommended fix** (align backend to frontend, as frontend values are more descriptive):
```ts
// src/models/Message.ts
message_type: {
  type: String,
  enum: ['info', 'reminder', 'alert', 'general'],
  default: 'general'
}

// src/utils/validation.ts
message_type: Joi.string().valid('info', 'reminder', 'alert', 'general').optional()
```

---

### 13. `GET /monthly-reports` returns empty without filters — breaks admin/staff list views

**File:** `src/controllers/monthlyReportController.ts` — `getAll`

If neither `child_id` nor a `month+year` combination is provided, the controller explicitly returns `[]`. Admin and staff pages that list all monthly reports (without knowing a specific `child_id` in advance) will always get an empty response.

**Fix:** When no filter is provided, fall back to listing all reports (paginated), restricted to the caller's role:
```ts
} else {
  // No filters — return all (role-scoped)
  const result = await MonthlyReportService.findAll(userRole, userId, page, limit);
  reports = result.reports;
  total = result.total;
}
```

---

## 🟡 Important — Other Issues

### 14. `register` doesn't return a `refreshToken`

**File:** `src/controllers/authController.ts` — `register`

`AuthService.registerUser` only generates an access token. The register response sends only `token`, not `refreshToken`. After registering, the user will be logged out on their first token expiry (7 days) because no refresh token was stored. The `login` endpoint correctly returns both — `register` should too.

**Fix:** Call `AuthService.generateRefreshToken()` in `registerUser` and include it in the response.

---

### 15. `AttendanceService.findByDate` uses exact Date match — unreliable for day-level queries

**File:** `src/services/attendanceService.ts` — `findByDate`

```ts
const [attendances] = await Attendance.find({ date: queryDate })
```

MongoDB Date comparison is exact, including time component. Dates stored in the DB (especially from the seed script) likely have non-zero time components. A plain day-level query string will produce no results.

**Fix:** Query a day range:
```ts
const start = new Date(queryDate);
start.setHours(0, 0, 0, 0);
const end = new Date(queryDate);
end.setHours(23, 59, 59, 999);
Attendance.find({ date: { $gte: start, $lte: end } })
```

---

### 16. Invoice number generation has a race condition under concurrent requests

**File:** `src/services/invoiceService.ts` — `generateInvoiceNumber`

```ts
const count = await Invoice.countDocuments({ invoice_number: new RegExp(`^INV-${year}-`) });
return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
```

Two simultaneous invoice creation requests will see the same `count`, generate the same `invoice_number`, and one will fail with a duplicate-key error from the unique index.

**Fix:** Use an atomic counter document with `findOneAndUpdate + $inc`, or switch to a timestamp/UUID-based invoice number that doesn't require a read-before-write.

---

### 17. Both JWT tokens use the same `JWT_SECRET`

**File:** `src/services/authService.ts`

Access tokens (7d) and refresh tokens (30d) are both signed with `process.env.JWT_SECRET`. If a refresh token leaks, it is indistinguishable from a long-lived access token and can be used to impersonate the user with no additional protection.

**Fix:** Introduce a separate `JWT_REFRESH_SECRET` environment variable and use it exclusively for refresh token signing and verification.

---

## Summary Table

| # | Severity | Area | Description |
|---|---|---|---|
| 1 | 🔴 Bug | Attendance | `getAll` sends `{ attendances, total }` object as `data` instead of array |
| 2 | 🔴 Bug | Attendance | `getPaginationParams` not imported — `ReferenceError` on `GET /attendance/child/:id` |
| 3 | 🔴 Bug | Auth | `forgotPassword` is a stub — password reset does nothing |
| 4 | 🔴 Missing | Users | No `GET /users` endpoint — blocks parent assignment and direct messaging |
| 5 | 🔴 Missing | Payments | `GET /payments/invoice/:invoiceId` does not exist — frontend gets 404 |
| 6 | 🔴 Missing | Monthly Reports | No validate/reject endpoints — `validated_by` and `validated_at` never set |
| 7 | 🔴 Security | Invoices | No ownership check on reads — any parent can see any family's invoices |
| 8 | 🔴 Security | Daily Reports | No role-scoped reads — parents can access reports for other children |
| 9 | 🔴 Security | Messages | No ownership checks on `GET /:id`, `PATCH /:id/read`, `DELETE /:id` |
| 10 | 🔴 Security | Messages | Admin/staff inbox misses direct messages sent to them by `recipient_id` |
| 11 | 🟡 Contract | Auth | `phone` silently stripped on profile update — can never be changed |
| 12 | 🟡 Contract | Messages | `message_type` enum values completely different on frontend vs backend |
| 13 | 🟡 Contract | Monthly Reports | `getAll` returns empty without filters — breaks admin/staff list views |
| 14 | 🟡 Other | Auth | `register` doesn't return `refreshToken` — user loses session after 7 days |
| 15 | 🟡 Other | Attendance | `findByDate` uses exact Date match — day-level queries return empty |
| 16 | 🟡 Other | Invoices | Invoice number generation has a race condition under concurrent requests |
| 17 | 🟡 Other | Auth | Access and refresh tokens share the same `JWT_SECRET` |
