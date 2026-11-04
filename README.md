# Centro Infantil Sonho de Criança — Daycare Management System

A management system for a daycare centre in Mozambique, in Mozambican Portuguese, with three portals:

- **Administração:** Painel, enrolments (public form → approval), children, classes, people and invites, billing (monthly propinas, "Já paguei" confirmations, payments), expenses, reports with CSV export, monthly reports, events, messages, and the notification log.
- **Educadores:** today's classes, attendance (check-in/out with pickup confirmation, emergency roll call), daily reports with photos, monthly reports, messages. **Works without internet** on the centre's tablets.
- **Encarregados de Educação:** their children's day, reports, invoices with "Já paguei", "Avisar ausência", events, messages, and their notification choices.

Notifications go by email and by WhatsApp, with the person's consent.

## Repository layout

| Folder | What | Stack |
|---|---|---|
| [`api/`](api/) | REST API (`/api/v1`, port 3002) | Node.js 22, Express, TypeScript, MongoDB (Mongoose), JWT, Cloudinary, SMTP, WhatsApp Cloud API |
| [`web-app/`](web-app/) | Web app for all three roles (port 3000), installable as a PWA | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, TanStack Query, Serwist |
| [`e2e/`](e2e/) | End-to-end tests | Playwright, axe |
| [`docs/`](docs/) | [Deployment runbook](docs/DEPLOYMENT.md) | |
| [`reports/`](reports/) | [Implementation plan](reports/2026-11-02-implementation-plan.md), [QA checklist](reports/2026-11-03-qa-checklist.md), [archive](reports/archive/2026-03/) | |
| [`tools/payroll/`](tools/payroll/) | Salary spreadsheet generator (outside the system) | Python |

## Local development

Requirements: Node.js 22 and a MongoDB database (local, or a free Atlas cluster).

```bash
# API
cd api
cp env.example .env        # set MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed               # demo data; every demo account uses the password Demo@2026
npm run dev                # http://localhost:3002/health

# Web app (in another terminal)
cd web-app
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

Demo accounts: `admin@sonhodecrianca.mz`, `maria@sonhodecrianca.mz` (educator), `ana.silva@demo.com` (parent), and the others in [api/docs/SEED-DATA.md](api/docs/SEED-DATA.md). Without SMTP or WhatsApp credentials, notifications are skipped and invites show their link to share by hand.

## Tests

| Where | Command | What |
|---|---|---|
| api | `npm test` | Jest + supertest against an in-memory MongoDB: rules, access, sync, notifications |
| e2e | `npm test` | Playwright against a throwaway stack (seeded in-memory MongoDB, the API, a production build of the web app): the full journey across the four roles with an offline check-in, role access, offline restart, accessibility and layout from 360 to 1440 px, security headers |

```bash
cd e2e
npm ci
npx playwright install chromium     # once
npm test                            # E2E_SKIP_BUILD=1 reuses the last build · E2E_CHANNEL=chrome uses the installed Chrome
```

## Scripts

| Where | Command | Does |
|---|---|---|
| api | `npm run dev` | API with auto-reload |
| api | `npm run lint` / `npx tsc --noEmit` | Lint / typecheck |
| api | `npm run seed` / `npm run seed:fresh` | Demo data (refuses production) |
| api | `npm run create-admin -- --first … --last … --email …` | First administrator (prints an invite link) |
| api | `npm run build` / `npm start` | Production build / run it |
| web-app | `npm run dev` / `npm run build` / `npm start` | Dev server / production build / serve it |
| web-app | `npm run lint` / `npm run typecheck` | Lint / typecheck |

## Branches and CI

- `main`: production. `dev`: staging. Feature branches open pull requests into `dev`.
- GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request and on every push to `main` or `dev`:

| Job | Checks |
|---|---|
| API | typecheck, lint, tests |
| Web app | lint, typecheck, build |
| End-to-end | the Playwright suite (report uploaded when it fails) |

## Deployment

| Piece | Platform |
|---|---|
| API | Vercel (`api/vercel.json`: Cape Town region, daily overdue-invoice cron) |
| Web app | Netlify (`netlify.toml`) |
| Database | MongoDB Atlas |
| Files | Cloudinary (private photos behind signed links) |
| Notifications | SMTP email + WhatsApp (Meta Cloud API) |

Step by step, with every environment variable and the go-live checklist: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Documentation

| | |
|---|---|
| [api/docs/API.md](api/docs/API.md) | Every API endpoint |
| [api/docs/NOTIFICATIONS.md](api/docs/NOTIFICATIONS.md) | Notification channels, log, fallback, webhook |
| [api/docs/WHATSAPP-TEMPLATES.md](api/docs/WHATSAPP-TEMPLATES.md) | WhatsApp templates and Meta setup (Portuguese, for the centre) |
| [web-app/README.md](web-app/README.md) | Web app structure, offline behaviour, conventions |
| [reports/2026-11-02-implementation-plan.md](reports/2026-11-02-implementation-plan.md) | Decisions, glossary, phases and their status |
