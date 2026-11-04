# Demo data (seed)

`scripts/seed.ts` fills a database with a small, realistic centre for development, staging and demos. **Never run it against production**: it refuses `NODE_ENV=production`.

```bash
npm run seed                    # skips if the demo data is already there
npm run seed:fresh              # wipes every collection first, then seeds
npm run seed:fresh -- --yes     # the same against a database that isn't on this machine (e.g. staging on Atlas)
```

It uses `MONGODB_URI` from the environment or `api/.env`, and prints the database and host before doing anything.

## Accounts

Password for all: **`Demo@2026`**. Each also signs in with its phone number.

| Role | Email | Phone | Notes |
|---|---|---|---|
| Administrador | `admin@sonhodecrianca.mz` | 84 100 0001 | |
| Educador | `maria@sonhodecrianca.mz` | 84 100 0002 | Berçário A, Maternal I |
| Educador | `joao@sonhodecrianca.mz` | 84 100 0003 | Maternal II, Jardim I |
| Encarregado de Educação | `ana.silva@demo.com` | 84 100 0004 | Two children |
| Encarregado de Educação | `carlos.santos@demo.com` | 84 100 0005 | One child |
| Encarregado de Educação | `patricia.oliveira@demo.com` | 84 100 0006 | One child |

## What it creates

| | |
|---|---|
| Classes | 5: Berçário A, Maternal I, Maternal II, Jardim I, Jardim II (by age, with capacity) |
| Children | 4, in four classes, with guardians, 2 pickup people, allergies on some |
| Today | Attendance (5 records, some already checked out), 3 daily reports with 3 photos, 3 activities |
| Billing | 4 invoices (pending, paid, overdue), 2 payments, 5 expense categories, 3 expenses |
| Other | 4 calendar events, 4 messages, 4 monthly reports (draft, submitted, validated) |

Dates are relative to the day it runs ("today", this month, last month), so the screens always have something current to show.

## Used by

- **The end-to-end tests** (`e2e/`): they seed a throwaway in-memory database on every run and rely on these accounts and classes.
- **Staging** (see `docs/DEPLOYMENT.md` §7).

To change the data, edit `scripts/seed.ts` and run `npm run seed:fresh`. If you rename accounts or classes, update `e2e/tests/support.ts` too.
