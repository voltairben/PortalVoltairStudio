# Portal Visual Redesign — Design

**Date:** 2026-09-10
**Status:** approved in brainstorm, ready for implementation plan
**Goal:** the client portal should feel like a creative studio made it — not a generic
dark SaaS dashboard — while staying subtle. No loud motion, no texture gimmicks,
no full-bleed drama. The fixes are structural and typographic, plus finally
*showing the work* clients come to review.

Brainstorm mockups: `.superpowers/brainstorm/1168-1789051234/content/` (gitignored).

---

## 1. Typography

Replace **Geist** (Vercel's font — reads "dev tool", adds no personality) with a
serif-display / sans-body pairing. Both are Fontshare, ITF Free Font License
(free for commercial use), **self-hosted** via `next/font/local`.

| Role | Font | Notes |
|---|---|---|
| Headings, page titles, big numbers, deliverable names | **Sentient** (500 / 700) | contemporary "new-age" serif; the studio voice |
| Body, UI, labels, inputs, buttons, tables, metadata | **Satoshi** (400 / 500 / 700) | geometric, crisp, legible at small sizes |
| Timecodes / version labels / dates (optional micro-role) | keep **Geist Mono** | slate / timecode nod; already loaded |

- Download the `.woff2` files from Fontshare into `src/app/fonts/`, wire with
  `next/font/local`, expose as `--font-display` / `--font-sans` in `globals.css`
  `@theme`. Remove the Geist Sans import; keep Geist Mono.
- **Type scale** (rem): 0.6875 / 0.8125 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.5 / 3.25.
  Headings: Sentient 500, tracking `-0.015em` to `-0.025em` as size grows.
  Body: Satoshi 400, line-height 1.6 for paragraphs.
- The marketing site (also Geist today) can adopt the same pairing later — out of
  scope here, but the token names should make that a drop-in.

## 2. Visual principles (apply on every screen)

1. **One persimmon moment per screen.** `#FF4F00` is reserved for the single
   primary action or the one "needs you" signal — not progress bars, not every
   badge, not nav ticks *and* buttons *and* dots. Progress bars go neutral
   (`#3f3f3f` fill on `#1c1c1c`); the bar for a project **waiting on the client**
   is the exception and gets persimmon.
2. **Break the card grid.** Not everything is a `rounded-xl border-zinc-800`
   box. Use dividers, generous whitespace, and full-width lists where content is
   a list. Cards are for things that are genuinely card-shaped (a deliverable, a
   project summary), not for wrapping every section.
3. **Use the canvas.** Content columns widen; lists go full-width; the dashboard
   fills the space instead of a narrow column pinned top-left. Account page gets
   real breathing room, not 5% content in a void.
4. **Show the work.** Every deliverable has a cover image. Small thumbnails as
   you navigate (list ~64px, project strip ~78px, dashboard hero contained
   20:9); one large view only on the review screen itself.
5. **Motion near zero.** One quiet fade/settle on route load. Nothing on scroll.
   Hover transitions stay ≤150ms and subtle.
6. **Palette unchanged.** Obsidian `#0A0A0A` + persimmon `#FF4F00` + existing
   status colors (positive / caution / critical). No new accent, no grain.

## 3. Dashboard — "latest delivery" layout (direction A, toned down)

```
Welcome back, Ada                         ← Sentient 500, ~27px, NOT a headline-sentence
Acme Corp · 2 projects in progress        ← Satoshi, muted

┌───────────────────────────┐  ┌──────────────────┐
│  [cover, contained 20:9]  │  │ NEEDS YOUR       │
│  plain outline play/open  │  │ ATTENTION        │
│  New from Voltair Studio  │  │ 1 to review      │
│  Brand Film — Cut v3      │  │ ──────────────   │
│  [ Open review ]  ← persimmon │ recent activity  │
└───────────────────────────┘  └──────────────────┘

Your projects                             ← full-width list, not cards
──────────────────────────────────────────────────
Brand Film 2026      ▓▓▓▓▓▓░░  4/6   QA    ← this bar persimmon (client's turn)
Marketing Website    ▒▒▒░░░░░  2/5   Development
Q4 Social Campaign   ▒▒▒▒▒▒▒▒  4/4   Complete
```

- **Hero** = the most recent deliverable that is `pending` review. Cover image,
  contained. CTA "Open review" is the screen's persimmon moment.
- **Empty state:** if nothing is pending, the hero shows the most recent
  *delivered* item with a quiet "Approved" note and a neutral "View" link — the
  loud state only appears when it means something.
- **Side panel:** "needs your attention" count + a short recent-activity list
  (approved / studio replied / commented). Read-only.
- **Project list:** full-width rows — name (Sentient) · neutral progress bar ·
  `n/m` · stage tag. The row whose project is awaiting the client gets the
  persimmon bar.

Projects list page, project detail, deliverable review, account: restyled to the
same principles (§2) — dividers over cards, Sentient headings, covers where
deliverables appear, one persimmon moment. Project detail keeps its milestone
rail (already the best component) and Developer Pulse section.

## 4. Deliverables become *sets* (data model change)

Voltair mostly builds **websites**, so the real deliverables are design sets
(multiple page comps) and the live site — not single files.

### Model

```ts
type DeliverableKind = "designs" | "website" | "video" | "document";

interface DeliverableAsset {
  storagePath: string;
  url: string;            // long-lived download URL
  type: "image" | "video" | "pdf";
  label?: string | null;  // "Homepage", "Product page"
}

interface Deliverable {
  // ...existing fields (deliverableId, projectId, clientId, name, version,
  //    versionLabel, status, decidedAt, feedbackCount, createdAt)
  kind: DeliverableKind;
  assets: DeliverableAsset[];   // 1..N
  coverUrl: string | null;      // thumbnail — first asset, studio-chosen, or generated
  siteUrl?: string | null;      // website kind only
}
```

- **Migration:** existing docs have `fileUrl: string` + `fileType`. Backfill:
  `assets = [{ url: fileUrl, type: mapType(fileType), storagePath }]`,
  `kind = fileType === "image" ? "designs" : fileType`, `coverUrl = null`
  (viewer falls back to the first asset while covers are absent). One-off script,
  same pattern as `scripts/` migrations.
- Keep `fileUrl` writes for one release (dual-write) so a rollback is safe, then
  drop it. `ponytail:` if this proves fiddly, hard-cut with the migration script
  and skip dual-write.

### Review screen (§ studio + client)

- Left: a **gallery viewer** — big image, prev/next arrows, thumbnail strip,
  `2 / 4` counter. Replaces the single `ImageViewer` for `designs`; `video` and
  `document` render as today inside the same frame. Bounded max size, framed, not
  full-bleed.
- **Website kind:** cover screenshot + `Open the live site ↗` (persimmon) +
  the URL shown small. No gallery.
- Right: status card + feedback thread — unchanged, plus:
  - Comments carry an optional `assetIndex` — "pinned to page 2" vs "general".
    Composer shows "Comment on page 2…" when a specific asset is in view.
    `ponytail:` if per-asset pinning balloons scope, ship comments as
    deliverable-level only (as today) and add `assetIndex` in a follow-up.

### Covers / thumbnails

| Kind | Cover source |
|---|---|
| designs | first asset, or studio picks one during upload |
| video | first frame captured client-side (`<video>` → `<canvas>` → upload) at upload time |
| document | first page via pdf.js (already a dep) → canvas → upload; fallback = typographic card |
| website | **studio uploads a screenshot** when marking the build delivered. `ponytail:` auto-capture via a Vercel Puppeteer function later — manual is fine at studio scale. |

### Upload flow

`deliverable-upload.tsx` becomes multi-file: drop several images → they become
one `designs` deliverable; reorder; mark one as cover. A separate "Deliver a
build" action for `website` (name + staging URL + a screenshot upload).

## 5. Phasing

**Phase A — Typography + visual polish. No data changes. Ships first.**
Fonts, `@theme` tokens, type scale, the six principles, dashboard layout A
(hero uses whatever cover/first-asset exists), restyle every screen. ~1–1.5 days.
This alone resolves "it looks bland".

**Phase B — Deliverables as sets.** Model change + migration, gallery viewer,
multi-file upload, covers for image/video/pdf, covers shown in list / project /
dashboard. ~2–3 days.

**Phase C — Website deliverable.** `website` kind, "Deliver a build" action,
manual screenshot cover, "Open the live site". ~1 day.

**Phase D — Pinned comments** (`assetIndex`). Optional / later.

## 6. Out of scope

- Marketing-site redesign (fonts are token-compatible for a later drop-in).
- Auto website screenshots (manual cover; automate later).
- Light theme.
- Any change to auth, RBAC, Firestore rules structure, or the tenant model.
- New palette colors / textures / decorative gradients.

## 7. Testing

- Phase A: `phase3-verify` (client) + `phase4-verify` (admin) must stay green;
  add a check that fonts load and no CLS on the dashboard hero.
- Phase B: migration script has a dry-run + assert; gallery viewer unit test
  (arrow nav, cover fallback); E2E — upload a 3-image set, client pages through,
  approves.
- Phase C: E2E — studio delivers a build, client sees screenshot + opens URL.
