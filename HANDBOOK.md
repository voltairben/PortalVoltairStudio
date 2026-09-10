# Voltair Studio Portal — Operations Handbook

Everything a studio admin needs to run the portal day to day: first-time setup,
onboarding clients, managing projects and deliverables, keeping Developer Pulse
healthy, and building the native mobile apps.

- **Live app:** https://portalvoltairstudio.vercel.app
- **Repo:** https://github.com/voltairben/PortalVoltairStudio (auto-deploys `main` → Vercel)
- **Firebase project:** `voltairstudio-aa855` (region `eur3`)
- **Architecture:** [`development-plan.md`](./development-plan.md)

---

## 1. Production setup (one time)

### 1.1 Firebase console

1. **Authentication** → Sign-in method → enable **Email/Password**. Enable
   **Google** only if you want the "Continue with Google" button to work.
2. Authentication → **Settings → Authorized domains** → add
   `portalvoltairstudio.vercel.app` (needed for Google sign-in; email/password
   works without it).
3. **Firestore Database** → already created, `eur3`, production mode.
4. **Storage** → already created (`voltairstudio-aa855.firebasestorage.app`).
   New Firebase projects require the **Blaze** (pay-as-you-go) plan before
   Storage will enable — it has a free tier, needs a card on file.
5. **Rules + indexes** — deployed from the repo, not the console. Whenever
   `firebase/firestore.rules`, `firebase/storage.rules`, or
   `firestore.indexes.json` change:
   ```bash
   npx firebase login          # once per machine
   npx firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
   Wait for new composite indexes to finish building (Firestore console →
   Indexes) before the feature that needs them works in production.

### 1.2 Resend (transactional email)

Onboarding emails, "deliverable ready", and decision notifications go through
Resend.

- The API key lives in **Vercel → Project → Settings → Environment Variables**
  as `RESEND_API_KEY` (not in the repo).
- **Until a domain is verified**, `EMAIL_FROM` must be
  `Voltair Studio <onboarding@resend.dev>` and Resend only delivers to the email
  address the Resend account is registered under (`voltairben@gmail.com`).
  Onboarding any other address succeeds (the client + login are created) but the
  email is silently dropped — the onboarding modal always shows the temp password
  on screen, so hand it over directly.
- **To email real clients:** own a domain, then Resend →
  [resend.com/domains](https://resend.com/domains) → Add Domain → paste the SPF +
  DKIM records into the registrar → wait for "Verified" → set Vercel
  `EMAIL_FROM` to `Voltair Studio <hello@yourdomain.com>` → redeploy.

### 1.3 First studio admin

Production has no seed data. Bootstrap the first admin:

1. Firebase console → Authentication → **Add user** (email + password).
2. Grant the claim from a machine with `.env.local`:
   ```bash
   node --env-file=.env.local scripts/set-admin-claim.mjs you@example.com
   ```
   (The script strips emulator env vars so it always targets production.)
3. Sign out / in, then open `/admin`.

> On Windows the Firebase CLI may print
> `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) … async.c line 94`
> **after** it finishes — the work completed, ignore it.

### 1.4 Environment variables (Vercel)

Non-`NEXT_PUBLIC_` values are server-only secrets and never reach the browser
(audited — see §5). Vercel dashboard values take **no surrounding quotes**.

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Web SDK config — public by design (security is in the rules) |
| `NEXT_PUBLIC_APP_URL` | `https://portalvoltairstudio.vercel.app` |
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | Admin SDK service account |
| `COOKIE_SECRET_KEY` | Signs the `__session` cookie (32-byte, comma-separated to rotate) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `STUDIO_NOTIFY_EMAIL` | Email |
| `GITHUB_WEBHOOK_SECRET` | Verifies the GitHub webhook (Developer Pulse) |
| `VERCEL_WEBHOOK_SECRET` | Optional — only if you add a direct Vercel webhook (Pro plan) |
| `GITHUB_TOKEN` | Optional — raises the rate limit on the "Sync deployment status" tool |

**`NEXT_PUBLIC_*` values are inlined into the client bundle at build time** —
after changing one you must redeploy, not just save.

---

## 2. Client onboarding & project operations

### 2.1 Onboard a client

`/admin/clients` → **Onboard client**:

- **Company name** — the client's business name.
- **Client email** — the login is created for this address. It gets `role: client`
  + a `clientId` claim; it can only ever see its own tenant's data.
- **Initial project name** *(optional)* — creates a first project in the same step.

On success the modal shows a **temporary password** — copy it and send it to the
client (the email may not deliver yet, see §1.2). The client signs in at
`portalvoltairstudio.vercel.app`, lands on `/dashboard`, and should change the
password from `/account`.

### 2.2 Archive vs delete a client

Each row in `/admin/clients` has two actions:

- **Archive** ⤵ — hides the client from active pickers, dims the row, fully
  reversible (**Restore**). Use for real clients who go dormant.
- **Delete** 🗑 — type the company name to confirm. **Permanently** removes the
  Auth login(s) and every project, deliverable, comment, and activity record for
  that `clientId`. Use for test data only.

CLI equivalent for bulk cleanup:
`node --env-file=.env.local scripts/delete-client.mjs <clientId | email>`.

### 2.3 Projects & milestones

`/admin/projects` → **New project** (pick the client), then open the project:

- **Project details** — name, description, stage, status, **Vercel preview URL**,
  **GitHub repo** (`owner/repo` — this is also the Developer Pulse match key, §3).
- **Milestone timeline** — add / reorder (▲▼) / cycle status
  (pending → active → complete) / set a target date, then **Save milestones**.
  The client dashboard shows aggregate progress from these.

### 2.4 Upload a deliverable

`/admin/deliverables/upload` (or the **Upload deliverable** button on a project):

1. Pick the project.
2. Choose the file — up to **500 MB**, streamed **directly from your browser to
   Firebase Storage** (nothing passes through the server). Video / image / PDF
   render in the in-app review tools; anything else becomes a download link.
3. Give it a name and an optional version label (`v3`, "Final master", …).
4. Upload — live %, speed, and ETA; **pause / resume / cancel** any time.

On completion the deliverable appears for the client with status **pending** and
a "deliverable ready" email fires (subject to §1.2).

### 2.5 Respond in review threads

Clients comment on individual deliverables and hit **Approve** or **Request
changes**. Two ways to see and reply:

- **`/admin/inbox`** — every comment + decision across all clients, live. Filter
  by status; reply inline (your reply posts as a studio comment and the client's
  thread updates in real time).
- The deliverable's own review page — same thread, full context.

Approving / requesting changes updates the deliverable status and the client's
project view immediately.

---

## 3. Developer Pulse — webhook & deployment-badge maintenance

The client project page shows a **live deployment badge** (Building… / Live
staging preview / Deployment issue) and a **commit / PR timeline**. It reads only
from Firestore — the browser never calls GitHub or Vercel.

### 3.1 How it's wired

```
Vercel deploys ─► posts a deployment_status to GitHub
GitHub push / PR / deployment_status ─► POST /api/webhooks/github
      │ verify x-hub-signature-256 (HMAC-SHA256, constant-time)
      │ match repo ─► project.githubRepo   (URL or owner/repo, case-insensitive)
      ▼
projects/{id}.deployment  +  pulseEvents/{source}_{projectId}_{contentKey}
      ▼
client onSnapshot ─► Developer Pulse UI updates within seconds
```

`pulseEvents` doc ids are content-derived (commit SHA, PR number+verb,
deployment id) — **re-delivering a webhook overwrites, never duplicates.**

### 3.2 One-time webhook setup

GitHub → repo → **Settings → Webhooks → Add webhook**:

- **Payload URL:** `https://portalvoltairstudio.vercel.app/api/webhooks/github`
- **Content type:** `application/json` *(recommended — `x-www-form-urlencoded`
  also works)*
- **Secret:** a strong string → also set it in Vercel env as `GITHUB_WEBHOOK_SECRET`
- **Events:** Pushes, Pull requests, **Deployment statuses**

Then set each project's **GitHub repo** field (`/admin/projects/[id]`). The
`deployment_status` event carries Vercel's build state, so the badge works with
**no Vercel plan upgrade**.

The optional direct Vercel webhook (`/api/webhooks/vercel`, `VERCEL_WEBHOOK_SECRET`)
needs Vercel Pro and only adds build-duration detail.

### 3.3 Troubleshooting

| Symptom | Check |
|---|---|
| Nothing in the client's Developer Pulse | Project's **GitHub repo** field set? GitHub → webhook → **Recent Deliveries** → open one → **Response** tab. `{"skipped":"no project matches this repo"}` = fix the repo field. |
| Deliveries return `401` | `GITHUB_WEBHOOK_SECRET` in Vercel ≠ the webhook's Secret. Re-set both to the same value, redeploy. |
| Deliveries return `503` | `GITHUB_WEBHOOK_SECRET` isn't set in Vercel at all. |
| Badge stuck on "Building…" | A `deployment_status: success` delivery was dropped. Use the reconcile tool ↓. |
| Timeline missing recent commits | They were bot commits or merge commits — filtered on purpose. |
| Everything 200 but empty | Check Vercel **runtime logs** for `[webhook/github]` lines — they say which project matched or why it skipped. |

### 3.4 "Sync deployment status" (manual reconcile)

`/admin/projects/[id]` → **Developer Pulse** card → **Sync deployment status**.

It re-reads the latest deployment state from the **GitHub Deployments API**
(works unauthenticated for public repos; uses `GITHUB_TOKEN` if set for private
repos / higher limits) and updates the badge. If it can't resolve a state, it
**clears** the badge so the next real webhook repopulates it — this is how you
un-stick a badge after a missed delivery.

---

## 4. Native mobile apps (Capacitor — hosted WebView)

The iOS and Android apps are thin native shells that load the **live production
site**. The frontend is never bundled into the app — **shipping a change to the
apps = deploying to Vercel.** No app-store resubmission for content changes.

- `capacitor.config.ts` → `appId: com.voltairstudio.portal`,
  `appName: "Voltair Portal"`, `server.url: https://portalvoltairstudio.vercel.app`,
  `cleartext: false`.
- Status bar overlays the WebView and the keyboard resizes it natively; the app's
  `env(safe-area-inset-*)` CSS (portal + admin layouts, bottom nav) handles
  Dynamic Island / notches / home indicator. `src/components/capacitor-provider.tsx`
  configures the plugins at runtime, only when running inside the native shell.
- The `android/` and `ios/` folders are committed. `native/` is just the splash
  shown before the remote loads (and the offline cold-start fallback).

### 4.1 Requirements

| Platform | Needs |
|---|---|
| Android | Android Studio, JDK 21, Android SDK. Works on Windows/macOS/Linux. |
| iOS | **macOS** + Xcode + CocoaPods (`sudo gem install cocoapods`). No way around it — Apple requires macOS to build and sign. |

**No Mac?** For iOS you have three options: (a) skip the App Store and let iOS
users add the installable PWA to their home screen from Safari (full-screen,
offline, app icon — no store needed); (b) a cloud Mac (MacinCloud ~$1/hr,
MacStadium); (c) a CI macOS runner (GitHub Actions `macos-latest`, Codemagic,
Bitrise) building from signing certs stored as secrets. Android + the PWA cover
most needs on their own.

### 4.0 App icons & splash (done once, or after a brand change)

The Voltair flame is already applied. To regenerate:

```bash
node scripts/generate-app-assets.mjs        # builds ./assets/ from Brand Assets/VoltairLogo1.png
npx @capacitor/assets generate \
  --iconBackgroundColor '#0A0A0A' --iconBackgroundColorDark '#0A0A0A' \
  --splashBackgroundColor '#0A0A0A' --splashBackgroundColorDark '#0A0A0A'
npx cap sync
```

`@capacitor/assets generate` also drops a stray `public/manifest.webmanifest`
with broken icon paths. Delete it — `src/app/manifest.ts` is the real manifest,
and the stray file makes `next dev` throw a 500 on `/manifest.webmanifest`
(it's git-ignored, so it never reaches production).

### 4.2 Build & run

```bash
# from the repo root, after `npm install`

npx cap doctor                 # sanity-check tooling

# push the latest config + plugins into the native projects
npm run cap:sync               # = npx cap sync

# Android — opens Android Studio
npm run cap:android            # = cap sync android && cap open android
#   then: Run ▶ on a device/emulator, or Build → Generate Signed Bundle/APK

# iOS (macOS) — opens Xcode
npm run cap:ios                # = cap sync ios && cap open ios
#   first time on a fresh clone: `cd ios/App && pod install`
#   then: set the Team under Signing & Capabilities, Run ▶,
#   or Product → Archive → Distribute App for the App Store
```

### 4.3 Updating the apps

- **Content / feature change** → merge to `main`, Vercel deploys, the apps pick it
  up on next launch. Nothing to rebuild.
- **Native change** (new Capacitor plugin, icon, splash, permission, app version
  bump) → edit config/native files → `npm run cap:sync` → rebuild in
  Xcode / Android Studio → submit the new binary.
- Bump the app version in `ios/App/App.xcodeproj` (marketing + build number) and
  `android/app/build.gradle` (`versionCode` / `versionName`) before each store
  submission.

### 4.4 App identity & store submission

- **Bundle / package id:** `com.voltairstudio.portal` (must match the App Store
  Connect / Play Console listing).
- **Privacy policy:** hosted at `/privacy` — **fill in the `[BRACKETED]` values
  in `src/app/privacy/page.tsx`** (legal entity, address, KVK, contact email,
  effective date) before submitting. Both stores require the URL.
- **App Store privacy questionnaire** — declare: Contact Info (name, email),
  User Content (files, comments), Identifiers (user ID), Diagnostics (crash/perf
  via hosting logs). Linked to the user, used for App Functionality. No tracking.
- **Play Data Safety form** — same substance: data collected = personal info +
  files + app activity; encrypted in transit; user can request deletion.
- **Accounts:** Apple Developer Program $99/yr · Google Play Console $25 once.
- **Android signing:** generate a keystore in Android Studio's *Generate Signed
  Bundle* wizard and **back it up** — losing it means you can never update the
  app.

---

## 5. Security posture

- **Session:** Firebase ID token → signed, httpOnly, Secure, SameSite `__session`
  cookie (`next-firebase-auth-edge`), auto-refreshed. `src/proxy.ts` redirects
  unauthenticated traffic on `/(portal)` and `/admin` to `/login`.
- **RBAC:** custom claims `{ role: "admin" | "client", clientId }`. Every admin
  page and data accessor calls `requireAdmin()`; the `(admin)` layout gates the
  whole group.
- **Tenant isolation:** `clientId` is denormalized onto every client-facing doc;
  Firestore rules are O(1) `request.auth.token.clientId == resource.data.clientId`
  checks with **no `get()` calls**. Covered by 37 rules tests including
  cross-tenant breach attempts.
- **Rate limiting:** `/api/login` (10 / 5 min / IP) and `/api/refresh-token`
  (20 / min / IP) — in-memory sliding window (`src/lib/rate-limit.ts`), returns
  `429` with `Retry-After`.
- **HTTP headers** (`next.config.ts`): strict `Content-Security-Policy`
  (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`,
  Firebase/Storage/Vercel allowlists), `Strict-Transport-Security`,
  `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` (sensors off).
- **Secrets:** audited — no secret carries a `NEXT_PUBLIC_` prefix, every secret
  env read is inside a `server-only` module / `"use server"` action / route
  handler, and a scan of the built client bundle finds zero secret material. The
  only Firebase values in the bundle are the `NEXT_PUBLIC_FIREBASE_*` web config,
  which is public by design.
- **Storage uploads** go browser → Firebase Storage directly, gated by Storage
  rules (`deliverables/{clientId}/**` writable only by admins).
- **`.env.local`** holds the real service-account key + cookie secret. It is
  git-ignored. **If it leaks:** rotate the service-account key in the Firebase
  console and change `COOKIE_SECRET_KEY` (all sessions invalidate).

---

## 6. Deploy, rollback & incident notes

- **Deploy:** push to `main` → Vercel builds → live in ~2 min. PRs get preview
  URLs.
- **Rollback:** Vercel → Deployments → pick the last good one → **⋯ → Promote to
  Production** (instant). Or `git revert` + push.
- **Firebase rules are separate** — a bad rules deploy is fixed by
  `npx firebase deploy --only firestore:rules` from a known-good checkout.
- **Diagnose production:** Vercel → project → **Logs** / **Runtime Errors**, or
  the Vercel MCP tools. Client-side Firestore errors don't show there — check the
  browser console.
- **Vercel Deployment Protection** must stay **off for production** (or "Only
  Preview Deployments"), otherwise clients hit a Vercel login wall before
  `/login`.

---

## 7. Quick command reference

```bash
npm run dev                 # local dev (needs emulators for Firestore/Storage)
npm run emulators           # Auth + Firestore + Storage emulators (JDK 21)
npm run seed                # seed emulator test data + accounts
npm run build               # production build
npm run test                # full suite (boots emulators): rules + storage + unit
npm run test:unit           # emulator-free subset (signatures, rate-limit, webhook route)
npm run test:rules          # security-rules suite only
npm run cap:sync            # sync config/plugins into android/ + ios/
npm run cap:ios             # cap sync ios && cap open ios   (macOS)
npm run cap:android         # cap sync android && cap open android

npx firebase deploy --only firestore:rules,firestore:indexes,storage
node --env-file=.env.local scripts/set-admin-claim.mjs <email>
node --env-file=.env.local scripts/delete-client.mjs <clientId | email>
```

### E2E verification scripts (need emulators + `npm run seed` + `npm run dev`)

```bash
node --env-file=.env.local scripts/phase3-verify.mjs   # client portal — 13 checks
node --env-file=.env.local scripts/phase4-verify.mjs   # admin ops — 9 checks
node --env-file=.env.local scripts/phase5-verify.mjs   # Developer Pulse — 15 checks
```
