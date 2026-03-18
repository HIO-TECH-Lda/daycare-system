# Frontend → Live Backend Integration Guide

Everything the frontend team needs to connect the Next.js web app to the live Express/MongoDB API.

> **Last updated: 2026-03-18** — Reflects backend fixes applied after the frontend code review. See the [changelog at the bottom](#changelog) for a summary of what changed.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [How the API Client Works](#2-how-the-api-client-works)
3. [Authentication Flow](#3-authentication-flow)
4. [Response Format](#4-response-format)
5. [Role-Based Access](#5-role-based-access)
6. [Available API Services](#6-available-api-services)
7. [Frontend Service Functions to Add](#7-frontend-service-functions-to-add)
8. [TanStack Query Pattern](#8-tanstack-query-pattern)
9. [Page Integration Checklist](#9-page-integration-checklist)
10. [Error Handling](#10-error-handling)
11. [File Uploads](#11-file-uploads)
12. [Common Gotchas](#12-common-gotchas)
13. [Changelog](#changelog)

---

## 1. Environment Setup

### Local Development

Create or update `web-app/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

The backend runs on port `3002` by default. Start it with:

```bash
# from /api
npm run dev
```

### Production

Set `NEXT_PUBLIC_API_URL` to the deployed backend URL (e.g. a Vercel deployment):

```env
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

> **No trailing slash.** The API client strips it automatically.

If `NEXT_PUBLIC_API_URL` is not set, the client falls back to `http://localhost:3002` on the server and `<current-origin>:3002` in the browser.

---

## 2. How the API Client Works

All HTTP calls go through `lib/api-client.ts`. You never need to call `fetch` directly.

### Base URL

The client always appends `/api/v1` to the base URL. So when you call:

```ts
apiGet('/classes')
```

it hits `http://localhost:3002/api/v1/classes`.

### Token Management

Tokens are stored in `localStorage` under these keys:

| Key | Value |
|-----|-------|
| `daycare_access_token` | JWT access token (short-lived) |
| `daycare_refresh_token` | Refresh token (long-lived) |
| `daycare_user` | Serialized `User` object (for quick reads) |

The client automatically:
- Attaches `Authorization: Bearer <token>` to every request
- Detects `401` responses and attempts a silent token refresh via `POST /auth/refresh`
- Retries the original request once with the new token
- Clears tokens and user data if the refresh also fails

You should never read tokens directly. Use `useAuth()` for the current user and let the client handle headers.

### HTTP helpers

```ts
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client';
```

| Helper | When to use |
|--------|-------------|
| `apiGet(path, { params })` | GET with optional query params |
| `apiPost(path, body)` | POST / create |
| `apiPut(path, body)` | PUT / full update |
| `apiPatch(path, body)` | PATCH / partial update |
| `apiDelete(path)` | DELETE |

All helpers return `Promise<ApiResponseBody<T>>`.

### Pre-built service functions

Prefer `lib/api-services.ts` over calling the helpers directly. Every resource already has a typed service object:

```ts
import { classesApi, childrenApi, invoicesApi, /* ... */ } from '@/lib/api-services';
```

---

## 3. Authentication Flow

### Login

Use the `useAuth()` hook from `lib/auth-context.tsx`:

```tsx
import { useAuth } from '@/lib/auth-context';

const { login, logout, user, loading } = useAuth();

// Login
await login(email, password);

// Current user (null if not logged in)
console.log(user?.role); // 'responsavel' | 'staff' | 'administrador'
```

On a successful login the auth context:
1. Calls `POST /api/v1/auth/login`
2. Stores `accessToken` and `refreshToken` in `localStorage`
3. Maps the API user (`firstName`, `lastName`) → `User.name` (concatenated)
4. Sets the user in React state and `localStorage`

### Logout

```tsx
await logout();
// Calls POST /api/v1/auth/logout, clears all tokens and state
```

### Checking auth on page load

`AuthProvider` (already wrapped in `app/layout.tsx`) restores the session from `localStorage` on mount. While loading, `loading === true` — show a spinner or return `null`.

```tsx
const { user, loading } = useAuth();

if (loading) return <LoadingSpinner />;
if (!user) redirect('/login');
```

### Registration

`POST /auth/register` now returns both tokens, matching the login response shape:

```ts
{
  user: { id, name, email, role, phone },
  token: string,
  refreshToken: string   // ← now included
}
```

The existing `authApi.register(...)` call and `AuthProvider` handle this automatically — no frontend code change needed.

### Password reset

`POST /auth/forgot-password` is now **functional**. It generates a reset token stored on the user account. Once your team wires an email transport to the backend, the token will be delivered by email. The frontend call is:

```ts
await authApi.forgotPassword(email);
// or directly:
await apiPost('/auth/forgot-password', { email });
```

The endpoint always returns `success: true` regardless of whether the email exists (security best practice).

### Updating profile / changing password

`PUT /auth/me` now accepts `phone` in addition to `firstName`, `lastName`, and `avatar`:

```ts
import { authApi } from '@/lib/api-client';

await authApi.updateProfile({ firstName: 'Ana', phone: '+244 923 000 000' });
await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword });
```

---

## 4. Response Format

Every endpoint returns the same JSON shape:

```ts
{
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

- `success: true` + `data` → happy path
- `success: false` + `message` → user-facing error (already in Portuguese from the backend)
- `pagination` → present on list endpoints that support it

The TypeScript type is `ApiResponseBody<T>` from `lib/api-client.ts`.

---

## 5. Role-Based Access

Three roles exist. Each portal has its own route group:

| Role | Value | Portal prefix |
|------|-------|--------------|
| Parent/guardian | `responsavel` | `/responsavel/` |
| Educator | `staff` | `/staff/` |
| Administrator | `administrador` | `/admin/` |

Read the current user's role from `useAuth()`:

```tsx
const { user } = useAuth();

if (user?.role !== 'administrador') {
  redirect('/');
}
```

### What each role can access

| Resource | responsavel | staff | administrador |
|----------|-------------|-------|---------------|
| Classes | Read | Read (assigned) | Full CRUD |
| Children | Own only | Assigned classes | Full CRUD |
| Guardians / Pickup persons | Own children | Assigned children | Full CRUD |
| Daily reports | Own children (read) | Create/update | Full CRUD |
| Attendance | Own children (read) | Create/update | Full CRUD |
| Monthly reports | Own children (read when validated) | Create/update draft | Full CRUD + validate |
| Invoices / Payments | Own (read) | — | Full CRUD |
| Expenses / Categories | — | — | Full CRUD |
| Calendar events | Read | Read | Full CRUD |
| Messages | Send/receive | Send/receive | Send/receive |
| Staff assignments | — | Own (read) | Full CRUD |

The backend **enforces all of these rules server-side**. The frontend only needs to hide/show UI elements. Specific enforcement behaviors to be aware of:

| Endpoint | Enforcement |
|----------|-------------|
| `GET /invoices` | `parent_id` query param is **ignored** for `responsavel` — the backend forces it to the caller's own ID. Passing another parent's ID will silently return only the caller's invoices. |
| `GET /daily-reports` | Automatically scoped by role. `responsavel` sees only their children's reports; `staff` sees only reports for children in their assigned classes. No extra params needed. |
| `GET /messages/inbox` | Returns both messages sent **directly** (`recipient_id`) and broadcast to the caller's role (`recipient_role`). Previously, direct messages to staff/admin were missing from their inbox. |
| `GET /monthly-reports` | Without `child_id` or `month+year` filters, returns a role-scoped list. `responsavel` receives only `validated` reports for their own children. |
| `GET /messages/:id`, `PATCH /:id/read`, `DELETE /:id` | Returns `403` if the caller is neither sender nor recipient of the message. |

---

## 6. Available API Services

All services live in `lib/api-services.ts`. Import what you need:

```ts
import {
  classesApi,
  childrenApi,
  staffAssignmentsApi,
  guardiansApi,
  pickupPersonsApi,
  dailyReportsApi,
  activitiesApi,
  reportPhotosApi,
  attendanceApi,
  calendarEventsApi,
  invoicesApi,
  paymentsApi,
  expenseCategoriesApi,
  expensesApi,
  messagesApi,
  monthlyReportsApi,
  usersApi,          // ← new — see Section 7 for the function to add
} from '@/lib/api-services';
```

### Quick reference

```ts
// Classes
classesApi.list()
classesApi.get(id)
classesApi.create({ name, min_age_months, max_age_months, capacity })
classesApi.update(id, data)
classesApi.delete(id)

// Children
childrenApi.list({ page?, limit?, child_id? })
childrenApi.get(id)
childrenApi.create({ name, birth_date, class_id, parent_id, ...optional })
childrenApi.update(id, data)
childrenApi.delete(id)

// Staff assignments
staffAssignmentsApi.list({ staff_id? })
staffAssignmentsApi.create({ staff_id, class_id })
staffAssignmentsApi.delete(id)

// Guardians
guardiansApi.list({ child_id? })
guardiansApi.getByChild(childId)
guardiansApi.create({ child_id, name, guardian_type, ...optional })
guardiansApi.update(id, data)
guardiansApi.delete(id)

// Pickup persons
pickupPersonsApi.list({ child_id? })
pickupPersonsApi.getByChild(childId)
pickupPersonsApi.create({ child_id, name, ...optional })
pickupPersonsApi.update(id, data)
pickupPersonsApi.delete(id)

// Daily reports
dailyReportsApi.list({ child_id?, start_date?, end_date? })
dailyReportsApi.getByChild(childId, { start_date?, end_date? })
dailyReportsApi.create({ child_id, date, meals?, activities?, nap_time?, mood?, notes?, ... })
dailyReportsApi.update(id, data)
dailyReportsApi.delete(id)

// Activities
activitiesApi.list({ class_id?, active_only? })
activitiesApi.create({ name, description?, class_id?, ... })
activitiesApi.update(id, data)
activitiesApi.delete(id)

// Report photos
reportPhotosApi.getByReport(reportId)
reportPhotosApi.create({ daily_report_id, photo_url, caption? })
reportPhotosApi.delete(id)

// Attendance
attendanceApi.list({ child_id?, date?, start_date?, end_date? })
attendanceApi.getByChild(childId, { start_date?, end_date? })
attendanceApi.create({ child_id, date, check_in?, check_out?, status, notes? })
attendanceApi.update(id, data)
attendanceApi.delete(id)

// Calendar events
calendarEventsApi.list({ start_date?, end_date?, class_id? })
calendarEventsApi.create({ title, start_date, end_date, event_type, description?, is_all_day?, class_id? })
calendarEventsApi.update(id, data)
calendarEventsApi.delete(id)

// Invoices
invoicesApi.list({ parent_id?, status? })
invoicesApi.create({ child_id, parent_id, issue_date, due_date, amount, items })
invoicesApi.update(id, data)
invoicesApi.updateStatus(id, 'pending' | 'paid' | 'overdue' | 'cancelled')
invoicesApi.delete(id)

// Payments
paymentsApi.list({ invoice_id?, start_date?, end_date? })
paymentsApi.getByInvoice(invoiceId)
paymentsApi.create({ parent_id, child_id, amount, payment_date, payment_method, ... })
paymentsApi.delete(id)

// Expense categories
expenseCategoriesApi.list({ active_only? })
expenseCategoriesApi.create({ name, description?, is_active? })
expenseCategoriesApi.update(id, data)
expenseCategoriesApi.delete(id)

// Expenses
expensesApi.list({ category_id?, start_date?, end_date? })
expensesApi.create({ category_id, amount, description, expense_date, receipt_url?, vendor? })
expensesApi.update(id, data)
expensesApi.delete(id)

// Messages
// message_type values: 'info' | 'reminder' | 'alert' | 'general'  ← fixed (was 'announcement'|'direct'|'other')
messagesApi.getInbox({ unread_only? })
messagesApi.getSent()
messagesApi.get(id)
messagesApi.send({ recipient_id, content, subject?, message_type?, child_id? })
messagesApi.markAsRead(id)
messagesApi.delete(id)

// Monthly reports
// list() without filters now returns a role-scoped list (was always empty before)
monthlyReportsApi.list({ child_id?, month?, year? })
monthlyReportsApi.getByChild(childId, { year? })
monthlyReportsApi.create({ child_id, month, year, status?, attendance_summary?, ... })
monthlyReportsApi.update(id, data)
monthlyReportsApi.delete(id)
// New workflow endpoints — admin only:
monthlyReportsApi.validate(id)
monthlyReportsApi.reject(id, rejection_reason)

// Users (new endpoint)
// Returns: { id, name, email, phone, role }[] — no passwords
// Requires staff or admin token
usersApi.list({ role?, search?, page?, limit? })
```

---

## 7. Frontend Service Functions to Add

The following functions do not yet exist in `lib/api-services.ts`. Add them before integrating the relevant pages.

### `usersApi` — add to `lib/api-services.ts`

Used in: admin student enrollment (parent selection), messaging (recipient picker).

```ts
export const usersApi = {
  list: (params?: { role?: string; search?: string; page?: number; limit?: number }) =>
    apiGet<{ id: string; name: string; email: string; phone: string; role: string }[]>(
      '/users',
      { params }
    ),
};
```

### Monthly report workflow — add to `monthlyReportsApi`

Used in: admin monthly reports page (validate/reject buttons).

```ts
// Inside the existing monthlyReportsApi object:
validate: (id: string) =>
  apiPatch<MonthlyReport>(`/monthly-reports/${id}/validate`, {}),

reject: (id: string, rejection_reason: string) =>
  apiPatch<MonthlyReport>(`/monthly-reports/${id}/reject`, { rejection_reason }),
```

### Query keys — add to `lib/query-keys.ts`

```ts
users: {
  all: ['users'] as const,
  list: (filters?: Record<string, unknown>) =>
    filters
      ? [...queryKeys.users.all, 'list', filters] as const
      : [...queryKeys.users.all, 'list'] as const,
},
```

---

## 8. TanStack Query Pattern

TanStack Query is already installed and configured via `lib/query-provider.tsx`. Use this pattern on every page that reads or writes data.

### Query keys

All keys are pre-defined in `lib/query-keys.ts`:

```ts
import { queryKeys } from '@/lib/query-keys';

// Examples
queryKeys.children.list()
queryKeys.children.list({ class_id: 'abc' })  // with filters
queryKeys.children.detail('child-id')
queryKeys.invoices.list()
queryKeys.messages.inbox()
```

### Read data (useQuery)

```tsx
import { useQuery } from '@tanstack/react-query';
import { childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';

const { data: children = [], isLoading, isError } = useQuery({
  queryKey: queryKeys.children.list(),
  queryFn: async () => {
    const res = await childrenApi.list();
    return res.data ?? [];
  },
});
```

### Write data (useMutation)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { childrenApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';

const queryClient = useQueryClient();

const createChild = useMutation({
  mutationFn: (data: Parameters<typeof childrenApi.create>[0]) =>
    childrenApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
    toast.success(messages.success.created);
  },
  onError: (err) => {
    toast.error(err instanceof Error ? err.message : messages.api.createFailed);
  },
});

// In your handler:
await createChild.mutateAsync({ name: 'Maria', birth_date: '2022-03-01', class_id, parent_id });
```

### Update & delete

```tsx
const updateChild = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<Child> }) =>
    childrenApi.update(id, data),
  onSuccess: (_, { id }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.children.detail(id) });
    toast.success(messages.success.updated);
  },
});

const deleteChild = useMutation({
  mutationFn: (id: string) => childrenApi.delete(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
    toast.success(messages.success.deleted);
  },
});
```

### Migration from mock data

For each page, follow these steps:

1. **Remove** `import { mockX } from '@/lib/mock-data'`
2. **Add** the relevant `useQuery` / `useMutation` blocks above
3. **Replace** `const [items, setItems] = useState(mockItems)` with the query's `data`
4. **Replace** direct state mutations (`setItems(...)`) with `mutation.mutateAsync(...)`
5. **Add** a loading state: `if (isLoading) return <Skeleton />`

---

## 9. Page Integration Checklist

Pages still using mock data as of the last status check:

### Admin
- [ ] `app/admin/alunos/page.tsx` — form submission handlers need updating
- [ ] `app/admin/matriculas/page.tsx`
- [ ] `app/admin/matriculas/questionario/page.tsx`
- [ ] `app/admin/staff/page.tsx`
- [ ] `app/admin/faturamento/visao-geral/page.tsx`
- [ ] `app/admin/pagamentos/page.tsx`
- [ ] `app/admin/pagamentos/relatorios/page.tsx`
- [ ] `app/admin/despesas/page.tsx`
- [ ] `app/admin/despesas/relatorios/page.tsx`
- [ ] `app/admin/eventos/gestao/page.tsx`
- [ ] `app/admin/relatorios-mensais/page.tsx`

### Staff
- [ ] `app/staff/turma/[classId]/page.tsx`
- [ ] `app/staff/presenca/page.tsx`
- [ ] `app/staff/relatorio/preencher/[childId]/[date]/page.tsx`
- [ ] `app/staff/mensagens/page.tsx`
- [ ] `app/staff/relatorios-mensais/page.tsx`

### Responsavel
- [ ] `app/responsavel/relatorio/[childId]/page.tsx`
- [ ] `app/responsavel/faturamento/page.tsx`
- [ ] `app/responsavel/mensagens/page.tsx`
- [ ] `app/responsavel/eventos/page.tsx`
- [ ] `app/responsavel/perfil/page.tsx`
- [ ] `app/responsavel/relatorios-mensais/page.tsx`

### Already integrated ✅
- `app/admin/dashboard/page.tsx`
- `app/admin/turmas/page.tsx`
- `app/staff/dashboard/page.tsx`
- `app/responsavel/dashboard/page.tsx`

---

## 10. Error Handling

### ApiClientError

When a request fails (4xx / 5xx), the client throws `ApiClientError`:

```ts
import { ApiClientError } from '@/lib/api-client';

try {
  await childrenApi.create(data);
} catch (err) {
  if (err instanceof ApiClientError) {
    console.log(err.status);   // HTTP status code, e.g. 422
    console.log(err.message);  // message from the API response body
    console.log(err.body);     // full ApiResponseBody
  }
}
```

### In mutations (recommended)

The `onError` callback in `useMutation` already receives the thrown error. The backend's `message` field is always in Portuguese, so you can show it directly:

```ts
onError: (err) => {
  const msg = err instanceof ApiClientError
    ? err.message
    : messages.api.requestFailed;
  toast.error(msg);
},
```

### Validation errors

When the backend returns `422` with `errors: string[]`, show each one:

```ts
if (err instanceof ApiClientError && err.body?.errors) {
  err.body.errors.forEach((e) => toast.error(e));
}
```

---

## 11. File Uploads

The backend uses **Cloudinary** for file storage. The frontend should send the file to the upload endpoint first, then use the returned URL as a field in the resource payload.

### Avatar (user profile photo)

```ts
// POST /api/v1/auth/upload-avatar  (multipart/form-data, field: "avatar")
const formData = new FormData();
formData.append('avatar', file);

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/upload-avatar`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${getAccessToken()}` },
  body: formData,
});
const { data } = await res.json();
// data.avatar_url → use in updateProfile
```

### Report photos

```ts
// POST /api/v1/report-photos  — send photo_url (already uploaded to Cloudinary)
// or POST /api/v1/report-photos (multipart) if the backend handles the upload directly
await reportPhotosApi.create({
  daily_report_id: reportId,
  photo_url: cloudinaryUrl,
  caption: 'Brincando no pátio',
});
```

> For multi-file uploads, use the `/upload` endpoint from the starter kit (see `src/middleware/upload.ts` in the API).

---

## 12. Common Gotchas

### IDs

The backend uses MongoDB `ObjectId`. On the wire these are strings. The frontend types (`lib/types.ts`) use `id: string` (the API client maps `_id` → `id` via the model's `toJSON`). Always use the string `id` from the response — never try to construct one on the client.

### Dates

All dates in request bodies must be **ISO 8601 strings**:
- Date only: `"2025-11-12"` (YYYY-MM-DD)
- Datetime: `"2025-11-12T16:30:00.000Z"`

Use `date-fns` (already installed) to format:

```ts
import { format } from 'date-fns';
const isoDate = format(selectedDate, 'yyyy-MM-dd');
```

### Pagination

List endpoints accept `?page=1&limit=20`. The response includes a `pagination` object:

```ts
const res = await childrenApi.list({ page: 1, limit: 20 });
res.pagination?.total   // total records
res.pagination?.pages   // total pages
```

If you don't pass pagination params the backend returns all records (or a default limit).

### CORS

The backend allows all origins (`cors()` with no options) in the current configuration. In production, it should be locked down to the frontend's URL. If you see CORS errors in production, confirm `NEXT_PUBLIC_API_URL` matches the backend's allowed origin.

### 401 vs. 403

- `401 Unauthorized` → not logged in or token expired (client will auto-refresh)
- `403 Forbidden` → logged in but the role doesn't have permission → show an "access denied" message, not a login redirect

### Token not found after hard refresh

If `localStorage` is cleared or the user opens a new browser tab in private mode, `getAccessToken()` returns `null` and all requests will be unauthenticated. The `AuthProvider` handles this by setting `user = null` and `loading = false`, which should trigger a redirect to `/login` in your route guards.

### Messages vs. `toast`

- `messages` (`lib/messages.ts`) — static Portuguese strings shown to the user
- `toast` from `sonner` — the notification component

Always show API error messages via `toast.error(err.message)` and success messages via `toast.success(messages.success.created)` (or similar).

---

## Changelog

### 2026-03-18 — Backend fixes applied after frontend code review

The following issues reported by the frontend team were fixed on the backend. Changes that require frontend action are marked **⚠️ Action required**.

| # | Area | What changed | Frontend action |
|---|------|-------------|-----------------|
| 1 | Attendance | `GET /attendance` now returns `data: Attendance[]` (was `data: { attendances, total }` — crashed iteration) | None — existing code will now work |
| 2 | Attendance | `GET /attendance/child/:id` no longer throws `ReferenceError` | None |
| 3 | Auth | `POST /auth/forgot-password` now actually generates a reset token | None — call was already there |
| 4 | Users | **New endpoint:** `GET /api/v1/users?role=responsavel&search=...` | **⚠️ Add `usersApi` to `lib/api-services.ts`** — see Section 7 |
| 5 | Payments | `GET /payments/invoice/:invoiceId` was already present — no change | None |
| 6 | Monthly reports | **New endpoints:** `PATCH /monthly-reports/:id/validate` and `/reject` | **⚠️ Add `.validate()` and `.reject()` to `monthlyReportsApi`** — see Section 7 |
| 7 | Invoices | `GET /invoices` enforces ownership for `responsavel` — `parent_id` param is now ignored and forced to the caller's ID | None — improves security; list calls still work the same way |
| 8 | Daily reports | `GET /daily-reports` now role-scoped: `responsavel` only sees their children's reports | None — results are now correctly filtered |
| 9 | Messages | `GET /messages/:id`, `PATCH /:id/read`, `DELETE /:id` return `403` if the caller is not sender/recipient | Handle `403` on message detail/delete — show "Acesso negado" |
| 10 | Messages | Inbox `$or` fix: direct messages sent to staff/admin by `recipient_id` now appear in their inbox | None — inbox will now show previously missing messages |
| 11 | Auth | `PUT /auth/me` now accepts and saves `phone` (was silently stripped) | None — the call already sent `phone` |
| 12 | Messages | `message_type` enum **changed** — was `'announcement'\|'direct'\|'reminder'\|'other'`, now `'info'\|'reminder'\|'alert'\|'general'` | **⚠️ Any hardcoded `'announcement'`, `'direct'`, or `'other'` values must be changed** |
| 13 | Monthly reports | `GET /monthly-reports` without filters no longer returns `[]` — returns role-scoped list | None — admin/staff list views will now load data |
| 14 | Auth | `POST /auth/register` now returns `refreshToken` (was missing — users lost session after 7 days) | None — `AuthProvider` already handles `refreshToken` from the register response |
| 15 | Attendance | Day-level date queries now work correctly (was doing exact datetime match) | None — date filters will now return correct results |
| 16 | Invoices | Invoice number generation is now atomic (race condition under concurrent requests fixed) | None |
| 17 | Auth | Access tokens and refresh tokens now use separate secrets (`JWT_REFRESH_SECRET`) | None on the frontend — backend `.env` must be updated |

### Items requiring frontend code changes (summary)

1. **Add `usersApi`** to `lib/api-services.ts` — needed for parent selection in enrollment and recipient picker in messaging (Section 7).
2. **Add `monthlyReportsApi.validate()` and `.reject()`** to `lib/api-services.ts` — needed for admin monthly reports page (Section 7).
3. **Fix `message_type` values** — search the codebase for `'announcement'`, `'direct'`, `'other'` in message-related code and replace with `'info'`, `'general'`, or `'alert'` as appropriate.
4. **Handle `403` on message endpoints** — `DELETE /messages/:id` and `GET /messages/:id` now return `403` if you're not the owner. Make sure the UI handles this gracefully (show a toast, don't crash).
