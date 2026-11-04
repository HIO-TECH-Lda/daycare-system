# Deployment

**Sonho de Criança** · 2026-11-04

How to put the system online: **staging** first (from the `dev` branch), then **production** (from `main`). Everything here is done in the providers' dashboards, with the accounts owned by the centre (or by HIO on its behalf).

| Piece | Where | Production | Staging |
|---|---|---|---|
| Web app (`web-app/`) | Netlify | `https://app.<domain>` (branch `main`) | `https://app-staging.<domain>` (branch deploy `dev`) |
| API (`api/`) | Vercel, region Cape Town (`cpt1`) | `https://api.<domain>` (branch `main`) | `https://api-staging.<domain>` (branch `dev`) |
| Database | MongoDB Atlas | cluster/database `daycare` | separate database `daycare-staging` (or cluster) |
| Photos and receipts | Cloudinary | folder `sonho-de-crianca` | folder `sonho-de-crianca-staging` |
| Email | SMTP, sender on the domain | `notificacoes@<domain>` | same sender, or none |
| WhatsApp | Meta Cloud API | the centre's number | Meta's test number |

`<domain>` is the centre's domain, e.g. `sonhodecrianca.co.mz`. Using subdomains of one domain keeps CORS, links and cookies simple.

---

## 1. Accounts and plans

| Service | Plan | Why |
|---|---|---|
| Vercel | **Pro** | Hobby is non-commercial only. Pro also gives longer function time and logs. |
| Netlify | Free to start; Pro for team access | |
| MongoDB Atlas | A tier **with backups** (Flex or dedicated M10+, check what Atlas offers now) | The free tier has no backups. Pick the region closest to Cape Town that the tier offers (AWS `af-south-1` when available). |
| Cloudinary | Free to start | Watch the storage and bandwidth limits once photos are in daily use. |
| SMTP | Google Workspace, Zoho, Brevo… | A sender on the centre's own domain. |
| Meta | Business account, verified | See `api/docs/WHATSAPP-TEMPLATES.md`. Business verification can take days to weeks: start early. |

## 2. Database (Atlas)

1. Create the project and cluster (region as above). Create **two databases** in it, `daycare` and `daycare-staging`, or a separate cluster for staging.
2. **Database users:** one per environment, with access to its own database only, and a long generated password.
3. **Network access:** Vercel functions have no fixed IP address, so allow `0.0.0.0/0` and rely on the strong credentials (a fixed-IP option exists only on Vercel's Enterprise plan).
4. **Alerts:** connections, disk, and failed backups → the HIO and centre emails.
5. Copy the connection strings (`mongodb+srv://…/daycare?retryWrites=true&w=majority`).

## 3. API on Vercel

1. New project from the GitHub repo. **Root directory: `api`**. Framework: Other. The settings come from `api/vercel.json`: region `cpt1`, function `api/index.ts`, the daily overdue-invoice job at 04:00 UTC (06:00 in Maputo), and builds skipped when nothing under `api/` changed.
2. **Production branch: `main`.** For staging, give the `dev` branch its own domain (Settings → Domains → `api-staging.<domain>` → branch `dev`), with its own environment variables (scope "Preview", branch `dev`).
3. **Environment variables** (Settings → Environment Variables). Generate each secret with `openssl rand -base64 48`, and use **different values per environment**:

| Variable | Production | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Also on staging: it turns on the production checks. |
| `MONGODB_URI` | Atlas, database `daycare` | Staging: `daycare-staging`. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | 2 different secrets, ≥ 32 characters | The API refuses to start otherwise. |
| `API_PUBLIC_URL` | `https://api.<domain>` | Signed photo links. |
| `FRONTEND_URL` | `https://app.<domain>` | Links in invites and emails. |
| `CORS_ORIGINS` | `https://app.<domain>` | Comma-separated; `*` wildcards allowed (e.g. Netlify deploy previews on staging only). |
| `MEDIA_URL_SECRET` | a secret | Signs photo links. |
| `CRON_SECRET` | a secret | Vercel sends it to the job automatically. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary | |
| `CLOUDINARY_FOLDER_NAME` | `sonho-de-crianca` | Staging: `sonho-de-crianca-staging`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | from the email provider | |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | from Meta | Empty until Meta is ready: notifications then go by email only. |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | a secret / Meta app secret | Delivery webhook. |
| `WHATSAPP_API_VERSION`, `WHATSAPP_LANG` | `v23.0`, `pt_PT` | Defaults; set only to change. |

   The full list with explanations is in `api/env.example`. If a required variable is missing, every request answers "Servidor mal configurado" and the function log says which one.
4. Deploy, then check `https://api.<domain>/health` → `{"status":"OK"}`. `/health` also goes through the database connection, so it answers 503 if Atlas can't be reached.

## 4. Web app on Netlify

1. New site from the GitHub repo. Settings come from the root `netlify.toml`: base directory `web-app`, `npm run build`, Node 22, builds skipped when nothing under `web-app/` changed. The Next.js runtime is detected automatically.
2. **Production branch: `main`. Branch deploys: `dev`** (Site configuration → Build & deploy → Branches).
3. **Environment variable** `NEXT_PUBLIC_API_URL`, set **per deploy context** (it's fixed into the build):
   - Production → `https://api.<domain>`
   - Branch deploy `dev` → `https://api-staging.<domain>`
   - Deploy previews → the staging API (and add `https://deploy-preview-*--<site>.netlify.app` to the staging API's `CORS_ORIGINS`)
4. The app sends its own security headers (Content-Security-Policy and others, in `web-app/next.config.ts`). The CSP only lets the page talk to `NEXT_PUBLIC_API_URL`, so a wrong value shows up as "Sem ligação ao servidor".

## 5. Domains and DNS

| Record | Points to |
|---|---|
| `app.<domain>` | Netlify (CNAME to the site's `*.netlify.app`) |
| `app-staging.<domain>` | Netlify branch subdomain for `dev` |
| `api.<domain>` | Vercel (CNAME `cname.vercel-dns.com`) |
| `api-staging.<domain>` | Vercel, assigned to the `dev` branch |

Both platforms issue the HTTPS certificates. For email, add the provider's **SPF** and **DKIM** records and a **DMARC** record (`v=DMARC1; p=quarantine; rua=mailto:<admin email>`), or invites will land in spam.

## 6. WhatsApp (Meta)

1. Follow `api/docs/WHATSAPP-TEMPLATES.md`: business verification, number, system-user token, the 12 templates (language `pt_PT`).
2. **Webhook:** Meta App → WhatsApp → Configuration → callback `https://api.<domain>/api/v1/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**. Staging: the same with `api-staging` and the test number.
3. Switch the Meta app to **Live** mode.

## 7. Staging: first deploy and checks

1. Merge to `dev` → both platforms deploy staging.
2. Load demo data **into the staging database** from a computer, with the staging connection string. The seed refuses `NODE_ENV=production`, and wiping a remote database needs `--yes`:
   ```bash
   cd api
   MONGODB_URI="mongodb+srv://…/daycare-staging" NODE_ENV=development npm run seed:fresh -- --yes
   ```
   Demo accounts (password `Demo@2026`): `admin@sonhodecrianca.mz`, `maria@sonhodecrianca.mz`, `ana.silva@demo.com`… (see `api/docs/SEED-DATA.md`).
3. Run the manual checks in `reports/2026-11-03-qa-checklist.md` on staging (devices, WhatsApp test number, emails, client copy review). The automated suite already ran in CI for every PR.

## 8. Production: go-live

1. Merge `dev` → `main` (both platforms deploy production).
2. **First administrator**, from a computer, with the production database and site address in the shell (the values are in Vercel → Environment Variables; add the `SMTP_*` / `WHATSAPP_*` ones too if the invite should be sent rather than only printed):
   ```bash
   cd api
   MONGODB_URI="mongodb+srv://…/daycare" FRONTEND_URL="https://app.<domain>" \
     npm run create-admin -- --first <Nome> --last <Apelido> --email <email> [--phone 84xxxxxxx] [--whatsapp]
   ```
   It prints the invite link (and sends it when email/WhatsApp are set). The administrator chooses their own password from the link. Values in the shell win over a local `api/.env`.
3. The administrator creates the **classes**, then invites the **educators** (Pessoas → Nova pessoa) and assigns them to classes.
4. **Families:** either through the public form (`/matricula` → Matrículas → Aprovar, which creates the account and sends the invite), or created directly in Pessoas and Crianças. Invite educators first, families once the classes are ready.
5. Install the app on the centre's tablets (Chrome → Instalar) and sign each educator in.

### Go-live checklist
- [ ] All secrets generated for production only (none reused from staging or `.env` files); `.env` files never committed.
- [ ] `/health` OK; the web app loads and signs in; a test invite arrives by email (and WhatsApp).
- [ ] Atlas backups on, and **one restore tested** (restore a snapshot to a temporary cluster and open it).
- [ ] Privacy notice (`/privacidade`) reviewed and approved by the centre: contacts, retention period. It's linked from the login page and the enrolment form.
- [ ] WhatsApp templates approved, business verified, webhook receiving statuses (Notificações shows "Entregue"/"Lida").
- [ ] The QA checklist's manual items ticked on staging.
- [ ] The demo seed was **never** run against production (the production database has no `@demo.com` accounts).

## 9. Monitoring

| What | How | Who / when |
|---|---|---|
| API up | An uptime monitor (e.g. UptimeRobot, Better Stack: free plans) on `https://api.<domain>/health` every 5 min | Alerts to HIO |
| Web up | The same on `https://app.<domain>/login` | Alerts to HIO |
| Errors | Vercel → Logs (filter `error`), Netlify → Functions logs | HIO, when alerted |
| Overdue job | Vercel → Cron Jobs: last run of `mark-overdue` | HIO, monthly |
| Database | Atlas alerts (above) | Automatic |
| Notifications | Admin → **Notificações** (the Painel shows "Avisos que falharam") | Centre, weekly |

Optional later: Sentry on both apps for error reports with context.

## 10. Updates and rollback

- **Release:** PR into `dev` (CI: API tests, web build, end-to-end) → check on staging → PR `dev` → `main`.
- **Rollback:** Vercel → Deployments → previous → **Instant Rollback**; Netlify → Deploys → previous → **Publish deploy**. Database changes so far are additive (new fields with defaults), so an older version still runs against the current data.
- Installed tablets pick up a new version the next time the app is opened twice (the service worker is never cached).
