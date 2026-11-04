# Sonho de Criança — API

REST API for the daycare system: accounts and invites, enrolments, classes and children, attendance with offline sync, daily and monthly reports with photos, billing ("Já paguei", the monthly propina run, overdue job), expenses, reports, messages and notifications by email and WhatsApp.

**Stack:** Node.js 22, Express, TypeScript, MongoDB (Mongoose), JWT, Joi, Cloudinary (private photos behind signed links), Nodemailer + Handlebars, Meta WhatsApp Cloud API. Deployed on Vercel as one serverless function (`api/index.ts`).

## Run locally

```bash
cp env.example .env      # MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed             # demo data (accounts in docs/SEED-DATA.md, password Demo@2026)
npm run dev              # http://localhost:3002/health
```

Without SMTP or WhatsApp credentials those channels are skipped: invites show their link to share by hand, and everything else still works.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | API with auto-reload |
| `npm test` | Jest tests against an in-memory MongoDB (no database needed) |
| `npm run lint` · `npx tsc --noEmit` | Lint · typecheck |
| `npm run seed` · `npm run seed:fresh` | Demo data (refuses production; a remote database needs `-- --yes`) |
| `npm run create-admin -- --first … --last … --email …` | First administrator in a new database (prints the invite link) |
| `npm run build` · `npm start` | Production build in `dist/` (with the email templates) · run it |

## Layout

```
api/index.ts            Vercel entry: checks the environment, connects to MongoDB, hands over to Express
src/app.ts              Express app: security headers, CORS, rate limits, routes under /api/v1
src/routes/             One file per resource (+ jobs.ts for Vercel Cron, webhooks.ts for Meta)
src/controllers/        Request handling
src/services/           Business rules: AccessService (who sees what), sync, notifications, invoices…
src/models/             Mongoose models
src/middleware/         Auth (JWT, roles), rate limits, audit log
src/utils/validation.ts Joi schemas for every write
src/templates/emails/   Handlebars email templates
src/__tests__/          Jest tests (one file per area or phase)
scripts/                seed.ts, create-admin.ts
```

**Access:** reads are scoped by `AccessService`. Families see only their own children, and educators only their classes' children. A record outside that scope answers `404` (as if it didn't exist), so IDs can't be probed. Endpoints a role may not use at all (e.g. finance for educators) answer `403`.

## Documentation

| | |
|---|---|
| [docs/API.md](docs/API.md) | Every endpoint: bodies, responses, roles, errors |
| [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | How notifications choose channels, the log, fallback, webhook |
| [docs/WHATSAPP-TEMPLATES.md](docs/WHATSAPP-TEMPLATES.md) | The 12 WhatsApp templates and the Meta setup (in Portuguese, for the centre) |
| [docs/SEED-DATA.md](docs/SEED-DATA.md) | Demo accounts and data |
| [env.example](env.example) | Every environment variable, explained |
| [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Deploying to Vercel with Atlas, step by step |
