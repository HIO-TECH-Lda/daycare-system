# QA checklist — Phase 4

**Sonho de Criança** · 2026-11-03

What the automated tests cover, and what still has to be checked by hand on real devices, with Meta, and with the client. Tick each box on staging before go-live (Phase 5).

---

## Automated (runs in CI on every PR)

`e2e/` — Playwright against a throwaway stack: in-memory MongoDB with the demo seed, the API on :3102, and a production build of the web app on :3101. Nothing is sent by email or WhatsApp.

```bash
cd e2e
npm ci
npx playwright install chromium
npm test                      # builds the web app, starts both, runs everything
E2E_SKIP_BUILD=1 npm test     # reuse the last build
npm run report                # HTML report with traces of failures
```

| Spec | What it proves |
|---|---|
| `journey.spec.ts` | Public enrolment → admin approval (invite link shown when nothing could be sent) → parent activates the account → educator checks the child in **while offline**, and it syncs → daily report → parent sees check-in and report → admin issues an invoice and records the payment → parent sees it paid. |
| `access.spec.ts` | Every area redirects to login without a session and to the user's own home for other roles. A parent gets 404 for another family's child, attendance, reports and invoice. An educator gets 404 for a child outside their classes. Admin-only endpoints answer 403 to parents and educators. |
| `offline.spec.ts` | An attendance recorded offline survives closing the app; the app opens again without internet (service worker), still shows it as "Por enviar", and sends it when the connection returns. |
| `quality.spec.ts` | 17 main screens across the 4 roles: no serious/critical axe issues (WCAG 2.1 A/AA), and no sideways scrolling at 360, 768 and 1440 px. |

The API's own tests (Jest, `api/src/__tests__`) cover the rules in depth: scoping, sync conflicts, permissions, notifications.

---

## By hand, on staging

### Devices (PWA)
Lighthouse no longer has a PWA category (removed in v12). Installability is checked in Chrome DevTools → Application → Manifest, and on the devices themselves.

- [ ] **Android tablet** (Chrome): install from the "Instalar" prompt. Opens full screen with the icon and name. Log in as an educator, turn on aeroplane mode, record 3 check-ins and a daily report, **close the app from recents**, reopen it offline: the records are still "Por enviar". Turn the network on: they sync.
- [ ] **iPad** (Safari → Partilhar → Adicionar ao ecrã principal): the same offline test. Note that iOS may clear site data after a few weeks unused.
- [ ] **Laptop** (Chrome/Edge): install from the address bar; the admin screens and CSV exports work.
- [ ] **Parent's phone** (Android and iPhone): log in by phone number, see the day, reports, invoices, "Já paguei", "Avisar ausência".
- [ ] Lighthouse (DevTools, mobile) on `/login`, `/staff/presencas`, `/responsavel`: Performance ≥ 80, Accessibility ≥ 95, Best practices ≥ 95. Record the scores here.
- [ ] A new deploy reaches an installed tablet (reopen the app twice; the service worker isn't cached).

### WhatsApp (needs the centre's Meta setup)
- [ ] Every one of the 12 templates in `api/docs/WHATSAPP-TEMPLATES.md` is approved, and sent once to a real test number: invite, password reset, enrolment received and approved, new, overdue and paid invoice, daily and monthly report, new message, check-in, check-out.
- [ ] The invite and password buttons open the right page on the phone.
- [ ] Notificações shows each one move from Enviada to Entregue to Lida (webhook connected, app secret right).
- [ ] Send to a number without WhatsApp: the row shows Falhou with Meta's reason, and the email fallback arrives (for a family with an email that turned email off for that kind).
- [ ] Reenviar works on a failed row; a family that withdrew consent is refused.
- [ ] A family that turns off "Entradas e saídas" in Perfil gets no check-in messages.

### Email
- [ ] SMTP set on staging; each email template arrives, looks right on Gmail (web and phone), and its links open the right page.

### Layout and accessibility
- [ ] Walk every screen at 360 px (small Android) and on the tablet in both orientations.
- [ ] Keyboard only: log in, record attendance, fill a report, issue an invoice.
- [ ] Screen reader spot check (TalkBack on the tablet) on Presenças and the parent's Hoje.

### Copy (client review)
- [ ] The client reads every screen in pt-MZ against the approved glossary (Encarregado de Educação, Propina, Telemóvel, Educador, Palavra-passe, Presenças, Criança). **"Factura" is still to be confirmed**: it appears on screens, emails and the WhatsApp templates.
- [ ] Error messages from the API come through in Portuguese (wrong password, expired link, no internet).

### Roles with real data
- [ ] With the client's real classes and a few real families imported: each educator sees only their classes, each family only their children.

---

## Findings

### Found and fixed by the automated pass (2026-11-03)

| Area | Problem | Fix |
|---|---|---|
| Offline | A screen reached through the menu (e.g. Presenças) wasn't cached as a page, so a tablet reopened without internet showed "Sem internet" instead of the app. | Every navigation screen is precached by the service worker. |
| Offline | Data that arrived less than a second before the app was closed wasn't stored, so it reopened offline with nothing to show (the queued records themselves were safe). | The offline data is also saved the moment the app is hidden or closed. |
| Accessibility | Brand green, teal and sun text reached only ~4.1:1 on their tints (WCAG AA needs 4.5:1). | Text shades darkened slightly: green `#56732f`, teal `#087670`, sun `#9a5510`. |
| Accessibility | The account menu button's spoken name ("Menu da conta") didn't match what's on screen (the person's name). | Named by the person's name. |
| Accessibility | On the enrolment form, both "Sexo" buttons were announced as "Sexo Masculino". | A labelled group instead of a label around the buttons. |
| Accessibility | "Pedir matrícula" on the login page was distinguishable only by colour; an empty state sat directly inside a list; faded green text on the parent's Hoje card. | Underlined link; list item wrapper; full-strength text. |
| Layout | On 360 px phones, attendance and daily-report rows with a long name ran off the screen. | List grids can shrink (`grid-cols-1`), here and in the other lists built the same way. |
| API | Another family's invoice answered 403 (revealing that it exists) while every other record answers 404. | 404, like the rest. |

### Manual pass

Record problems found here (date, device, screen, what happened), or as GitHub issues.
