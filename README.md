# Centro Infantil Sonho de Criança — Daycare Management System

A management system for a daycare centre in Mozambique. It has three portals:

- **Administração:** students, enrolments, classes, staff, billing, expenses, events, reports.
- **Staff (educadores):** attendance, daily reports, monthly reports, messages.
- **Encarregados de Educação (parents):** their children's day, reports, invoices, events, messages.

## Repository layout

| Folder | What | Stack |
|---|---|---|
| [`api/`](api/) | REST API (`/api/v1`, port 3002) | Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, Cloudinary, SMTP, WhatsApp Cloud API |
| [`web-app/`](web-app/) | Web app for all three roles (port 3000) | Next.js, React, Tailwind CSS, shadcn/ui, TanStack Query |
| [`reports/`](reports/) | Reviews and the implementation plan | — |

The current roadmap is in [reports/2026-11-02-implementation-plan.md](reports/2026-11-02-implementation-plan.md).

## Local development

Requirements: Node.js 22 and a MongoDB database (local, or a free Atlas cluster).

```bash
# API
cd api
cp env.example .env        # set MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed               # optional: demo data (all demo users use password test1234)
npm run dev                # http://localhost:3002/health

# Web app (in another terminal)
cd web-app
cp .env.example .env.local
npm install
npm run dev                # http://localhost:3000
```

## Scripts

| Where | Command | Does |
|---|---|---|
| api | `npm run dev` | API with auto-reload |
| api | `npm test` | Jest tests against an in-memory MongoDB (no local database needed) |
| api | `npm run lint` / `npx tsc --noEmit` | Lint / typecheck |
| api | `npm run seed` / `npm run seed:fresh` | Load demo data |
| api | `npm run create-admin -- --first … --last … --email …` | Create the first administrator (prints an invite link) |
| api | `npm run build` / `npm start` | Production build (`dist/`, with email templates) / run it |
| web-app | `npm run dev` / `npm run build` | Dev server / production build |
| web-app | `npm run lint` / `npm run typecheck` | Lint / typecheck |

## Branches & CI

- `main`: production.
- `dev`: staging.
- Feature branches open pull requests into `dev`.

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request and on every push to `main` or `dev`:

| App | Checks |
|---|---|
| API | typecheck, lint, tests |
| Web app | lint, typecheck (reports but doesn't fail the build until the UI rebuild), build |

## Deployment (planned)

| Piece | Platform |
|---|---|
| API | Vercel (`api/vercel.json`: Cape Town region, 30 s functions, email templates bundled, daily overdue-invoice cron) |
| Web app | Netlify |
| Database | MongoDB Atlas |
| Files | Cloudinary |
| Notifications | SMTP email + WhatsApp (Meta Cloud API) |
