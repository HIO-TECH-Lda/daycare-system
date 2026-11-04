# Web App Overview — Sonho de Criança
**Date:** 2026-03-18

## Tech Stack
- **Framework**: Next.js 13 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS + shadcn/ui (Radix UI primitives) + lucide-react icons
- **State / Data fetching**: TanStack React Query v5
- **Forms**: react-hook-form + zod
- **Notifications**: Sonner
- **Backend**: External REST API on port 3002 (`/api/v1`), MongoDB + JWT auth
- **Currency**: MZM (Mozambican Metical)
- **Language**: Portuguese (pt-BR)

---

## Architecture

```
web-app/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout — auth guard + sidebar
│   ├── page.tsx          # Landing/root redirect
│   ├── login/            # Login page
│   ├── admin/            # Admin role pages
│   ├── staff/            # Staff role pages
│   └── responsavel/      # Parent/guardian role pages
├── components/
│   ├── layout/           # Sidebar, Navbar, AppLayout
│   └── ui/               # shadcn/ui components (full suite)
└── lib/
    ├── api-client.ts     # Fetch wrapper, JWT token mgmt, auto-refresh
    ├── api-services.ts   # All API endpoint functions
    ├── auth-context.tsx  # Auth React context (login/logout/refresh)
    ├── types.ts          # All domain TypeScript types
    ├── messages.ts       # Portuguese UI strings
    ├── query-keys.ts     # TanStack Query key factory
    └── mock-data.ts      # Mock data (dev/fallback)
```

---

## User Roles & Their Modules

| Role | Pages |
|---|---|
| **Administrador** | Dashboard, Alunos, Staff, Turmas, Relatórios Mensais, Pagamentos, Despesas, Eventos, Matrículas |
| **Staff** | Dashboard, Presença, Relatórios Mensais, Mensagens, Turma detail |
| **Responsável** | Dashboard, Mensagens, Relatórios Mensais, Faturamento, Eventos, Perfil, Relatório por filho |

---

## Key Domain Models (`lib/types.ts`)

- `User` — roles: `responsavel`, `staff`, `administrador`
- `Child` — rich profile: allergies, medications, sleep schedule, behavior notes, enrollment data
- `Class` — age range in months, capacity
- `Guardian` / `AuthorizedPickupPerson`
- `Attendance` — present/absent/late/excused + check-in/check-out times
- `DailyReport` — meals, activities, nap time, mood, health notes
- `MonthlyReport` — physical/cognitive/social/emotional development; draft → submitted → validated/rejected
- `CalendarEvent` — activities, holidays, meetings
- `Invoice` + `Payment` — multi-item invoices, various payment methods
- `Expense` + `ExpenseCategory`
- `Message` — inbox/sent, typed: info/reminder/alert/general

---

## API Layer (`lib/api-client.ts`)

- Centralized `request()` helper with automatic JWT attachment
- **Token refresh**: On a 401 response, automatically refreshes the access token and retries the request — with deduplication to avoid concurrent refresh loops
- Tokens stored in `localStorage` (`daycare_access_token`, `daycare_refresh_token`)
- Full CRUD service functions for every domain entity in `api-services.ts`

---

## Known Issues / TODOs

1. **Admin > Alunos** — the "select existing parent" dropdown is a stub (`TODO: Fetch parents from API/users with role 'responsavel'`); also references `mockClasses` instead of the live query data.
2. **Admin Dashboard** — the billing/revenue card section is commented out.
3. `lib/mock-data.ts` exists, suggesting some pages may still fall back to mock data in certain flows.
