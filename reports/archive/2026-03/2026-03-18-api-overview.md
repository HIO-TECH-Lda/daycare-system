# API Overview — Sonho de Criança
**Date:** 2026-03-18

## Tech Stack
- **Runtime**: Node.js + Express 4 + TypeScript
- **Database**: MongoDB via Mongoose 7
- **Auth**: JWT (`jsonwebtoken`) — access + refresh tokens
- **Validation**: Joi schemas on all mutating endpoints
- **Security**: `helmet`, `cors`, `express-rate-limit` (1000 req / 15 min)
- **File uploads**: Cloudinary (base64 or URL, used for avatars/photos)
- **Audit logging**: Custom middleware — logs all create/update/delete to MongoDB
- **Port**: 3002 (default)
- **Base path**: `/api/v1`

---

## Project Structure

```
api/src/
├── app.ts                  # Express app setup, all route registrations
├── types/index.ts          # Shared TS types (IUser, JWTPayload, ApiResponse, AuthenticatedRequest)
├── config/
│   └── database.ts         # Mongoose connect/disconnect
├── models/                 # 18 Mongoose models
├── controllers/            # Thin controllers (delegate to services, use catchAsync)
├── services/               # Business logic layer
├── routes/                 # Express routers (one per resource)
├── middleware/
│   ├── auth.ts             # JWT verify + role authorization
│   └── auditLog.ts         # Auto-log all write operations
└── utils/
    ├── ApiResponse.ts      # Standardized response shape helpers
    ├── validation.ts       # All Joi schemas
    ├── pagination.ts       # Extract page/limit from query
    ├── catchAsync.ts       # Async error wrapper
    ├── cloudinary.ts       # Upload/delete images
    ├── messages.ts         # English server messages
    └── envValidation.ts    # Validates required env vars at startup
scripts/
└── seed.ts                 # Full DB seed (all collections, test password: test1234)
```

---

## All API Resource Modules

| Route | Auth Required | Write Roles | Notes |
|---|---|---|---|
| `POST /auth/register` | No | — | Creates user with role |
| `POST /auth/login` | No | — | Returns access + refresh tokens |
| `POST /auth/refresh` | No | — | Returns new token pair |
| `GET/PUT /auth/me` | Yes | Self | Profile + avatar (Cloudinary) |
| `PUT /auth/change-password` | Yes | Self | |
| `POST /auth/forgot-password` | No | — | 24h reset token (hashed in DB) |
| `POST /auth/reset-password` | No | — | |
| `/classes` | Yes | Admin (write) | CRUD |
| `/children` | Yes | Admin (write) | Role-filtered reads: responsavel sees own, staff sees assigned classes, admin sees all |
| `/staff-assignments` | Yes | Admin | Links staff user → class |
| `/guardians` | Yes | Admin (write) | Primary/secondary guardians per child |
| `/pickup-persons` | Yes | Admin (write) | Authorized pickup contacts |
| `/daily-reports` | Yes | Staff+ (write) | Meals, activities, nap, mood, health per child/day |
| `/activities` | Yes | Staff+ (write) | Reusable activity library |
| `/report-photos` | Yes | Staff+ (write) | Photos attached to daily reports |
| `/attendance` | Yes | Staff+ (write) | present/absent/late/excused + check-in/out times |
| `/calendar-events` | Yes | Staff+ (write) | School calendar — holiday/meeting/activity/other |
| `/invoices` | Yes | Admin (write) | Multi-item invoices; `PATCH /:id/status` for quick status updates |
| `/payments` | Yes | Admin (write) | Payments linked to invoices |
| `/expense-categories` | Yes | Admin (write) | |
| `/expenses` | Yes | Admin (write) | Linked to categories |
| `/messages` | Yes | Any auth | Inbox/sent, mark-as-read; no role restriction on send |
| `/monthly-reports` | Yes | Staff+ (write) | Draft → submitted → validated/rejected workflow |

---

## Auth & Security Details

### Token Lifecycle
- **Access token**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Refresh token**: 30 days (`JWT_REFRESH_EXPIRES_IN`)
- Both signed with the same `JWT_SECRET` with different `expiresIn`
- Refresh endpoint verifies user still exists and is `active` before issuing new tokens

### Authorization Middleware Hierarchy
```
requireAdmin        → administrador only
requireStaff        → staff + administrador
requireResponsavel  → all three roles (any authenticated user)
optionalAuth        → attaches user if token present, doesn't fail without one
```

### Password Policy (enforced by Joi)
Minimum 8 characters; must contain at least one uppercase letter, one lowercase letter, one digit, and one special character (`@$!%*?&`).

---

## Audit Log System

Every successful `POST`, `PUT`, `PATCH`, `DELETE` request is automatically intercepted and logged to the `AuditLog` collection. Logging is non-blocking (via `setImmediate`). Each entry records:

- User identity (id, name, email, role)
- Action type (create / update / delete)
- Entity type, id, and name
- Field-level changes (extracted from request body)
- Request metadata: IP address, user-agent, URL, HTTP method, status code

---

## Seed Script (`npm run seed`)

Wipes all collections and creates a full realistic dataset:
- Admin, staff, and parent users (password: `test1234`)
- Classes, children with guardians and pickup persons
- Attendance records, daily reports, monthly reports
- Invoices, payments, expense categories, expenses
- Messages and calendar events

---

## Notable Design Patterns

- **Thin controllers**: Each controller method is a `catchAsync` wrapper that calls a `Service` method and returns `ApiResponse.success()` or `ApiResponse.paginated()`
- **Role-scoped reads**: The pattern from `ChildService.findAll/findById` (filter by role) is applied consistently across daily reports, attendance, messages, etc.
- **Centralized validation**: All Joi schemas live in `utils/validation.ts`
- **Centralized response shape**: `ApiResponse` utility ensures `{ success, message, data, pagination? }` consistency across all endpoints

---

## Known Gaps

- **No email sending**: `requestPasswordReset` generates and stores the reset token but does not send any email — the email transport integration is missing.
