# Implementation Plan — Finish & Rebuild UI
**Date:** 2026-11-02 (rev. 3: phone-or-email login, Next.js 16, corrections from the review of Phases 0–1a)
**Project:** Centro Infantil Sonho de Criança — Daycare Management System
**Goal:** Take the system from its current state (working API, half-integrated prototype UI) to a production deployment with a rebuilt, UX-improved frontend that can be installed as a PWA, and with WhatsApp as a first-class notification channel.

---

## 0. Confirmed decisions

| # | Topic | Decision | Consequence for the plan |
|---|---|---|---|
| 1 | Accounts | **Admin-created only, with an invite link** | Remove public register. Add an invite-token flow and an "accept invite" page. Send invites by WhatsApp and email. |
| 1b | Login | **Phone OR email** (at least one per user) | Families who only use WhatsApp can have an account. Invites and password resets go by WhatsApp or email, whichever the person has (WhatsApp only with consent). |
| 2 | Enrolment | **Submitted forms go into an approval queue** | New `Enrollment` model + public enrolment form. On approval: create the child, plus the parent account with an invite if it doesn't exist. |
| 3 | Design | **Use the provided logo as the brand; improve UX** | Palette and typography derived from the logo (§2). UX audit + wireframes before coding screens. |
| 4 | Framework | **Next.js 16** (the current stable major; changed from 15 after review) | Upgrade as part of the rebuild. See Phase 2 for what 16 changes (Turbopack builds, no `next lint`). |
| 5 | Hosting | **API → Vercel · Web → Netlify · DB → MongoDB Atlas** | Two platforms, cross-origin setup (§3 Phase 5). |
| 6 | Language | **Mozambican Portuguese** | Glossary + `pt-MZ` formatting (§2). |
| 7 | Online payments | **Out of scope for v1** | Admins record payments manually. |
| 8 | Devices | **PWA** (tablets + laptops) | PWA moves into v1 scope: installable, app-shell caching, offline-tolerant attendance & daily reports. Responsive from phone to laptop. |
| 9 | WhatsApp | **Must-have** | Its own workstream (Phase W), started on day 1 because Meta verification and template approval take time. |

**Confirmed:** the enrolment form is **public** (`/matricula`, no account needed). Prospective families fill it in, and an admin can also fill it in on a family's behalf. It is protected by rate limiting and a honeypot field.

---

## Progress (2026-11-02)

| Phase | State |
|---|---|
| 0 — Foundations | ✅ Done ([PR #1](https://github.com/HIO-TECH-Lda/daycare-system/pull/1), merged into `dev`): CI, in-memory MongoDB tests, ESLint, README. |
| 1a — Accounts & security | ✅ Done ([PR #2](https://github.com/HIO-TECH-Lda/daycare-system/pull/2), merged): invite-only accounts, phone-or-email login, consent-aware WhatsApp, session revocation, audit log fix, CORS, shared rate limits. |
| 1b — Access scoping | ✅ Done ([PR #4](https://github.com/HIO-TECH-Lda/daycare-system/pull/4), merged): every child record, list and finance endpoint scoped by role; staff writes limited to their classes; children's photos private and served through signed API links. |
| 1c — Enrolment | ✅ Done ([PR #5](https://github.com/HIO-TECH-Lda/daycare-system/pull/5), merged): public enrolment form API, admin review queue, approval in one transaction. |
| 1d — Missing features | ✅ Done ([PR #7](https://github.com/HIO-TECH-Lda/daycare-system/pull/7), merged): message recipients and sending rules, reports, overdue-invoice job, offline sync. |
| 1e — Serverless & platform | 🔍 In review: serverless DB connection, modern `vercel.json` (Cape Town, cron, templates), upload limits, working production build, Mongoose 8. 146 API tests. **Phase 1 (backend) is complete once merged.** |
| W, 2–6 | Not started. |

Web app type errors: 104 → 88 (the shared data layer is clean; the rest are in pages the rebuild replaces).

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

Found in the review of Phases 0–1a (all fixed in Phase 1a unless noted):
- **The audit log recorded nothing**: its exclusion list contained `/api/v1`, which every route starts with. Fixing that alone would have stored change-password bodies (current and new password) in plain text, and every write was logged twice.
- **Password change/reset didn't end other sessions** (tokens lasted up to 30 days).
- **A refresh token worked as an access token** when `JWT_REFRESH_SECRET` was unset.
- **Expired tokens got 403 instead of 401**, so the web app never refreshed them and sessions broke after 7 days.
- **Login returned raw database errors** during an outage (introduced in Phase 1a, then fixed).
- **WhatsApp messages ignored consent** (invites, and all existing notifications).
- Children's photos are **public Cloudinary URLs** (open: Phase 1b).

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
- [ ] Set `WHATSAPP_API_VERSION` to the current Graph API version (the default `v21.0` dates from October 2024; Meta supports each version for about two years).
- [ ] Put links (invite, password reset, report) in a **URL button with a dynamic suffix** rather than in the body text, which Meta handles better. `sendTemplate` needs to support button parameters (`sub_type: 'url'`, `index`) for this.
- [x] Normalise phone numbers to E.164 (`+258…`) on input and validate them in Joi. *(Phase 1a)*
- [x] **Consent:** `whatsappOptIn` + timestamp per user, captured by the admin (e.g. from the enrolment form), on the invite-acceptance page and on the profile. Every WhatsApp send goes through `whatsAppNumberFor(user)`. *(Phase 1a; the enrolment form will pass it on in 1c)*
- [ ] **Notification preferences** per user (WhatsApp / email / both) for each category (attendance, reports, billing, messages).
- [ ] **Delivery tracking:**
  - A `NotificationLog` collection records channel, template, recipient, status, error and Meta message ID.
  - A webhook `POST /webhooks/whatsapp` (verify token + signature check) updates the status: sent → delivered → read → failed.
- [ ] Retry failed sends with backoff (cap of 3), and fall back to email when WhatsApp fails.
- [ ] Admin screen showing a notification log, filterable by failed sends, with a resend action.
- [ ] Cost awareness: since July 2025 Meta charges **per delivered template message** (not per conversation); utility templates sent inside an open customer-service window are free. Check the rate card for Mozambique. Check-in/check-out notifications are the highest volume, so families can turn them off.

### Phase 0 — Foundations ✅
- [x] Branching:
  - `main` = production.
  - `dev` = staging.
  - Feature branches merge into `dev`.
- [x] GitHub Actions CI on every PR:
  - **api:** `tsc`, `eslint`, `jest` (with `mongodb-memory-server`).
  - **web-app:** `tsc`, `next lint`, `next build`.
- [x] Root `README.md`, and `web-app/.env.example`.
- [x] Fix the test setup so it runs without a local Mongo.
- Note: GitHub branch protection isn't available for this private repository on the current GitHub plan, so a failing CI run can't block a merge. Either upgrade to GitHub Team, or keep the rule "never merge on red".

### Phase 1 — Backend completion & hardening
Split into reviewable parts: **1a** accounts & security (PR #2) · **1b** access scoping and media privacy · **1c** enrolment · **1d** missing features · **1e** serverless and platform.

**1a — Accounts & invites** *(PR #2)*
- [x] Remove public `POST /auth/register`. The seed script and `scripts/create-admin.ts` create users directly.
- [x] `POST /users` (admin): creates the user with status `invited` and no password, generates an invite token (hashed, 7-day expiry), and sends it by WhatsApp and/or email. Returns the link and which channels it went out on.
- [x] `POST /users/:id/resend-invite`, `PUT /users/:id`, `PATCH /users/:id/status` (activate/deactivate), `GET /users/:id`, `POST /users/:id/password-reset-link`.
- [x] `POST /auth/accept-invite` (token + password + WhatsApp consent): sets the password and marks the user `active`.
- [x] Login by **email or phone**; inactive users get a clear message.
- [x] Forgot password by email or phone; never-activated users get their invite again.
- [x] Session revocation (`tokenVersion`): changing or resetting the password ends every session. Typed access/refresh tokens; `JWT_REFRESH_SECRET` required in production.
- [x] Audit log works, records each change once, and never stores passwords or tokens.
- [x] Notifications run after the response (`waitUntil` on Vercel), with timeouts, and respect WhatsApp consent.

**1c — Enrolment approval queue** *(PR for 1c)*
- [x] `Enrollment` model:
  - Child fields (reuse the `Child` registration fields), guardian/parent details, pickup persons, consents (image use, WhatsApp).
  - `status`: `submitted → under_review → approved | rejected`, plus `reviewed_by`, `reviewed_at`, `rejection_reason`, `requested_class_id`.
- [x] `POST /enrollments` (public; rate-limited; honeypot) and `GET/PUT /enrollments` (admin).
- [x] `POST /enrollments/:id/approve` (admin, with an assigned class). In one transaction it:
  1. creates or links the parent user (invite sent if new)
  2. creates the `Child`, guardians and pickup persons
  3. marks the enrolment approved
  4. sends `sonho_enrollment_approved`
- [x] `POST /enrollments/:id/reject` with a reason.
- [x] A family enrolling a second child is linked to its existing account (matched by phone or email). Class capacity is checked, and the admin can override it.
- Note: transactions need a replica set. Atlas is one, and the tests run one; on a plain local `mongod`, approval runs without a transaction (with a warning).

**Security**
- [x] CORS allowlist from `CORS_ORIGINS`: the Netlify production domain, the custom domain, and the deploy-preview pattern (`https://deploy-preview-*--<site>.netlify.app`) for staging only. *(1a)*
- [x] Remove `/test` in production. Stricter rate limits on auth and invite endpoints, stored in MongoDB in production so they hold across serverless instances. *(1a; the enrolment endpoint gets its limit in 1c)*
- [x] **1b:** Shared access service (`AccessService` + route guards) applied to every endpoint that reads child data, with a per-role test matrix. Includes `GET /users` for staff, finance (staff no longer see invoices, payments or expenses), class-specific calendar events, and staff writes. Fixed: a staff member with no class assignment saw **every** child.
- [x] **1b:** Children's photos, pickup-person photos and receipts are **private Cloudinary assets served through the API** (decision 2026-11-02). Responses carry signed API links (`/api/v1/media/...`, valid 1–2 h) instead of storage URLs; the API fetches the file from Cloudinary with a signature. Requires `API_PUBLIC_URL` in production. If photo traffic through Vercel ever becomes a cost or speed problem, Cloudinary's token-based authentication (paid add-on) can replace the proxy.
- [ ] Photos uploaded before this change are still public on Cloudinary (the API redirects to them). Before go-live, re-upload any real photos, or start production with an empty media library.
- [ ] `image_usage_authorized`: photos are currently only shown to the child's own family and staff, so no other family sees them. Enforce the flag when a feature shares photos more widely (group photos, a gallery, marketing).

**1d — Missing features**
- [x] `GET /messages/recipients` (who the current user may message), and `POST /messages` limited to the same people; group messages admin-only.
- [x] Reports (finance, payments, expenses admin only; attendance also for staff, own classes):
  - `GET /reports/finance/summary`
  - `GET /reports/expenses`
  - `GET /reports/payments`
  - `GET /reports/attendance`
- [x] Overdue job: `GET|POST /jobs/mark-overdue`, protected by `CRON_SECRET`. The Vercel Cron schedule (daily, 04:00 UTC) goes into `vercel.json` in 1e.
- [ ] Optional: `POST /invoices/generate-monthly` (not done; add when the billing screens are built if the centre wants it).
- [x] Endpoints that support offline sync for the PWA:
  - Attendance and daily-report writes accept a client-generated `client_id` (idempotency key), so a retried request doesn't create duplicates.
  - One record per child per calendar day (Maputo); a second device's write merges into it (newest wins) and the response reports the conflict with the previous values. Updates send `base_updated_at` and get the same conflict report.

**1e — Serverless and platform (Vercel)**
- [x] Cache the database connection promise across invocations, and throw instead of calling `process.exit` (the Vercel handler answers 503 and the next request retries).
- [x] Notifications after the response with `waitUntil` from `@vercel/functions`, with timeouts. *(1a)* Results go to `NotificationLog` in Phase W.
- [x] Uploads capped at 4 MB (Vercel's body limit is ~4.5 MB) with a clear 413; wrong file types get 400. The web app compresses photos before upload (Phase 2). Signed direct-to-Cloudinary uploads only if larger files are ever needed.
- [x] `vercel.json` moved off the legacy `builds`/`routes` format: region `cpt1` (Cape Town), `maxDuration` 30 s, email templates included, daily cron for `mark-overdue` at 04:00 UTC (06:00 Maputo). **Verify on the first staging deploy** (not testable locally).
- [x] Upgraded Mongoose 7 → 8 (MongoDB driver 6, supports MongoDB 8.0 on Atlas). Removed three duplicate index definitions it warned about.
- [x] `npm run build` produces `dist/app.js` (what `npm start` runs; it used to produce `dist/src/app.js`, so `npm start` was broken) with the email templates, without the tests. Verified: the built server starts and answers.

**Quality**
- [ ] Integration tests: ~~auth, invites~~ *(1a)*, the enrolment approval transaction, per-role access, and the main CRUD flows.
- [x] Update `docs/API.md`. Rename the package to `sonho-de-crianca-api`.

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
- [ ] Next.js 16 (or the current stable major at the start of Phase 2), React 19, TypeScript strict. Remove `ignoreBuildErrors` and `ignoreDuringBuilds`.
  - Next.js 16 builds with Turbopack by default: check Serwist's support, or build with `next build --webpack`.
  - `next lint` is gone: lint with the ESLint CLI, and update the CI step.
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
  - Login and "forgot password" take **one field: email or phone number** (sent as `identifier`). The accept-invite page shows the WhatsApp consent checkbox, pre-ticked from the admin's record.
  - After `change-password`, store the new tokens from the response (the old ones stop working).
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
- [x] Fix the TypeScript errors in the shared data layer (`lib/`). *(Phase 0: 104 → 88; the remaining 88 are in pages the rebuild replaces.)*
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
| Encarregados & Staff | Create user (email and/or phone, WhatsApp consent) → invite; show the link to share by hand when `delivery` is all false; resend invite; password-reset link; deactivate; class assignment for staff |
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
| API | **Vercel** (project root `api/`) | `vercel.json` modernised in 1e. Vercel Cron for `mark-overdue`. **Commercial use requires the Pro plan** (Hobby is non-commercial). **Region: Cape Town (`cpt1`)**, close to users in Mozambique and to the database. |
| Web app | **Netlify** (base dir `web-app/`) | Next.js 15 runs through Netlify's Next.js runtime (OpenNext adapter, detected automatically). Branch deploys: `main` → prod, `dev` → staging; deploy previews per PR. Service worker served with `Cache-Control: no-cache` (set in `netlify.toml`). |
| Database | **MongoDB Atlas** | Separate staging/prod clusters or DBs. In South Africa if the chosen tier offers it, otherwise the nearest region (every API request reads the user, so latency to the API matters). **Backups need a paid tier** (the free tier has none). Network access configured. |
| Files | Cloudinary | Per-environment folders. |
| Email | SMTP with a domain sender | SPF/DKIM set. |
| WhatsApp | Meta Cloud API | Webhook URL → `https://api.<domain>/api/v1/webhooks/whatsapp`. |
| Domains | e.g. `app.<domain>` → Netlify, `api.<domain>` → Vercel | Using one parent domain keeps CORS and links simple. |

**Steps**
1. Add `netlify.toml`: build command, base dir, Node version, headers for `sw.js` and the manifest, and **security headers** (Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Login tokens live in `localStorage`, so an XSS bug would mean account takeover; the CSP is the main defence.
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

## 4. Running costs (to quote to the client)
Prices change; check each at setup time.

| Item | Why it's needed | Notes |
|---|---|---|
| Vercel Pro | API hosting (Hobby doesn't allow commercial use) | Per team member per month |
| Netlify | Web app hosting | Free tier may be enough at first; Pro for team features |
| MongoDB Atlas, paid tier | Database with backups | The free tier has no backups |
| WhatsApp (Meta) | Notifications | Per delivered template message; rate depends on the country |
| Cloudinary | Photos and receipts | Free tier to start; grows with photos per day |
| SMTP email service | Invites, resets, reports | e.g. Google Workspace, Brevo or Amazon SES |
| Domain | `app.` and `api.` addresses | Yearly |
| GitHub Team (optional) | Branch protection for `main`/`dev` | Per user per month |

## 5. Out of scope for v1 (candidates for v2)
- Online payments (M-Pesa / e-Mola).
- Web push notifications (WhatsApp covers alerts).
- Payroll module (from `gerador.py`).
- Offline support for parent and admin screens.
- Multiple languages.

## 6. Definition of done (v1)
- Every page uses live API data; no mock data remains.
- CI is green, with no suppressed type or lint errors. API tests cover auth, invites, enrolment approval and per-role access.
- No public account creation; every read is scoped by role. Users log in with email or phone; changing or resetting a password ends every other session.
- The audit log records every change without storing passwords or tokens.
- The new branded UI is on every screen and works on phone, tablet and laptop, and the app installs as a PWA.
- Staff attendance and daily reports keep working offline and sync without creating duplicates.
- All WhatsApp templates are approved and delivering, with consent recorded, delivery tracked, and email fallback in place.
- Staging and production are live on Vercel (API), Netlify (web) and Atlas (DB), with backups and monitoring on; the first admin was created by script.
