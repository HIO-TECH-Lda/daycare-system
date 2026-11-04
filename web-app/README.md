# Sonho de Criança — web app

The portal for families (Encarregados de Educação), staff and the administration. It is a client-rendered Next.js app that talks to the API in `../api`.

**Stack:**
- Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript (strict)
- Tailwind CSS 4 and shadcn/ui (Radix), themed with the brand tokens in `app/globals.css`
- TanStack Query, react-hook-form + zod
- Installable as a PWA (`app/manifest.ts`), with a Serwist service worker and an offline queue for staff writes

> `AGENTS.md`: this Next.js version differs from older ones. Read the version-matched docs in `node_modules/next/dist/docs/` before changing framework-level code.

## Run locally

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, default http://localhost:3002
npm install
npm run dev                  # http://localhost:3000
```

The API must be running (see `../api`). `npm run seed` there creates demo accounts.

## Layout

| Path | What |
|---|---|
| `app/(public)/` | Login (email or phone), accept invite (`/convite/[token]`), password recovery (`/recuperar-senha`, `/redefinir-senha`) |
| `app/matricula`, `app/privacidade` | Public enrolment form and privacy notice |
| `app/admin`, `app/staff`, `app/responsavel` | Each role's area, behind `RoleGuard` + `AppShell` (sidebar on laptops, bottom tabs on phones and tablets) |
| `lib/api/` | API client (tokens, automatic refresh) and endpoint helpers |
| `lib/auth/` | Session context |
| `lib/offline/` | Offline queue for staff writes (`writes.ts`: `recordAttendance`, `saveDailyReport`, `usePendingWrites`) and the per-person query cache (`persist.ts`) |
| `app/sw.ts`, `app/serwist/` | Service worker and the route that serves it at `/serwist/sw.js` |
| `lib/roles.ts` | Role labels (pt-MZ) and each role's navigation |
| `components/ui/` | shadcn/ui components (`npx shadcn@latest add …`) |
| `scripts/generate-icons.mjs` | Regenerates the favicon and PWA icons from the logo (`npm run icons`) |

The `[...section]` routes catch any address that isn't a screen, inside each role's area.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Develop / production build / serve the build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run icons` | Regenerate icons from `public/brand/logo-mark.svg` |

## Notes

- **Light theme only** for v1. The traced logo only works on light backgrounds.
- **Copy is in Mozambican Portuguese.** Approved glossary: Encarregado de Educação, Propina, Telemóvel, Educador, Criança, Presenças, Palavra-passe (see the plan, §2).
- **Security headers** (Content-Security-Policy and others) are set in `next.config.ts`, for production builds. The policy only allows connections to `NEXT_PUBLIC_API_URL` (and images from Cloudinary): a new external service needs adding there.
- **Pages that read the URL on the client** (`useSearchParams`, `useParams`, `usePathname`) must sit inside `<Suspense>`, because Cache Components prerenders a static shell.

## Offline (PWA)

- **The service worker only runs in production builds.** To try it: `npm run build && npm start`, open the app once online, then go offline. It precaches every screen in the navigation (`lib/roles.ts`), so a new screen there is available offline automatically.
- **It caches the app, never API data.** A tablet is shared, so API responses (personal data) aren't cached by the worker. Data a screen needs offline is kept per person: give its query `meta: { offline: true }` (stored in IndexedDB for 24 h, saved also when the app is hidden or closed, and wiped at sign-out and sign-in).
- **Staff writes go through the queue.** Use `recordAttendance` / `saveDailyReport` instead of calling the API directly: they work offline, can't create duplicates when retried (`client_id`), and sync on their own. Show `usePendingWrites()` as a "por enviar" badge.
- **A write the API refuses** (e.g. a child no longer in the class) is set aside, and the banner lets staff retry or discard it.

## Tests

The end-to-end suite in `../e2e` (Playwright) runs this app's production build against a throwaway API: the full journey, role access, offline restart, accessibility and layout. See the root README.
