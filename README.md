# Voltair Studio Portal

Client portal for Voltair Studio — projects, deliverables, approvals. Next.js 16
(App Router, Turbopack) · Firebase (Auth · Firestore · Storage) · Tailwind v4 ·
installable PWA. Deploys to Vercel at `portal.voltairstudio.com`.

Full architecture: [`development-plan.md`](./development-plan.md).

## Requirements

- Node.js 24, npm
- **JDK 21+** — only for the Firestore/Storage emulators (Phase 2+). The Auth
  emulator (Phase 1 login testing) needs no Java.
- A `.env.local` (git-ignored) — copy [`.env.example`](./.env.example) and fill in.
  Paste `RESEND_API_KEY` when email work starts (Phase 6/7).

## Local development

```bash
npm install

# Terminal 1 — Firebase emulators
npm run emulators          # Auth + Firestore + Storage  (needs JDK 21+)
npm run emulators:auth     # Auth only — enough for the login flow, no Java

# Terminal 2 — seed test accounts into the Auth emulator, then run the app
npm run seed
npm run dev                # http://localhost:3000
```

### Test accounts (emulator only, created by `npm run seed`)

| Email | Password | Role |
|---|---|---|
| `admin@voltair.test` | `voltair123` | admin → `/admin` |
| `client@acme.test` | `voltair123` | client (`clientId: acme`) → `/dashboard` |

Google sign-in also works against the Auth emulator (mock account picker).

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (compiles the Serwist service worker) |
| `npm run start` | Serve the production build |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run emulators` / `emulators:auth` | Firebase emulator suite / Auth only |
| `npm run seed` | Seed emulator test accounts + custom claims |
| `npm run test` | Vitest (rules unit tests land in Phase 2) |
| `npm run icons` | Regenerate PWA icons from `Brand Assets/VoltairLogo1.png` |

## How auth works

1. Client signs in with the Firebase Web SDK (`src/lib/firebase/auth-client.ts`).
2. The ID token is POSTed to `/api/login`; `src/proxy.ts` (`next-firebase-auth-edge`)
   mints a signed, httpOnly `__session` cookie.
3. `proxy.ts` verifies + auto-refreshes that cookie on every request and redirects
   unauthenticated traffic on `/(portal)` and `/admin` to `/login`.
4. Server Components read the verified user via `getCurrentUser()`
   (`src/lib/firebase/session.ts`) — no client hydration flash.

`/api/login` and `/api/logout` have **no route handler files** — `authMiddleware`
in `proxy.ts` handles them (the matcher just lists the paths).

## Not committed

`.env.local` holds the Firebase service-account private key and cookie secret.
It is git-ignored — never commit it. If it leaks, rotate the service-account key
in the Firebase console and change `COOKIE_SECRET_KEY`.
