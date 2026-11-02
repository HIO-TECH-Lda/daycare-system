# Implementation Plan — Finish & Rebuild UI
**Date:** 2026-11-02 (rev. 2: decisions confirmed)
**Project:** Centro Infantil Sonho de Criança — Daycare Management System
**Goal:** Take the system from its current state (working API, half-integrated prototype UI) to a production deployment with a rebuilt, UX-improved frontend that can be installed as a PWA, and with WhatsApp as a first-class notification channel.

---

## 0. Confirmed decisions

| # | Topic | Decision | Consequence for the plan |
|---|---|---|---|
| 1 | Accounts | **Admin-created only, with an invite link** | Remove public register. Add an invite-token flow and an "accept invite" page. Send invites by WhatsApp and email. |
| 2 | Enrolment | **Submitted forms go into an approval queue** | New `Enrollment` model + public enrolment form. On approval: create the child, plus the parent account with an invite if it doesn't exist. |
| 3 | Design | **Use the provided logo as the brand; improve UX** | Palette and typography derived from the logo (§2). UX audit + wireframes before coding screens. |
| 4 | Framework | **Next.js 15** | Upgrade as part of the rebuild. |
| 5 | Hosting | **API → Vercel · Web → Netlify · DB → MongoDB Atlas** | Two platforms, cross-origin setup (§3 Phase 5). |
| 6 | Language | **Mozambican Portuguese** | Glossary + `pt-MZ` formatting (§2). |
| 7 | Online payments | **Out of scope for v1** | Admins record payments manually. |
| 8 | Devices | **PWA** (tablets + laptops) | PWA moves into v1 scope: installable, app-shell caching, offline-tolerant attendance & daily reports. Responsive from phone to laptop. |
| 9 | WhatsApp | **Must-have** | Its own workstream (Phase W), started on day 1 because Meta verification and template approval take time. |

**Confirmed:** the enrolment form is **public** (`/matricula`, no account needed). Prospective families fill it in, and an admin can also fill it in on a family's behalf. It is protected by rate limiting and a honeypot field.

---

## 1. Starting point (verified 2026-11-02)

| Area | State |
|---|---|
| API (`api/`) | Compiles cleanly. 18 resources, JWT auth, Cloudinary uploads, audit log, email + WhatsApp notification services already written. |
| API tests | 1 test, fails without a local MongoDB. |
| Web app (`web-app/`) | Next.js 13. 104 hidden TypeScript errors. 7 pages on mock data, 5 TODOs, no per-role route guards. |
| Deployment | Nothing deployed, no CI. |

Backend gaps:
- **Privilege escalation:** public register accepts the `administrador` role.
- **No admin user creation.**
- **Read scoping to audit:** attendance, report-photos, pickup-persons, payments, monthly-reports, calendar-events.
- **Missing endpoints:** message recipients list, finance/report aggregates, enrolment submission.
- **Open access:** CORS accepts any origin; the `/test` route is public.
- **Serverless hazards:** notifications sent without awaiting, `process.exit` in `connectDB`, no overdue-invoice job.

---

## 2. Brand, UX & language

### Brand tokens (from the logo)
Colours were sampled from the logo, weighted by area. "Text shade" is the darkest variant needed for 4.5:1 contrast (WCAG AA) on white, for text and for buttons with white labels.

| Token | Use | Logo colour | Contrast on white | Text shade (AA) |
|---|---|---|---|---|
| `primary` (leaf green) | Main actions, active nav, success | `#8BB74D` | 2.3 | `#608034` |
| `secondary` (teal) | Headers, links, secondary actions | `#0EA49B` | 3.1 | `#0B837C` |
| `earth` (tree brown) | Headings, body accents, dark surfaces | `#5F3712` | 10.3 | — |
| `sun` (orange) | Highlights, warnings, "pending" | `#EC9439` | 2.4 | `#B06211` |
| `berry` (red) | Errors, overdue, allergy alerts | `#DD1E25` | 4.9 | — |
| `sky` (blue) | Info, messages | `#035DCE` | 6.1 | — |
| `grape` (purple) | Events / calendar category | `#5E2E87` | 9.5 | — |
| Neutrals | Backgrounds, borders | Warm off-white `#FBFAF7`, warm greys | | |

- Each token gets a full 50–900 shade scale. The logo colour sits near 400–500, and the text shade sits at 700.
- The brand colours are used at full strength only for fills, illustrations and large display text.
- **Typography:** a rounded, friendly typeface for headings that echoes the logo lettering (e.g. **Nunito** or **Baloo 2**), and **Inter** for body and data tables.
- **Logo assets** in `web-app/public/brand/`:
  - `logo.svg`: the full logo (tree + wordmark), transparent background.
  - `logo-mark.svg`: the tree and symbols only, for the sidebar and login page.
  - `source/`: the original PNG and the SVG as received.
- **Limits of the supplied SVG:**
  - It was traced automatically from the PNG (VTracer, ~1,500 paths, ~600 KB).
  - It works only on **white or very light backgrounds**. On coloured or dark backgrounds the white edges around the shapes show up as halos.
  - It is heavy, and it gets blurry at small sizes.
- **Handling for v1:**
  - Show the logo only on light surfaces.
  - Generate the favicon and the PWA icons (192/512/maskable) as PNGs from the mark on a white or cream tile.
  - Load the SVG lazily wherever it appears.
- **Ask the client for the designer's original file** (AI/EPS/PDF, or a clean SVG). If there isn't one, add a task to redraw the mark and wordmark as clean vectors (~1 d with a designer). That redraw would add one-colour and white-on-dark versions.
- **Illustration language:** the letters, numbers, stars and notes from the logo are reused sparingly in empty states, the login page and the onboarding screens.

### UX improvements (principles applied to every screen)
1. **Task-first home per role.** Each dashboard answers "what do I need to do now?":
   - Staff: check-ins pending, reports to fill.
   - Admin: enrolments to approve, overdue invoices, monthly reports to validate.
   - Parent: today's summary for each child.
2. **Fewest taps for daily staff work.**
   - Attendance is one tap per child, with bulk "all present".
   - The daily report uses chips/toggles instead of free text where possible, saves drafts automatically, and lets staff move child-to-child with "next child".
3. **Consistent patterns:**
   - Every list uses the same table with search, filters and pagination; it becomes cards on mobile.
   - Every form uses the same layout, inline validation, and Mozambican formats.
   - Destructive actions always ask for confirmation.
4. **Clear states:** skeleton loaders; empty states that offer the next action; errors that say how to recover; optimistic updates on toggles.
5. **Safety information always visible.** Allergies, medications and authorised pickup persons appear wherever a child appears: attendance, check-out, daily report.
6. **Mobile + laptop.**
   - Phones and tablets get a bottom tab bar for staff and parents.
   - Laptops get a sidebar and wider data views (tables, side-by-side detail panels for admin).
7. **Accessibility:** keyboard navigation, visible focus, labelled inputs, 44 px touch targets, no colour-only status.
8. **UX audit first.** Before building, walk through the current prototype with the client and produce low-fi wireframes for the ~10 key flows. Building starts from the approved wireframes.

### Mozambican Portuguese
- **Formatting:**
  - Locale `pt-MZ`.
  - Dates `dd/MM/yyyy`; times in 24h.
  - Currency `1 500,00 MT` (MZN).
  - Phones `+258 8X XXX XXXX`, stored in E.164 format.
- **Glossary** (to validate with the client before writing copy). Examples:

| Current (pt-BR) | Proposed (pt-MZ) |
|---|---|
| Responsável | **Encarregado de Educação** |
| Mensalidade | Propina / Mensalidade |
| Fatura | Factura |
| Celular | Telemóvel |

  - Routes and code keep their current names (`responsavel`); only the labels change.
- **Copy:** all strings live in `lib/messages.ts`. No i18n framework is needed for v1, since only one language is supported.

---

## 3. Phases

```
Phase W  WhatsApp (Meta setup starts day 1, runs in background) ───────────────────────────┐
Phase 0  Foundations ─┐                                                                     │
Phase 1  Backend ─────┼─► Phase 3 Screens (admin → staff → parent) ─► Phase 4 QA ─► Phase 5 Deploy ─► Phase 6 Cleanup
Phase 2  UI foundation┘   (incl. UX audit + wireframes at start of Phase 2)
```

Rough sizing assumes one full-time developer and is meant for planning only:

| Phase | Effort |
|---|---|
| W | 3–4 d of dev work, plus Meta lead time |
| 0 | 1–2 d |
| 1 | 8–10 d |
| 2 | 7–9 d (includes UX audit and PWA) |
| 3 | 16–21 d |
| 4 | 4–5 d |
| 5 | 2–3 d |
| 6 | 1 d |

Total: roughly 9–11 weeks.

### Phase W — WhatsApp (must-have)
WhatsApp is the main channel for families in Mozambique, so it is treated as core rather than optional.

**Meta setup (client action, start immediately; lead time days to weeks)**
- [ ] Meta Business account → **business verification** (company documents).
- [ ] WhatsApp Business Account plus a **dedicated phone number**. It cannot also be in use on the WhatsApp app.
- [ ] Display name approval ("Sonho de Criança").
- [ ] A system user with a permanent token, and the Phone Number ID.
- [ ] Submit the **message templates in Portuguese** for approval. Names must match `api/env.example`. Utility category:

| Template | Purpose |
|---|---|
| `sonho_invite` (**new**) | Account invitation with link |
| `sonho_welcome` | Welcome |
| `sonho_invoice_new` | New invoice |
| `sonho_invoice_overdue` | Overdue invoice |
| `sonho_invoice_paid` | Invoice paid |
| `sonho_daily_report` | Daily report available |
| `sonho_monthly_report` | Monthly report validated |
| `sonho_new_message` | New message received |
| `sonho_attendance_checkin` | Child checked in |
| `sonho_attendance_checkout` | Child checked out |
| `sonho_password_reset` | Password reset |
| `sonho_enrollment_received` (**new**) | Enrolment form received |
| `sonho_enrollment_approved` (**new**) | Enrolment approved |

**Development**
- [ ] Review and test `whatsAppService.ts` against the Meta Cloud API, using the Meta test number while verification is pending.
- [ ] Normalise phone numbers to E.164 (`+258…`) on input and validate them in Joi.
- [ ] **Consent:** record a `whatsapp_opt_in` flag and timestamp per user, captured on the enrolment form and the invite-acceptance page. Only send to users who opted in.
- [ ] **Notification preferences** per user (WhatsApp / email / both) for each category (attendance, reports, billing, messages).
- [ ] **Delivery tracking:**
  - A `NotificationLog` collection records channel, template, recipient, status, error and Meta message ID.
  - A webhook `POST /webhooks/whatsapp` (verify token + signature check) updates the status: sent → delivered → read → failed.
- [ ] Retry failed sends with backoff (cap of 3), and fall back to email when WhatsApp fails.
- [ ] Admin screen showing a notification log, filterable by failed sends, with a resend action.
- [ ] Cost awareness: utility templates are billed per conversation. Batch where sensible; for example, check-in/check-out notifications can be turned off per family.

### Phase 0 — Foundations
- [ ] Branching:
  - `main` = production.
  - `dev` = staging.
  - Feature branches merge into `dev`.
- [ ] GitHub Actions CI on every PR:
  - **api:** `tsc`, `eslint`, `jest` (with `mongodb-memory-server`).
  - **web-app:** `tsc`, `next lint`, `next build`.
- [ ] Root `README.md`, and `web-app/.env.example`.
- [ ] Fix the test setup so it runs without a local Mongo.

### Phase 1 — Backend completion & hardening
**Accounts & invites**
- [ ] Remove public `POST /auth/register`. The seed script and `scripts/create-admin.ts` create users directly.
- [ ] `POST /users` (admin): creates the user with status `invited` and no password, generates an invite token (hashed, 7-day expiry), and sends it by WhatsApp and email.
- [ ] `POST /users/:id/resend-invite`, `PUT /users/:id`, `PATCH /users/:id/status` (activate/deactivate), `GET /users/:id`.
- [ ] `POST /auth/accept-invite` (token + password + WhatsApp consent): sets the password and marks the user `active`.
- [ ] Login rejects `invited` and `inactive` users with a clear message.

**Enrolment approval queue**
- [ ] `Enrollment` model:
  - Child fields (reuse the `Child` registration fields), guardian/parent details, pickup persons, consents (image use, WhatsApp).
  - `status`: `submitted → under_review → approved | rejected`, plus `reviewed_by`, `reviewed_at`, `rejection_reason`, `requested_class_id`.
- [ ] `POST /enrollments` (public; rate-limited; honeypot) and `GET/PUT /enrollments` (admin).
- [ ] `POST /enrollments/:id/approve` (admin, with an assigned class). In one transaction it:
  1. creates or links the parent user (invite sent if new)
  2. creates the `Child`, guardians and pickup persons
  3. marks the enrolment approved
  4. sends `sonho_enrollment_approved`
- [ ] `POST /enrollments/:id/reject` with a reason.

**Security**
- [ ] CORS allowlist from `CORS_ORIGINS`: the Netlify production domain, the custom domain, and the deploy-preview pattern (`https://deploy-preview-*--<site>.netlify.app`) for staging only.
- [ ] Remove `/test` in production. Stricter rate limits on auth, invite and enrolment endpoints.
- [ ] Shared `getAccessibleChildIds(user)` helper applied in every controller that reads child data, with tests for each role.

**Missing features**
- [ ] `GET /messages/recipients` (who the current user may message).
- [ ] Reports (all admin only):
  - `GET /reports/finance/summary`
  - `GET /reports/expenses`
  - `GET /reports/payments`
  - `GET /reports/attendance`
- [ ] Overdue job: `POST /jobs/mark-overdue`, protected by `CRON_SECRET` and scheduled daily by Vercel Cron.
- [ ] Optional: `POST /invoices/generate-monthly`.
- [ ] Endpoints that support offline sync for the PWA:
  - Attendance and daily-report writes accept a client-generated `client_id` (idempotency key), so a retried request doesn't create duplicates.
  - Writes include `updated_at`, so conflicts are detected: the last write wins, and the server returns the stored version.

**Serverless correctness (Vercel)**
- [ ] Cache the database connection promise across invocations, and throw instead of calling `process.exit`.
- [ ] Await notifications with a timeout, or use `waitUntil` from `@vercel/functions`. Every result goes to `NotificationLog`.
- [ ] Keep uploads under Vercel's ~4.5 MB body limit: compress on the client, and use signed direct-to-Cloudinary uploads for anything larger.

**Quality**
- [ ] Integration tests: auth, invites, the enrolment approval transaction, per-role access, and the main CRUD flows.
- [ ] Update `docs/API.md`. Rename the package to `sonho-de-crianca-api`.

### Phase 2 — UI foundation (rebuild)
**UX audit & wireframes (first 2 days)**
- [ ] Walk the current prototype with the client.
- [ ] Wireframe the key flows:
  - login / accept invite
  - public enrolment form
  - enrolment review
  - attendance
  - daily report
  - parent day view
  - invoice + payment
  - messages
  - monthly report review
  - staff/user management
- [ ] Get sign-off on the wireframes and the glossary.

**Stack**
- [ ] Next.js 15, React 19, TypeScript strict. Remove `ignoreBuildErrors` and `ignoreDuringBuilds`.
- [ ] Tailwind CSS 4 + shadcn/ui, themed with the brand tokens from §2. Delete unused components.
- [ ] Keep TanStack Query, react-hook-form + zod, sonner, lucide, recharts.

**Design system**
- [ ] Tokens, fonts, logo variants, favicon, PWA icons (192/512/maskable).
- [ ] Core components:
  - `PageHeader`
  - `DataTable` (cards on mobile)
  - `FormField`
  - `MoneyInput` / `formatMZN`
  - `PhoneInput` (+258)
  - `DatePicker` (pt-MZ)
  - `FileUpload` with compression
  - `StatusBadge`
  - `ConfirmDialog`
  - `StatCard`
  - `ChildCard` with safety badges
  - `EmptyState`
  - `OfflineBanner`

**App shell, auth & routing**
- [ ] Route groups:
  - `(public)`: `/login`, `/convite/[token]`, `/recuperar-senha`, `/redefinir-senha`, `/matricula`
  - `(app)`: `admin` / `staff` / `responsavel`, each with a role-guarded layout
- [ ] Navigation config per role. Sidebar on laptops; bottom tab bar on phones and tablets for staff and parents.

**PWA**
- [ ] Web app manifest (name, short name, icons, theme colour `primary`, `display: standalone`, start URL by role).
- [ ] Service worker via **Serwist** (`@serwist/next`):
  - precaches the app shell and static assets
  - runtime-caches GETs with stale-while-revalidate for read-mostly data (classes, children of my classes, today's reports)
- [ ] Offline writes (staff only, for v1):
  - Attendance and daily-report mutations go into an IndexedDB queue (TanStack Query persisted mutations), carrying an idempotency `client_id`.
  - The queue replays when the device is back online.
  - The UI shows pending-sync badges and the offline banner.
- [ ] Install prompt on tablets and phones ("Adicionar ao ecrã inicial").
- [ ] iOS meta tags for standalone mode.
- [ ] Web push notifications are **out of scope for v1**, because WhatsApp covers alerts.

**Data layer**
- [ ] Fix the 104 TypeScript errors (mostly one pattern: the filter types vs the client's query-param type).
- [ ] Align `lib/types.ts` with the API. Delete `lib/mock-data.ts`.
- [ ] Shared query/mutation hooks with standard toasts and error handling.

### Phase 3 — Screens (rebuild + real data)
A screen is done when it:
- matches the approved wireframe and uses the new design system
- uses live data only
- handles loading, empty and error states
- works on phone, tablet and laptop
- uses pt-MZ copy

**Public**
- Login, accept invite (set password + WhatsApp consent), password recovery.
- **Enrolment form** (`/matricula`): multi-step, saves progress in the browser, includes consents, ends with a confirmation screen.

**Admin**

| Screen | Notes |
|---|---|
| Dashboard | Action queue (enrolments to review, overdue invoices, reports to validate) + KPIs (occupancy, attendance today, revenue vs expenses) |
| Matrículas | Approval queue: review side-by-side, assign class, approve/reject |
| Alunos | List/filter, detail with tabs (profile, health, guardians, pickup persons, attendance, invoices) |
| Encarregados & Staff | Create user → invite; resend invite; deactivate; class assignment for staff |
| Turmas | CRUD, capacity bar, assigned staff |
| Facturação & Pagamentos | Invoices (multi-item), record payment, monthly generation, overview |
| Relatórios | Finance, payments, expenses, attendance — date ranges, charts, CSV export |
| Despesas | CRUD, receipt upload, categories |
| Eventos | Calendar + CRUD |
| Relatórios mensais | Validate / reject queue |
| Mensagens | Inbox + threads |
| Notificações | WhatsApp/email log, failed sends, resend |

**Staff**

| Screen | Notes |
|---|---|
| Hoje (dashboard) | My classes, check-ins pending, reports to fill |
| Presença | One-tap check-in/out, bulk present, pickup person verification with photo — **works offline** |
| Turma | Children with safety badges |
| Relatório diário | Chips/toggles, photos, autosave, "next child" — **works offline** |
| Relatórios mensais | Draft → submit, rejection feedback |
| Mensagens | Threads with families |

**Parent (Encarregado de Educação)**

| Screen | Notes |
|---|---|
| Hoje | Per child: check-in/out times, daily report summary, photos |
| Relatórios | Daily timeline + validated monthly reports |
| Facturação | Invoices + payment history |
| Eventos | Calendar |
| Mensagens | Threads with staff/admin |
| Perfil | Contacts, avatar, password, **notification preferences** (WhatsApp/email per category) |

### Phase 4 — QA
- [ ] Playwright end-to-end tests against the seeded staging stack:
  - Public: submit an enrolment.
  - Admin: approve it → the parent receives the invite.
  - Parent: accept the invite.
  - Staff: check in **while offline**, sync, fill in the daily report.
  - Parent: sees the report.
  - Admin: issues an invoice → records the payment.
- [ ] Role-access tests (URLs and API IDs belonging to other users).
- [ ] PWA checks: Lighthouse PWA/performance/accessibility; installs on Android tablet, iPad and laptop; offline queue survives an app restart.
- [ ] WhatsApp: every template sent to real test numbers; webhook statuses arrive; email fallback works.
- [ ] Responsive (360 px → 1440 px) and accessibility pass; client review of pt-MZ copy.

### Phase 5 — Deployment
| Piece | Platform | Notes |
|---|---|---|
| API | **Vercel** (project root `api/`) | Existing `vercel.json`. Vercel Cron for `mark-overdue`. **Commercial use requires the Pro plan** (Hobby is non-commercial). Pick a region close to the Atlas cluster. |
| Web app | **Netlify** (base dir `web-app/`) | Next.js 15 runs through Netlify's Next.js runtime (OpenNext adapter, detected automatically). Branch deploys: `main` → prod, `dev` → staging; deploy previews per PR. Service worker served with `Cache-Control: no-cache` (set in `netlify.toml`). |
| Database | **MongoDB Atlas** | Separate staging/prod clusters or DBs; same region as the Vercel functions; backups on; network access configured. |
| Files | Cloudinary | Per-environment folders. |
| Email | SMTP with a domain sender | SPF/DKIM set. |
| WhatsApp | Meta Cloud API | Webhook URL → `https://api.<domain>/api/v1/webhooks/whatsapp`. |
| Domains | e.g. `app.<domain>` → Netlify, `api.<domain>` → Vercel | Using one parent domain keeps CORS and links simple. |

**Steps**
1. Add `netlify.toml` (build command, base dir, Node version, headers for `sw.js` and the manifest).
2. Deploy **staging** (`dev` branch) on all three platforms; seed demo data; run Phase 4.
3. Set the environment variables:
   - **Vercel (API):** `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, `CRON_SECRET`, Cloudinary, SMTP, `WHATSAPP_*`, `WA_TEMPLATE_*`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
   - **Netlify (web):** `NEXT_PUBLIC_API_URL`.
4. Production: run `scripts/create-admin.ts`, load classes and staff, and send invites to staff first, then families.
5. Monitoring:
   - Vercel and Netlify logs.
   - Atlas alerts.
   - Uptime check on `/health`.
   - The notification-failure log, reviewed weekly.
   - Optional: Sentry on both apps.
6. Go-live checklist:
   - Secrets rotated.
   - Demo-account buttons removed from the login page.
   - Backups tested.
   - A privacy notice covering children's data, photos and WhatsApp consent.
   - WhatsApp templates approved and the business verified.

### Phase 6 — Cleanup
- [ ] Delete `web-app/supabase/`, `web-app/.bolt/`, `lib/mock-data.ts`, and the unused shadcn components.
- [ ] Move `gerador.py` and the payroll `.xlsx` to `tools/payroll/`. A payroll module is a candidate for v2.
- [ ] Update the READMEs and archive the March 2026 reports.

---

## 4. Out of scope for v1 (candidates for v2)
- Online payments (M-Pesa / e-Mola).
- Web push notifications (WhatsApp covers alerts).
- Payroll module (from `gerador.py`).
- Offline support for parent and admin screens.
- Multiple languages.

## 5. Definition of done (v1)
- Every page uses live API data; no mock data remains.
- CI is green, with no suppressed type or lint errors. API tests cover auth, invites, enrolment approval and per-role access.
- No public account creation; every read is scoped by role.
- The new branded UI is on every screen and works on phone, tablet and laptop, and the app installs as a PWA.
- Staff attendance and daily reports keep working offline and sync without creating duplicates.
- All WhatsApp templates are approved and delivering, with consent recorded, delivery tracked, and email fallback in place.
- Staging and production are live on Vercel (API), Netlify (web) and Atlas (DB), with backups and monitoring on; the first admin was created by script.
