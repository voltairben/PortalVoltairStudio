# Voltair Studio Portal — Technical Design Document & Execution Plan

> On approval this document is written verbatim to `development-plan.md` in the
> workspace root (the requested deliverable), then execution begins at Phase 0.
>
> **Revision 2** — adds: Developer Pulse (Vercel/GitHub state without API rate
> limits), Firestore offline‑persistence config for the PWA/Capacitor shell, the
> concrete Vitest rules‑testing workspace + 3 tenant‑isolation tests, and the
> Next 16 `proxy.ts` middleware wiring.

---

## Context

Voltair Studio needs a standalone, branded client portal. Today clients get
project updates and file deliveries ad hoc (email, transfer links, chat). This
replaces that with one authenticated place where an invited client can:

- see their active projects and where each one stands,
- preview and download deliverables (video, images, docs),
- approve a deliverable or request changes, and leave threaded feedback/chat.

The studio manages all of it from an admin area in the same app, which also
carries a **Developer Pulse** panel (deployment + pull‑request health from
Vercel/GitHub). Both sides get email notifications on the events that matter.

**Outcome:** a production PWA at `portal.voltairstudio.com`, installable and fully
reviewable offline, that the studio runs day‑to‑day without touching the Firebase
console. A later Capacitor wrapper points at this same live URL.

---

## Locked scope (from planning Q&A)

| Decision | Choice |
|---|---|
| v1 client features | Project dashboard · Deliverables & assets · Approvals & feedback/chat |
| v1 studio features | Full role‑gated admin area · Developer Pulse panel |
| Out of v1 | Invoices / payments / Stripe |
| Auth | Invite‑only. Studio creates each account (email + password). No public signup. |
| Entry point | Dedicated subdomain `portal.voltairstudio.com`, linked from the marketing site |
| Notifications | Email **both directions** (client ↔ studio) |
| Hosting | Next.js SSR on **Vercel** + Firebase (Auth, Firestore, Storage) as backend |
| Offline | Client portal fully reviewable offline (PWA + Capacitor WebView) |
| Mobile | Full SSR now; Capacitor wraps the live URL later — no static‑export constraint |
| Brand | Brand assets exist (need logo/fonts/spec). No mockups — screens designed from the brief. |
| Firebase project | Does **not** exist yet — created in Phase 0 |

**Assumption to confirm at Phase 0:** *Developer Pulse is studio‑facing only* (admin
overview). Clients may later get a trimmed read‑only "build health" chip on their
project page. If clients should see full deploy/PR detail, the `integrations/**`
rules below change.

---

## Stack (versions current as of Sept 2026)

| Layer | Choice | Why / what was rejected |
|---|---|---|
| Framework | Next.js **16.2.x**, App Router, Turbopack, React 19.2 | Current stable. Middleware file is **`proxy.ts`** in Next 16 (was `middleware.ts`). |
| Language | TypeScript 5.x, `strict` | — |
| Runtime | Node.js 24 (Vercel Fluid Compute) | Admin SDK needs Node crypto; Fluid Compute removes the old reason to reach for Edge. |
| Styling | **Tailwind CSS v4.3.x**, CSS‑first `@theme` | No `tailwind.config.js` — tokens live in `globals.css`. |
| UI primitives | **shadcn/ui** (Radix), restyled to brand | Accessible dialogs/tabs/menus for free; copy‑in, not a runtime bundle. |
| Auth glue | **`next-firebase-auth-edge`** | `__session` cookie, JWT verification via `jose`, **automatic token refresh**, `proxy.ts` guards for Next 16. Hand‑rolling = ~200 lines of security‑critical refresh/revocation/key‑rotation code. Alternative (Firebase Server App + raw ID token) noted in the ledger. |
| Server data | **`firebase-admin`** (Admin SDK) | Admin area + SSR first paint + signed Storage URLs + webhook writes. Authz in code against custom claims. |
| Client data | `firebase` web SDK v12 | Portal read pages (for offline cache), realtime feedback/chat, admin resumable uploads. |
| Validation | **zod** — schemas shared client + server | — |
| Email | **Resend** SDK from server actions (+ one reconnect route) | Rejected the Trigger‑Email extension + Cloud Functions: all online writes already go through server actions. |
| PWA | **`@serwist/next` + `@serwist/turbopack`** SW + **`app/manifest.ts`** | `@serwist/turbopack` serves the SW as a Route Handler → no Turbopack bundler conflict (the thing that broke `@ducanh2912/next-pwa`). |
| State | React Context (auth, toasts, connection). **No** Redux/Zustand/TanStack Query. | Firestore web SDK *is* the client cache; Server Components + server actions + `revalidateTag` cover the rest. |
| Tests | Vitest + `@firebase/rules-unit-testing` (rules), Playwright (2 golden paths) | — |
| Package manager | pnpm | — |

**No Cloud Functions, no `functions/` directory in v1.** Server‑side = Next.js route
handlers + server actions + Admin SDK + Resend.

---

## 1. Directory & File Map

```
voltair-studio-portal/
├── public/
│   ├── icons/                     # PWA icons: 192, 512, maskable-512, apple-touch-180
│   └── brand/                     # logo variants, favicon source
├── src/
│   ├── app/
│   │   ├── layout.tsx             # <html lang> dark, next/font, providers, base metadata, appleWebApp
│   │   ├── globals.css            # @import "tailwindcss"; @theme { design tokens }
│   │   ├── manifest.ts            # PWA manifest (Metadata API)
│   │   ├── sw.ts                  # service worker source — served at /sw.js by @serwist/turbopack
│   │   ├── ~offline/page.tsx      # offline fallback shell
│   │   ├── not-found.tsx · error.tsx
│   │   ├── login/page.tsx         # public — the only unauthenticated page
│   │   ├── (portal)/              # authenticated client area — requireClient() in layout
│   │   │   ├── layout.tsx         # portal app shell (top bar + side/bottom nav) + <AuthProvider initialUser>
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── projects/[projectId]/
│   │   │   │   ├── page.tsx                       # overview + milestones (SSR + client listener)
│   │   │   │   ├── deliverables/page.tsx
│   │   │   │   └── deliverables/[deliverableId]/page.tsx   # viewer + approve + feedback/chat
│   │   │   └── account/page.tsx
│   │   ├── admin/                 # studio area — requireAdmin() in layout, distinct chrome
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # overview + Developer Pulse + feedback inbox
│   │   │   ├── clients/(list · [clientId] · new)
│   │   │   ├── projects/(list · [projectId] · new)
│   │   │   └── projects/[projectId]/deliverables/ # upload + manage
│   │   └── api/
│   │       ├── login/route.ts                # POST ID token -> __session cookie (lib helper)
│   │       ├── logout/route.ts               # POST clear cookie
│   │       ├── notify-pending/route.ts       # POST: emails for feedback/decisions that synced while offline
│   │       ├── webhooks/vercel/route.ts      # Vercel deploy events -> Firestore  (HMAC-SHA1)
│   │       ├── webhooks/github/route.ts      # GitHub PR/CI events -> Firestore   (HMAC-SHA256)
│   │       └── cron/reconcile-integrations/route.ts   # 15-min safety net, 1 REST call per provider
│   ├── proxy.ts                   # Next 16 middleware — authMiddleware; skips PWA assets + webhooks
│   ├── components/
│   │   ├── ui/                    # shadcn primitives, restyled
│   │   ├── portal/               # DashboardCard, DeliverableViewer, ApprovalBar, FeedbackThread…
│   │   ├── admin/                # DataTable, UploadDropzone, ProjectForm, PulsePanel…
│   │   └── providers/            # AuthProvider, ToastProvider, ConnectionBanner
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── client.ts          # web SDK singleton + persistentLocalCache + emulator wiring
│   │   │   ├── admin.ts           # Admin SDK singleton (service account, server-only)
│   │   │   ├── auth-config.ts     # next-firebase-auth-edge shared config
│   │   │   └── session.ts         # getCurrentUser() [React.cache], requireClient(), requireAdmin()
│   │   ├── data/                  # projects.ts, deliverables.ts, feedback.ts, clients.ts, pulse.ts
│   │   ├── integrations/          # vercel.ts, github.ts — verify signature + normalize + upsert
│   │   ├── storage.ts             # signed download URLs, upload path helpers
│   │   ├── email/                 # resend.ts + templates
│   │   ├── validation/            # zod schemas
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-firestore-doc.ts   # web-SDK subscribe, SSR initialData, offline-aware {status}
│   │   ├── use-feedback-thread.ts # chat onSnapshot + connection state + offline write queue
│   │   └── use-developer-pulse.ts # optional onSnapshot on integrations/** for the admin panel
│   └── types/                     # Project, Deliverable, FeedbackItem, UserProfile, ClientCompany, PulseItem
├── firebase/
│   ├── firestore.rules · storage.rules · firestore.indexes.json
│   ├── __tests__/                 # rules unit tests + setup.ts
│   ├── vitest.config.ts
│   └── seed/                      # emulator seed data + script
├── e2e/                           # Playwright: client-golden-path, admin-golden-path
├── .github/workflows/ci.yml
├── firebase.json · .firebaserc
├── vitest.workspace.ts           # ['./src', './firebase']
├── next.config.ts · postcss.config.mjs · tsconfig.json
├── vercel.json                   # security headers, cache-control, cron
├── .env.example · .env.local.example
└── README.md                     # setup + admin operations guide
```

---

## 2. State & Real‑Time Strategy

### The core problem
Firebase Auth's web SDK keeps the session in IndexedDB — invisible to the server.
Render authed UI on the server from a guess → hydration mismatch + auth flash.

### Solution — session cookie, server is the source of truth
1. Client signs in with the web SDK (`signInWithEmailAndPassword`) → ID token.
2. Client `POST`s it to `/api/login`; `next-firebase-auth-edge` verifies and sets an **httpOnly, Secure, SameSite=Lax `__session` cookie**.
3. `proxy.ts` runs `authMiddleware` on matched requests: validates the cookie, **auto‑refreshes** the token before expiry, redirects unauthenticated hits on `/(portal)` and `/admin` to `/login`.
4. Server Components/Actions call `getCurrentUser()` (wraps the lib's `getTokens()` in `React.cache()` → once per request) → `{ uid, role, clientId }` from verified claims.
5. `requireClient()` / `requireAdmin()` `redirect()` or `notFound()` on the wrong role.

### Hydration mismatch — avoided by construction
- Portal/admin **layouts are Server Components** rendering the shell from the server‑known user. No `useEffect` gating layout.
- `<AuthProvider initialUser={serverUser}>` seeds client context with the same value → first client paint is byte‑identical to SSR.
- The web SDK's `onIdTokenChanged` reconciles afterward and re‑hits `/api/login` when the client refreshes its own token.
- Rule: never render structurally different DOM from client‑only auth state on first paint.

### Sessions & custom claims
- On account creation (admin action): Admin SDK `createUser()` → `setCustomUserClaims(uid, { role, clientId })`.
- Claims ride inside the ID token **and** the session cookie → available to server code and to Firestore/Storage rules with zero extra reads (`request.auth.token.clientId`).
- `ponytail:` acceptable role‑staleness = one token refresh cycle; add server‑push revalidation only if roles start changing often.

### Read model — SSR first paint, web SDK for liveness + offline
The portal must be reviewable **fully offline** (PWA + Capacitor). Admin‑SDK reads
never populate the client cache, so client pages use a **hybrid**:

1. The Server Component fetches the initial snapshot (Admin SDK) and passes it as
   `initialData` to a client component → instant, flash‑free first paint.
2. That client component subscribes with the **web SDK** (`onSnapshot`) for
   project details, milestones, deliverable metadata, and feedback/chat. These
   reads populate `persistentLocalCache`.
3. On a later visit **offline**: Serwist serves the shell + JS, the web SDK serves
   the same data from IndexedDB, the page renders identically with an "offline"
   marker. A never‑opened project shows an explicit "unavailable offline" state.

Admin pages stay Admin‑SDK server‑first — the studio is never offline.

### Firestore offline persistence — config (`lib/firebase/client.ts`)
```ts
import { initializeFirestore, persistentLocalCache,
         persistentMultipleTabManager, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),   // several tabs share one cache
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }),
});
```
- IndexedDB‑backed. Works in the browser PWA **and** the Capacitor WebView (same engine) — no native plugin.
- `initializeFirestore` (not `getFirestore` + deprecated `enableIndexedDbPersistence`) — the modern, non‑racy API.
- Emulator wiring runs *after* this, guarded by `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`.

### Connection state UI
`<ConnectionBanner>` (global) reads `!navigator.onLine` + listener
`snapshot.metadata.fromCache` + `hasPendingWrites`. States: **online** (hidden) ·
**offline – showing saved data** · **reconnecting…** · **N changes waiting to sync**.

### Writes
- **Online:** server action → zod validate → Admin SDK write → `revalidateTag` + Resend email. Primary path.
- **Offline:** the composer falls back to a direct web‑SDK write (rules‑enforced, same zod schema) with `notified: false`. Firestore queues it; UI shows it immediately marked "pending sync" (`hasPendingWrites`).
- **On reconnect:** a small client effect `POST`s the synced doc ids to `/api/notify-pending`, which sends the outstanding emails and flips `notified: true`.
- `ponytail:` that reconnect‑notify route is the *only* offline‑write plumbing. If it proves flaky, move email to a Cloud Function `onDocumentCreated` and delete the route.

---

## 3. PWA Integration Strategy

**Manifest:** `app/manifest.ts` — name, short_name, `display: "standalone"`,
`background_color`/`theme_color` `#0A0A0A`, icon set, `id`, `scope: "/"`,
`start_url: "/dashboard"`. iOS splash/status‑bar via `appleWebApp` in root metadata.

**Service worker:** `@serwist/turbopack` — SW source is `app/sw.ts`, served at
`/sw.js` as a Route Handler (Turbopack never bundles it). Registered by a small
client component in the root layout, **disabled in dev**.

**Caching strategy**

| Request | Strategy | Notes |
|---|---|---|
| App shell, precached build assets, `~offline` page | Precache on install | Serwist injects the build manifest |
| Navigations (pages) | `NetworkFirst`, 3s timeout → cached shell → `~offline` | authed HTML never written to a long‑lived cache |
| `/_next/static/*`, fonts | `CacheFirst` + 30d expiration | content‑hashed, safe |
| Images (non‑Storage) | `StaleWhileRevalidate` + expiration | |
| `/api/*`, `*.googleapis.com`, Firestore, signed Storage URLs | `NetworkOnly` | auth‑sensitive / time‑limited — **never cached** |

Data offline is Firestore's job (`persistentLocalCache`), not the SW's — the SW
only guarantees the app *loads*.

**Lifecycle:** `skipWaiting` + `clientsClaim`, with an in‑app "New version — reload"
toast on Serwist's window event. Cache names versioned by build; old caches purged
on activate.

**Not in v1:** web push (notifications are email), background sync.

**Icons:** generated from the brand logo in Phase 0 → `public/icons/` +
`app/icon.png` / `app/apple-icon.png`. Verified with Lighthouse installability.

---

## 4. Tailwind & Design Tokens

Tailwind v4, CSS‑first. All tokens in `src/app/globals.css` under `@theme`. **Dark
is the only theme** (`color-scheme: dark`, no toggle) — a light palette later is a
token swap.

```css
@import "tailwindcss";

@theme {
  /* Surfaces — near-black base, layered elevation */
  --color-bg:            #0A0A0A;
  --color-surface-1:     #111113;
  --color-surface-2:     #17171A;
  --color-surface-3:     #1E1E22;
  --color-border:        rgb(255 255 255 / 0.08);
  --color-border-strong: rgb(255 255 255 / 0.14);

  /* Text */
  --color-fg:            #F4F4F5;
  --color-fg-muted:      #A1A1AA;
  --color-fg-subtle:     #71717A;

  /* Accent — single restrained metallic (PLACEHOLDER; replace from brand assets) */
  --color-accent:        #C8A96A;
  --color-accent-fg:     #0A0A0A;

  /* Status */
  --color-success: #4ADE80;  --color-warning: #FBBF24;  --color-danger: #F87171;

  /* Typography (PLACEHOLDER pairing; swap for licensed brand fonts in Phase 0) */
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    ui-monospace, "SF Mono", monospace;

  /* Fluid type scale */
  --text-xs: 0.75rem;  --text-sm: 0.875rem;  --text-base: 1rem;
  --text-lg: 1.125rem; --text-xl: 1.25rem;
  --text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --text-4xl: clamp(2.25rem, 1.6rem + 3.2vw, 3.5rem);
  --text-6xl: clamp(3rem, 1.8rem + 6vw, 5rem);

  /* Radius — restrained */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px;

  /* Elevation — borders + faint glow do the work on near-black */
  --shadow-e1: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-e2: 0 8px 24px -8px rgb(0 0 0 / 0.6);
  --ring: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);

  /* Motion */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 400ms;
}
```

**Global rules (on top of Preflight):** `:focus-visible` ring via `--ring`; subtle
custom scrollbars; `text-wrap: balance` on headings; `-webkit-font-smoothing:
antialiased`; `@media (prefers-reduced-motion: reduce)` kills non‑essential
transitions; selection colour = accent at low alpha.

**Layout / mobile:** mobile‑first; `100dvh` not `100vh`; `env(safe-area-inset-*)`
padding on the fixed top bar and bottom nav (PWA standalone / Capacitor notch);
container queries for cards that reflow. Desktop = left rail; mobile = bottom tabs.

**Fonts:** `next/font/local` for licensed brand fonts (Phase 0), `next/font/google`
fallback pairing until they arrive. `display: 'swap'`, preloaded.

**Primitives:** `shadcn/ui` init with these tokens, then each component restyled
(no default shadcn look ships): Button, Card, Badge/StatusPill, Dialog, Sheet,
Tabs, DropdownMenu, Toast, Avatar, Skeleton, Progress, Tooltip.

**The visual layer follows the `impeccable` / `frontend-design` skill** — this
section is the token contract, not the final screen design.

---

## 5. Firebase Security Validation

### Local — Firebase Emulator Suite
- `firebase.json` runs Auth (9099) + Firestore (8080) + Storage (9199); `firebase emulators:start`.
- App connects to emulators when `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`; Admin SDK via `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` / `FIREBASE_STORAGE_EMULATOR_HOST`.
- `firebase/seed/` seeds one studio admin, two client companies, projects, deliverables, feedback — dev + E2E realism.

### Vitest rules workspace — structure
`vitest.workspace.ts` at root lists `./src` and `./firebase`. The firebase project:

- **`firebase/vitest.config.ts`** — `test.environment = 'node'`, `test.globals = true`,
  `test.fileParallelism = false` (one emulator, run serial), `test.setupFiles = ['./__tests__/setup.ts']`.
- **`firebase/__tests__/setup.ts`**:
  ```ts
  import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
  import { readFileSync } from 'node:fs';

  beforeAll(async () => {
    globalThis.testEnv = await initializeTestEnvironment({
      projectId: 'voltair-portal-test',
      firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'),
                   host: '127.0.0.1', port: 8080 },
    });
  });
  beforeEach(() => globalThis.testEnv.clearFirestore());
  afterAll(() => globalThis.testEnv.cleanup());
  ```
- **Helpers** (`firebase/__tests__/helpers.ts`):
  ```ts
  export const asClient = (uid: string, clientId: string) =>
    testEnv.authenticatedContext(uid, { role: 'client', clientId }).firestore();
  export const asAdmin = () =>
    testEnv.authenticatedContext('studio-1', { role: 'admin' }).firestore();
  export const seed = (fn) =>
    testEnv.withSecurityRulesDisabled(ctx => fn(ctx.firestore()));
  ```
- **Run:** `firebase emulators:exec --only firestore,storage "pnpm vitest run --project firebase"` — same command in CI, before the app build.

### The 3 tenant‑isolation tests (must pass)

**Test 1 — client cannot GET another client's project**
```ts
test('client A cannot read client B project', async () => {
  await seed(db => setDoc(doc(db, 'projects/projB'), { clientId: 'clientB', title: 'B' }));
  await assertFails(getDoc(doc(asClient('userA', 'clientA'), 'projects/projB')));
  await assertSucceeds(getDoc(doc(asClient('userB', 'clientB'), 'projects/projB')));
});
```

**Test 2 — client cannot QUERY across the tenant boundary**
(direct‑get denial is not enough; a `where` filtered at the other tenant must be *denied*, not merely empty)
```ts
test('client A cannot query client B projects', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'projects/pA'), { clientId: 'clientA' });
    await setDoc(doc(db, 'projects/pB'), { clientId: 'clientB' });
  });
  await assertFails(getDocs(query(collection(asClient('userA','clientA'), 'projects'),
    where('clientId', '==', 'clientB'))));
  await assertSucceeds(getDocs(query(collection(asClient('userA','clientA'), 'projects'),
    where('clientId', '==', 'clientA'))));
});
```

**Test 3 — client cannot read another client's chat / feedback records**
```ts
test('client A cannot read client B chat', async () => {
  await seed(async db => {
    await setDoc(doc(db, 'deliverables/dB'), { clientId: 'clientB', projectId: 'projB' });
    await setDoc(doc(db, 'deliverables/dB/feedback/f1'), { clientId: 'clientB', body: 'secret' });
  });
  await assertFails(getDoc(doc(asClient('userA','clientA'), 'deliverables/dB/feedback/f1')));
  await assertFails(getDocs(collection(asClient('userA','clientA'), 'deliverables/dB/feedback')));
});
```

The rule shape that satisfies all three (denormalized `clientId` on every child so no `get()`):
```
function isAdmin()        { return request.auth.token.role == 'admin'; }
function isClientOf(cid)  { return request.auth.token.role == 'client'
                                   && request.auth.token.clientId == cid; }

match /projects/{p} {
  allow read: if isAdmin() || isClientOf(resource.data.clientId);
}
match /deliverables/{d} {
  allow read: if isAdmin() || isClientOf(resource.data.clientId);
  match /feedback/{f} {
    allow read:   if isAdmin() || isClientOf(resource.data.clientId);
    allow create: if isClientOf(request.resource.data.clientId)
                     && request.resource.data.authorUid == request.auth.uid;
  }
}
match /integrations/{doc=**} {          # Developer Pulse — studio only
  allow read:  if isAdmin();
  allow write: if false;                # server (Admin SDK) only
}
```

Additional suite cases (not the headline 3): unauth denied everything · client
cannot write project/deliverable core fields · client can set only
`status`/`decidedBy*` on their own deliverable · Storage: client denied all reads
(downloads are signed URLs), admin claim required to write · `integrations/**`
denied to clients.

### CI gate — `.github/workflows/ci.yml`
`pnpm lint` → `pnpm typecheck` → `firebase emulators:exec "pnpm vitest run"` (rules + unit) → `pnpm build`. A red rules test fails the PR.

### Deploy flow — rules ship separately from the app
- On merge to `main`, after CI green: `firebase deploy --only firestore:rules,storage:rules,firestore:indexes`.
- Vercel deploys the app independently via its GitHub integration.
- Rules are **never** edited in the console — `firestore.rules` in git is the source of truth.

---

## 6. Developer Pulse — Vercel & GitHub state without rate limits

### Principle: never call the Vercel or GitHub REST API from a page render
The panel reads **only** from Firestore. External state arrives by **webhook** and
is mirrored into Firestore. One low‑frequency cron reconciles anything missed.

### Ingest — webhook Route Handlers (Node runtime, excluded from `proxy.ts`)

| Endpoint | Source | Verify | Events | Firestore target |
|---|---|---|---|---|
| `POST /api/webhooks/vercel` | Vercel account/team webhook | HMAC‑SHA1 of the **raw body** vs `x-vercel-signature`, secret `VERCEL_WEBHOOK_SECRET` | `deployment.created` `.succeeded` `.error` `.canceled` `.promoted` | `integrations/vercel/deployments/{deploymentId}` |
| `POST /api/webhooks/github` | GitHub repo (or org) webhook | HMAC‑SHA256 of the **raw body** vs `x-hub-signature-256`, secret `GITHUB_WEBHOOK_SECRET` | `pull_request`, `push`, `workflow_run`, `deployment_status` | `integrations/github/pulls/{repo}__{number}`, `integrations/github/runs/{id}` |

Handler rules:
- Read the **raw** body (`await req.text()`) before parsing — the signature is over raw bytes. Use `crypto.timingSafeEqual`.
- **Idempotent upsert** keyed by the event's own id (`x-github-delivery`, Vercel deployment id). Re‑deliveries are no‑ops.
- Normalize each payload to one shape before writing — the panel never sees raw provider JSON:
  `{ id, provider, kind, title, state, url, actor, repo|project, branch, updatedAt }`.
- Return `200` in `< 1s`; the Firestore write is one cheap doc, done inline — no queue at studio scale. `ponytail:` if event volume ever spikes, push to Vercel Queues and ack immediately.
- Both handlers call `revalidateTag('pulse')` so the admin panel reflects the event within one request.

### Reconcile — one cron, one request per provider
`vercel.json` cron → `GET /api/cron/reconcile-integrations` every 15 min, guarded
by `Authorization: Bearer ${CRON_SECRET}` (Vercel's standard cron‑auth pattern):
- One `GET https://api.vercel.com/v6/deployments?projectId=…&limit=20` and one
  `GET /repos/{owner}/{repo}/pulls?state=open&per_page=50` per tracked repo.
- Upsert the same normalized docs — safety net for missed webhooks, and the **only**
  time we touch the REST APIs: ~100 calls/day, far under both quotas (GitHub 5000/hr
  authenticated; Vercel generous per‑minute).
- Tokens: `VERCEL_API_TOKEN` (read), `GITHUB_TOKEN` (fine‑grained, read‑only on the target repos).

### Read — the panel
- `lib/data/pulse.ts` (Admin SDK) reads `integrations/**` for the admin overview — **server‑rendered**, cache‑tagged `pulse`, revalidated by the webhook handlers.
- No client polling. Optional "live" feel = one `onSnapshot` on `integrations/vercel/deployments` (`orderBy updatedAt desc limit 10`) via `use-developer-pulse.ts`.

### Data model additions
```
integrations/vercel/deployments/{deploymentId}   provider:'vercel', project, state, url, branch, actor, updatedAt
integrations/github/pulls/{repo}__{number}        provider:'github', repo, number, title, state, url, author, updatedAt
integrations/github/runs/{runId}                  provider:'github', repo, workflow, conclusion, url, updatedAt
integrations/_meta/reconcile                      lastRunAt, lastError            # cron heartbeat
```
Rules: admin read, no client access, server‑only writes (Test in the suite).

### Setup (Phase "Integrations")
1. Vercel dashboard → team/project → Webhooks → add `https://portal.voltairstudio.com/api/webhooks/vercel`, copy the signing secret → `VERCEL_WEBHOOK_SECRET`.
2. GitHub repo → Settings → Webhooks → add `.../api/webhooks/github`, content‑type `application/json`, set a secret → `GITHUB_WEBHOOK_SECRET`, select PR / push / workflow_run / deployment_status.
3. Create the two read tokens, add all four secrets + `CRON_SECRET` to Vercel env.
4. `vercel.json` → `"crons": [{ "path": "/api/cron/reconcile-integrations", "schedule": "*/15 * * * *" }]`.
5. Local dev: forward webhooks with the Vercel CLI / `gh` webhook forward, or just rely on the cron path hit manually.

---

## 7. Next 16 `proxy.ts` middleware — verified integration

Next 16 renamed `middleware.ts` → **`proxy.ts`** (same runtime, same API).
`next-firebase-auth-edge` verifies the session JWT with `jose` (no full Admin
SDK) → runs in the middleware runtime cleanly.

`src/proxy.ts`:
```ts
import { authMiddleware, redirectToLogin } from 'next-firebase-auth-edge';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout'];

export async function proxy(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: '/api/login',
    logoutPath: '/api/logout',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: '__session',
    cookieSignatureKeys: [
      process.env.FIREBASE_AUTH_COOKIE_SECRET_CURRENT!,
      process.env.FIREBASE_AUTH_COOKIE_SECRET_PREVIOUS!,
    ],
    cookieSerializeOptions: {
      path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 12 * 60 * 60,
    },
    serviceAccount: getServiceAccount(),          // from FIREBASE_SERVICE_ACCOUNT_KEY
    handleValidToken: (_tokens, headers) =>
      NextResponse.next({ request: { headers } }),
    handleInvalidToken: async () =>
      redirectToLogin(request, { path: '/login', publicPaths: PUBLIC_PATHS }),
    handleError: async () =>
      redirectToLogin(request, { path: '/login', publicPaths: PUBLIC_PATHS }),
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|brand/|manifest.webmanifest|sw.js|~offline|api/webhooks/|api/cron/).*)',
  ],
};
```

**Why PWA assets and the login flow are not blocked:**
- The `matcher` negative lookahead excludes `_next/static`, `_next/image`, `sw.js`,
  `manifest.webmanifest`, `icons/`, `brand/`, `~offline` → the service worker and
  every precached asset are served with no auth check, so the app **installs and
  boots offline for a visitor who is not yet authenticated**.
- `api/webhooks/` and `api/cron/` are excluded → they authenticate by signature /
  `CRON_SECRET`, not by cookie.
- `/login`, `/api/login`, `/api/logout` are in `publicPaths` → `handleInvalidToken`
  renders them instead of looping the redirect.
- **Login flow:** web SDK `signInWithEmailAndPassword` → `getIdToken()` →
  `POST /api/login` (Route Handler calls the lib's cookie helper, sets `__session`)
  → client `router.replace('/dashboard')`. On that navigation `proxy.ts` sees the
  fresh valid cookie and passes it through.
- **Token refresh:** `authMiddleware` transparently exchanges an expired ID token
  using the refresh token on any matched request and rewrites the cookie — no app
  code, no flash, works the same in the Capacitor WebView.

**Verification (Phase 1 exit check):**
1. Unauthenticated `GET /dashboard` → 307 to `/login`.
2. Unauthenticated `GET /sw.js`, `/manifest.webmanifest`, `/icons/icon-512.png`, `/_next/static/...` → 200 (no redirect).
3. Sign in → cookie set → `GET /dashboard` → 200; `GET /admin` as a client → `notFound()`.
4. Wait past ID‑token expiry (or force it) → next navigation still 200, cookie rotated.
5. `POST /api/webhooks/github` with a valid signature while logged out → 200.

---

## Data model (Firestore) — consolidated

```
users/{uid}              role, clientId, name, email, createdAt
clients/{clientId}       name, logoPath, memberUids[], createdAt
projects/{projectId}     clientId, title, status, summary, milestones[], coverPath, startedAt, updatedAt
deliverables/{id}        projectId, clientId, title, kind (video|image|doc),
                         storagePath, version, status (pending|approved|changes_requested),
                         decidedByUid, decidedAt, fileMeta, createdAt
deliverables/{id}/feedback/{fid}   clientId, projectId, authorUid, authorRole, body,
                                   createdAt, resolved, notified
activity/{id}            clientId, projectId, type, actorUid, summary, createdAt
integrations/**          Developer Pulse mirror (see §6) — admin read, server write only
```
- `clientId` denormalized onto `projects`, `deliverables`, `feedback`, `activity` **and** in the custom claim → every rule check is a token comparison, no `get()`.
- Approvals are fields on the deliverable, not a collection.
- Composite indexes (`firestore.indexes.json`): `deliverables (projectId ASC, createdAt DESC)`, `projects (clientId ASC, updatedAt DESC)`, `activity (clientId ASC, createdAt DESC)`, `integrations/vercel/deployments (project ASC, updatedAt DESC)`.

---

## Email notifications (Resend)

| Trigger | To | Template | Path |
|---|---|---|---|
| Deliverable published / new version | client members | `deliverable-ready` | server action |
| Client posts feedback | studio (`STUDIO_NOTIFY_EMAIL`) | `feedback-posted` | server action, or `/api/notify-pending` on reconnect |
| Client approves / requests changes | studio | `decision-made` | server action, or reconnect route |
| Studio replies to feedback | client members | `feedback-reply` | server action |

Sent after the Firestore write; failures logged, not fatal.

---

## Deployment / env / CI

**Vercel project** ↔ **GitHub repo**: PR → preview URL, `main` → production. Node 24.

**Environment variables** — `.env.example` documents every key:

```
# ---- client (public) ----
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_APP_URL                       # https://portal.voltairstudio.com  (localhost:3000 in dev)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR         # true only in local dev

# ---- server: Firebase / auth ----
FIREBASE_SERVICE_ACCOUNT_KEY             # base64 of the service-account JSON
FIREBASE_AUTH_COOKIE_SECRET_CURRENT      # 32-byte hex
FIREBASE_AUTH_COOKIE_SECRET_PREVIOUS     # 32-byte hex (same as current at start)

# ---- server: emulator wiring (dev only) ----
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199

# ---- email ----
RESEND_API_KEY
EMAIL_FROM="Voltair Studio <hello@voltairstudio.com>"
STUDIO_NOTIFY_EMAIL

# ---- Developer Pulse (blank until that phase) ----
VERCEL_WEBHOOK_SECRET
GITHUB_WEBHOOK_SECRET
VERCEL_API_TOKEN
GITHUB_TOKEN
CRON_SECRET                              # 32-byte hex
```

**`vercel.json`:** security headers on all routes — `Strict-Transport-Security`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, a `Content-Security-Policy` allowing `'self'` +
Firebase/Google endpoints, `Permissions-Policy` locking sensors. Long
cache‑control for `/_next/static`, `/icons`. `crons` entry for reconcile.

**DNS:** `portal.voltairstudio.com` → Vercel (CNAME/A per Vercel's domain UI). The
marketing site adds a "Client Portal" link.

---

## Deliberate simplifications (`ponytail:` ledger)

| Simplification | Ceiling / trigger to upgrade |
|---|---|
| Emails sent inline from server actions + one reconnect route; no Cloud Functions | A missed email causes a real incident → `onDocumentCreated` with retries |
| Webhook handlers write Firestore inline, no queue | Event volume spikes → Vercel Queues, ack immediately |
| 15‑min reconcile cron as the only REST polling | Studio needs sub‑minute freshness → shorten interval or lean on `onSnapshot` |
| No client data‑fetching library (Firestore SDK is the cache) | Non‑Firestore client data appears → add TanStack Query |
| Custom‑claim role staleness = one token refresh | Roles change often → server‑push revalidation |
| Admin uploads go browser → Storage directly | Need server‑side scan / transcode → Storage `onFinalize` function |
| Approvals as fields on the deliverable | Compliance needs an immutable log → `approvals/` collection |
| Dark theme only, no toggle | Client wants light mode → add `[data-theme]` token block |
| `next-firebase-auth-edge` for the cookie/refresh dance | Prefer first‑party only → Firebase Server App + client‑refreshed `__session` (1‑hour token) |

---

## Execution checklist

Rough total: **~2.5–3.5 weeks, one developer** (Developer Pulse adds ~2–3 days over
Revision 1). Faster if brand assets and the Firebase project land during Phase 0.

### Phase 0 — Prerequisites & environment  → **detailed guide below**  (~half a day + user input)

### Phase 1 — Foundation  (~1–1.5 days)
1. `lib/firebase/client.ts` (singleton + `persistentLocalCache` + emulator wiring), `lib/firebase/admin.ts`.
2. `next-firebase-auth-edge`: `auth-config.ts`, `proxy.ts`, `/api/login`, `/api/logout`.
3. `lib/firebase/session.ts`: `getCurrentUser()` (React.cache), `requireClient()`, `requireAdmin()`.
4. Root layout: fonts, dark theme, `globals.css` `@theme` block, SW register component.
5. `shadcn/ui` init + restyle the primitive set.
6. Portal + admin app‑shell layouts and nav.
7. `firebase.json` emulators + `firebase/seed/` script.
8. **Run the §7 `proxy.ts` verification checklist.**

### Phase 2 — Auth & accounts  (~1 day)
1. `/login` page: web‑SDK sign‑in → `POST /api/login` → redirect by role.
2. Admin "create client + members": `createUser` + `setCustomUserClaims` + `users/` + `clients/` docs.
3. Guards verified against the emulator.

### Phase 3 — Projects & dashboard  (~1.5–2 days)
1. `lib/data/projects.ts` typed accessors; `use-firestore-doc.ts` hybrid hook.
2. Client dashboard + project detail (SSR initialData + web‑SDK listener → offline‑capable).
3. Admin Projects CRUD + milestone editor (server actions + zod).

### Phase 4 — Deliverables & storage  (~2 days)
1. Admin upload: web‑SDK resumable upload direct to Storage (admin claim), progress UI; `createDeliverable` server action.
2. `lib/storage.ts`: short‑lived signed download URLs.
3. Deliverable viewer (video/image/pdf), version switcher.
4. `storage.rules` + tests.

### Phase 5 — Approvals & feedback/chat  (~2 days)
1. `feedback` subcollection; `use-feedback-thread.ts` (`onSnapshot` + connection state + offline queue).
2. Client `approve` / `requestChanges` server actions → status + `activity`.
3. Studio replies + admin feedback inbox + resolve.
4. `/api/notify-pending` reconnect route.
5. `firestore.rules` for feedback/approval + the 3 tenant‑isolation tests green.

### Phase 6 — Developer Pulse  (~2–3 days)
1. `lib/integrations/vercel.ts` + `github.ts` — raw‑body signature verify, normalize, idempotent upsert.
2. `/api/webhooks/vercel`, `/api/webhooks/github` route handlers + `revalidateTag('pulse')`.
3. `/api/cron/reconcile-integrations` + `vercel.json` cron + `CRON_SECRET` guard.
4. `lib/data/pulse.ts` + `<PulsePanel>` on the admin overview.
5. `integrations/**` rules + rules test (client denied).
6. Register the webhooks in Vercel + GitHub (§6 setup).

### Phase 7 — Email, PWA, polish  (~2 days)
1. Resend integration at all four trigger points + templates.
2. Serwist SW (`app/sw.ts` via `@serwist/turbopack`), `app/manifest.ts`, `~offline` page, icons.
3. Loading / empty / error / offline states, skeletons, `prefers-reduced-motion`.
4. `vercel.json` security headers + CSP.

### Phase 8 — Test & ship  (~1.5–2 days)
1. Complete rules + unit suites; wire `.github/workflows/ci.yml`.
2. Playwright: the two golden paths against emulator + seed.
3. Merge to `main` → CI deploys rules → Vercel production; point DNS.
4. Production smoke: real client, real deliverable, approve, confirm both emails, confirm a real deploy shows in Developer Pulse. Write the admin section of `README.md`.

---

## Phase 0 — concrete setup guide

### A. Firebase project initialization
1. **Create project** — Firebase console → Add project → `voltair-studio-portal`. Skip Google Analytics.
2. **Auth** — Authentication → Get started → enable **Email/Password** only. Settings → Authorized domains → add `portal.voltairstudio.com` (localhost is there by default).
3. **Firestore** — Firestore Database → Create → **production mode** → location `eur3` (or nearest; permanent).
4. **Storage** — Storage → Get started → production mode → same location.
5. **Web app** — Project settings → General → Your apps → Web (`</>`) → register `portal-web`, **no** Firebase Hosting. Copy the `firebaseConfig` values into `.env.local` (mapping below).
6. **Service account** — Project settings → Service accounts → Generate new private key → download JSON. Base64 it: `base64 -w0 service-account.json` → `FIREBASE_SERVICE_ACCOUNT_KEY`. Do **not** commit the JSON.
7. **CLI link** — `pnpm dlx firebase-tools login`; in the repo `firebase use --add` → pick the project, alias `default`. Commit `.firebaserc`.
8. **Cookie secrets** — run twice:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   → `FIREBASE_AUTH_COOKIE_SECRET_CURRENT` and `_PREVIOUS` (identical value is fine at start).
9. **Resend** — create account, add + verify the sending domain (DNS records), create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM` and `STUDIO_NOTIFY_EMAIL`.

### B. Repo + Next.js scaffold
```
pnpm create next-app@latest voltair-studio-portal \
  --ts --app --tailwind --src-dir --turbopack --import-alias "@/*"
cd voltair-studio-portal
git init && gh repo create voltair-studio/portal --private --source=. --push

pnpm add firebase firebase-admin next-firebase-auth-edge zod resend
pnpm add -D @firebase/rules-unit-testing vitest @vitejs/plugin-react \
           @testing-library/react @playwright/test firebase-tools
pnpm add @serwist/next @serwist/turbopack && pnpm add -D serwist
pnpm dlx shadcn@latest init          # dark, CSS variables; then add the primitive set

firebase init emulators              # Auth 9099, Firestore 8080, Storage 9199, UI on
```
Commit `firebase.json`, `.firebaserc`, `.env.example`.

### C. Local environment variables — `.env.local` (git‑ignored)
```
# ---- client (public) ---- values from step A.5 firebaseConfig
NEXT_PUBLIC_FIREBASE_API_KEY=AIza…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=voltair-studio-portal.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=voltair-studio-portal
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=voltair-studio-portal.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# ---- server ----
FIREBASE_SERVICE_ACCOUNT_KEY=<base64 of service-account.json>
FIREBASE_AUTH_COOKIE_SECRET_CURRENT=<32-byte hex>
FIREBASE_AUTH_COOKIE_SECRET_PREVIOUS=<32-byte hex>

# ---- emulator wiring (only honoured when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true) ----
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199

# ---- email ----
RESEND_API_KEY=re_test_…
EMAIL_FROM="Voltair Studio <hello@voltairstudio.com>"
STUDIO_NOTIFY_EMAIL=studio@voltairstudio.com

# ---- Developer Pulse (leave blank until Phase 6) ----
VERCEL_WEBHOOK_SECRET=
GITHUB_WEBHOOK_SECRET=
VERCEL_API_TOKEN=
GITHUB_TOKEN=
CRON_SECRET=<32-byte hex>
```
`.env.example` = the same keys, values blanked. **Production (Vercel):** same keys
with `NEXT_PUBLIC_APP_URL=https://portal.voltairstudio.com`,
`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`, and **no** `*_EMULATOR_HOST` lines —
added via `vercel env add` or the dashboard.

### D. Env consumption pattern
- `lib/firebase/client.ts` reads only `NEXT_PUBLIC_*`; after `initializeFirestore`,
  `if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') connect*Emulator(...)`.
- `lib/firebase/admin.ts` decodes `FIREBASE_SERVICE_ACCOUNT_KEY`; the Admin SDK
  auto‑detects `*_EMULATOR_HOST` when present — no branching needed.
- A tiny `lib/env.ts` zod‑parses `process.env` once at import so a missing key
  fails the build, not a request.

### E. Phase 0 done‑check
```
firebase emulators:start      # all three emulators boot; UI at :4000
pnpm dev                      # app at :3000, no Firebase init errors in the console
```
Create a user in the Auth‑emulator UI → confirm the scaffold app can read
`NEXT_PUBLIC_*` and the emulator connection logs appear. Phase 1 starts.

---

## Verification (end‑to‑end)

**Local, per phase:** `firebase emulators:start` + `pnpm dev` (emulator flag on) → walk both golden paths by hand.

**Automated:**
```
pnpm lint && pnpm typecheck
firebase emulators:exec "pnpm vitest run"     # rules (incl. the 3 isolation tests) + unit — all green
pnpm exec playwright test                     # client + studio golden paths
pnpm build                                    # clean production build
```
Then Lighthouse → PWA installable + offline shell loads with network throttled to Offline.

**Offline check (explicit):** load a project + a deliverable + its chat while
online → DevTools → Offline → reload → all three still render from
`persistentLocalCache`, `<ConnectionBanner>` shows "offline – showing saved data",
posting feedback shows "pending sync"; back Online → it syncs and the studio email
fires via `/api/notify-pending`.

**Developer Pulse check:** send a signed test payload to `/api/webhooks/github`
and `/api/webhooks/vercel` → the doc appears in `integrations/**` and the admin
panel updates; a client account gets `permission-denied` reading `integrations/`.

**Preview:** Vercel PR preview → sign in with a seeded account, upload a real file,
approve it, confirm the Resend emails land.

**Production:** after DNS resolves, repeat the preview smoke with a real studio
account and a real client, trigger a real deploy and confirm it lands in Developer
Pulse, then hand over the admin guide.

---

## Open items — needed from the user before/at Phase 0

1. Firebase project + service‑account JSON (or Owner access) — or confirm I create it.
2. Brand assets: logo (SVG + PNG), licensed fonts + terms, colour/type spec beyond `#0A0A0A`; confirm the accent direction (token `#C8A96A` is a placeholder).
3. DNS control for `portal.voltairstudio.com`.
4. Resend account + verified sending domain + API key + studio notification address.
5. **Developer Pulse audience** — confirm studio‑only, or specify what clients should see.
6. Which Vercel project(s) and GitHub repo(s) Developer Pulse tracks.
