# Portal Visual Redesign — Phase B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliverables become *sets* — a design deliverable can hold multiple images with a gallery viewer, every deliverable gets a real cover thumbnail (video: a captured first frame; PDF: a plain typographic card, no thumbnail), and covers show up everywhere a deliverable is listed.

**Architecture:** Add `kind` / `assets[]` / `coverUrl` to `Deliverable`, written by all new deliverables. No migration script — a single `normalizeDeliverable()` function (client- and server-safe, no framework imports) synthesizes the new shape from the legacy `fileUrl`/`fileType` for any doc that predates this change, applied at every read site. A new `GalleryViewer` replaces the single-image viewer when a deliverable has more than one image asset; video/PDF/single-image deliverables render exactly as before.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase (Admin SDK server reads, Web SDK client reads/uploads), Tailwind v4. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-10-portal-visual-redesign-design.md` (§4, §5 Phase B), superseded in two places by decisions made when this plan was written (see Deviations below).

## Deviations from the spec (decided before writing this plan)

- **No migration script.** The spec asked for a one-off backfill job. There is no real production deliverable data yet (only seed/test data), so a batch migration has near-zero value today and real risk (a script that mutates every deliverable doc). `normalizeDeliverable()` (Task 1) handles old-shaped docs permanently at read time instead — simpler, and it doesn't stop working after "one release" the way the spec's dual-write plan implied.
- **No PDF thumbnail.** The spec assumed pdf.js was already a dependency — it isn't; the current `PdfViewer` is a plain `<iframe>`. Building a real first-page thumbnail means adding `pdfjs-dist`. Decided against it: PDFs are a minor deliverable type for this studio (briefs, specs), so `document`-kind deliverables get `coverUrl: null` and keep showing the existing file-type icon. Revisit if PDFs become a bigger part of the work.
- **`website` kind is type-only this phase.** The union includes `"website"` and `Deliverable.siteUrl` exists on the type, but no upload UI or rendering path for it — that's Phase C, a separate plan.
- **No comment pinning (`assetIndex`).** Per the spec's own permission to defer this — Phase D, not started.

## Global Constraints

- Tailwind is CSS-first (`@theme` in `src/app/globals.css`); no `tailwind.config.js`.
- No React component-test framework (established in the Phase A plan — the repo has none; `@testing-library/react` intentionally not added). New components are verified via `phase3-verify.mjs` / `phase4-verify.mjs` (extended) + `npm run build` + manual screenshots. Pure logic (`normalizeDeliverable`) gets a Node-env `*.test.ts`.
- `normalizeDeliverable()` must have **zero server-only or client-only imports** — it runs inside Admin SDK server code (`lib/data/*.ts`) and inside a Web SDK `onSnapshot` callback in a client component (`studio-inbox.tsx`). A stray `"server-only"` import anywhere in its module graph breaks the client usage.
- Firestore/Storage rules are unchanged — `deliverables` rules already gate on `clientId`/role only, never on document shape, so adding fields needs no rules change. Do not touch `firebase/firestore.rules` or `firebase/storage.rules` in this plan.
- No new npm dependencies.
- Executed on a new branch off `main` (which now includes Phase A) — never build multi-commit work directly on `main`. Branch: `redesign/portal-phase-b`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. `.claude/` and `.codex/` stay unstaged.

---

## File Structure

**Created:**
- `src/lib/deliverable-utils.ts` — `normalizeDeliverable()`, `mapLegacyFileType()`, `DELIVERABLE_KIND_LABEL`
- `src/lib/deliverable-utils.test.ts` — normalizer tests
- `src/components/review/gallery-viewer.tsx` — multi-image viewer (arrows, thumbnail strip, counter)
- `src/components/admin/video-frame-capture.ts` — client-side `<video>` → canvas → Blob first-frame capture helper

**Modified:**
- `src/types/deliverable.ts` — `DeliverableKind`, `DeliverableAsset`, `Deliverable` gains `kind` / `assets` / `coverUrl` / `siteUrl?`
- `src/lib/validation/schemas.ts` — `deliverableAssetSchema`, `deliverableKindSchema`; `createDeliverableInputSchema` rewritten around `assets[]`
- `src/lib/data/portal.ts` — `getDeliverables`, `getDeliverable`, `getClientDeliverables` normalize on read
- `src/lib/data/admin.ts` — `getStudioMetrics`, `getAdminProject`, `getAdminDeliverableReview`, `getAllDeliverables`, `getInboxData` normalize on read
- `src/components/admin/studio-inbox.tsx` — the `onSnapshot` deliverables listener normalizes each doc
- `src/lib/actions/deliverables.ts` — `createDeliverable` accepts `assets[]` + `kind`, derives legacy `fileUrl`/`fileType` for dual-write
- `src/components/admin/deliverable-upload.tsx` — multi-image selection → one `designs` deliverable; video capture wired in; single-file path unchanged for video/pdf/single-image
- `src/components/review/deliverable-review.tsx` — routes to `GalleryViewer` when `assets.length > 1`
- `src/components/portal/deliverable-grid.tsx` — shows `coverUrl` as a real thumbnail when present
- `src/components/portal/latest-delivery-hero.tsx` — uses `coverUrl` instead of raw `fileUrl`/`fileType`
- `firebase/seed/seed.mjs` — one seeded deliverable becomes a 3-image `designs` set so the gallery has something real to show in dev
- `scripts/phase3-verify.mjs` / `scripts/phase4-verify.mjs` — new checks

---

## Task 1: `normalizeDeliverable()` + extended types

**Files:**
- Modify: `src/types/deliverable.ts`
- Create: `src/lib/deliverable-utils.ts`
- Create: `src/lib/deliverable-utils.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DeliverableAssetType = "image" | "video" | "pdf";
  export type DeliverableKind = "designs" | "website" | "video" | "document";

  export interface DeliverableAsset {
    storagePath: string;
    url: string;
    type: DeliverableAssetType;
    label?: string | null;
  }

  // Deliverable (in src/types/deliverable.ts) gains:
  //   kind: DeliverableKind;
  //   assets: DeliverableAsset[];   // always >= 1 after normalizeDeliverable()
  //   coverUrl: string | null;
  //   siteUrl?: string | null;      // website kind only, unused this phase

  export function normalizeDeliverable(raw: Deliverable): Deliverable;
  ```
  `normalizeDeliverable` is idempotent: a doc that already has a non-empty `assets` array is returned unchanged (aside from defaulting `coverUrl`/`siteUrl` if absent); a doc without one is synthesized from `fileUrl`/`fileType`.

- [ ] **Step 1: Extend the types**

`src/types/deliverable.ts` — replace the whole file:

```ts
export type DeliverableFileType = "video" | "image" | "document" | "other";
export type DeliverableStatus = "pending" | "approved" | "changes-requested";
export type DeliverableAssetType = "image" | "video" | "pdf";
export type DeliverableKind = "designs" | "website" | "video" | "document";

export interface DeliverableAsset {
  storagePath: string;
  url: string;
  type: DeliverableAssetType;
  label?: string | null;
}

export interface Deliverable {
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  /** @deprecated kept for backward compatibility with pre-sets deliverables; use `assets`. */
  fileUrl: string;
  /** @deprecated kept for backward compatibility with pre-sets deliverables; use `kind`. */
  fileType: DeliverableFileType;
  kind: DeliverableKind;
  /** 1..N. Always non-empty after `normalizeDeliverable()`. */
  assets: DeliverableAsset[];
  /** Thumbnail — first asset for `designs`, a captured frame for `video`, null for `document`/unset `website`. */
  coverUrl: string | null;
  /** `website` kind only. */
  siteUrl?: string | null;
  /** Numeric version for ordering. */
  version: number;
  /** Free-form label shown to the client, e.g. "v2.1". Falls back to `v{version}`. */
  versionLabel: string | null;
  status: DeliverableStatus;
  feedbackCount: number;
  /** When the client last approved / requested changes. */
  decidedAt: string | null;
  createdAt: string; // ISO 8601
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/deliverable-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeDeliverable } from "./deliverable-utils";
import type { Deliverable } from "@/types";

const base = {
  deliverableId: "d1",
  projectId: "p1",
  clientId: "c1",
  name: "Old-shaped deliverable",
  version: 1,
  versionLabel: "v1",
  status: "pending",
  feedbackCount: 0,
  decidedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
} as const;

describe("normalizeDeliverable", () => {
  it("synthesizes assets from fileUrl/fileType when assets is missing (legacy doc)", () => {
    const legacy = { ...base, fileUrl: "https://x/y.png", fileType: "image" } as Deliverable;
    const n = normalizeDeliverable(legacy);
    expect(n.kind).toBe("designs");
    expect(n.assets).toEqual([{ storagePath: "", url: "https://x/y.png", type: "image", label: null }]);
    expect(n.coverUrl).toBe("https://x/y.png");
  });

  it("maps video/document fileTypes to the matching kind and asset type", () => {
    const video = { ...base, fileUrl: "https://x/v.mp4", fileType: "video" } as Deliverable;
    expect(normalizeDeliverable(video).kind).toBe("video");
    expect(normalizeDeliverable(video).assets[0].type).toBe("video");

    const doc = { ...base, fileUrl: "https://x/d.pdf", fileType: "document" } as Deliverable;
    expect(normalizeDeliverable(doc).kind).toBe("document");
    expect(normalizeDeliverable(doc).assets[0].type).toBe("pdf");
    expect(normalizeDeliverable(doc).coverUrl).toBeNull();
  });

  it("leaves an already-normalized doc's assets untouched", () => {
    const modern = {
      ...base,
      fileUrl: "https://x/a.png",
      fileType: "image",
      kind: "designs",
      assets: [
        { storagePath: "s/a.png", url: "https://x/a.png", type: "image", label: "Homepage" },
        { storagePath: "s/b.png", url: "https://x/b.png", type: "image", label: "Product page" },
      ],
      coverUrl: "https://x/a.png",
    } as Deliverable;
    const n = normalizeDeliverable(modern);
    expect(n.assets).toHaveLength(2);
    expect(n.assets[1].label).toBe("Product page");
  });

  it("is idempotent", () => {
    const legacy = { ...base, fileUrl: "https://x/y.png", fileType: "image" } as Deliverable;
    const once = normalizeDeliverable(legacy);
    const twice = normalizeDeliverable(once);
    expect(twice).toEqual(once);
  });
});
```

- [ ] **Step 3: Run it, verify it fails**

Run: `npx vitest run --project unit src/lib/deliverable-utils.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`src/lib/deliverable-utils.ts` (no `"use client"`, no `"server-only"` — must run in both worlds):

```ts
import type {
  Deliverable,
  DeliverableAsset,
  DeliverableAssetType,
  DeliverableFileType,
  DeliverableKind,
} from "@/types";

const FILE_TYPE_TO_KIND: Record<DeliverableFileType, DeliverableKind> = {
  image: "designs",
  video: "video",
  document: "document",
  other: "document",
};

const FILE_TYPE_TO_ASSET_TYPE: Record<DeliverableFileType, DeliverableAssetType> = {
  image: "image",
  video: "video",
  document: "pdf",
  other: "pdf",
};

export function mapLegacyFileType(fileType: DeliverableFileType): {
  kind: DeliverableKind;
  assetType: DeliverableAssetType;
} {
  return { kind: FILE_TYPE_TO_KIND[fileType], assetType: FILE_TYPE_TO_ASSET_TYPE[fileType] };
}

/**
 * Every deliverable read from Firestore (Admin SDK or Web SDK) must pass
 * through this before a component sees it. A doc written by the pre-sets
 * upload flow has no `assets` — synthesize one from `fileUrl`/`fileType` so
 * old and new deliverables are indistinguishable to the rest of the app.
 * Idempotent: a doc that already has `assets` is returned with only the
 * optional fields defaulted.
 */
export function normalizeDeliverable(raw: Deliverable): Deliverable {
  if (raw.assets?.length) {
    return {
      ...raw,
      coverUrl: raw.coverUrl ?? null,
      siteUrl: raw.siteUrl ?? null,
    };
  }

  const { kind, assetType } = mapLegacyFileType(raw.fileType);
  const asset: DeliverableAsset = {
    storagePath: "",
    url: raw.fileUrl,
    type: assetType,
    label: null,
  };

  return {
    ...raw,
    kind,
    assets: [asset],
    coverUrl: kind === "designs" ? raw.fileUrl : kind === "video" ? null : null,
    siteUrl: null,
  };
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run --project unit src/lib/deliverable-utils.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: FAILS at this point — every `Deliverable` object literal in `src/lib/actions/deliverables.ts` (the two places that build one) and `firebase/__tests__/helpers.ts`'s `deliverableDoc()` now needs `kind` / `assets` / `coverUrl`. That's expected; Task 6 and the seed/test data fix it. Do not chase these errors yet — confirm the list matches those two files (`grep -n "Property .kind. is missing" ` isn't available from tsc directly; just read the error list) and move to Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/types/deliverable.ts src/lib/deliverable-utils.ts src/lib/deliverable-utils.test.ts
git commit -m "$(printf 'feat(deliverables): DeliverableKind/assets/coverUrl + normalizeDeliverable\n\nNo migration script — normalizeDeliverable() synthesizes the new shape from\nthe legacy fileUrl/fileType for any doc that predates this, applied at every\nread site (Task 2). Framework-agnostic on purpose: it runs inside both Admin\nSDK server reads and a Web SDK onSnapshot callback.\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 2: Normalize every deliverable read site

**Files:**
- Modify: `src/lib/data/portal.ts`, `src/lib/data/admin.ts`, `src/components/admin/studio-inbox.tsx`

**Interfaces:**
- Consumes: `normalizeDeliverable` (Task 1).
- Produces: no signature changes — every exported function that returns `Deliverable`/`Deliverable[]` now returns fully-normalized objects.

- [ ] **Step 1: `src/lib/data/portal.ts`**

Three call sites, each wraps the existing `.data() as Deliverable` cast:

```ts
// getDeliverables(projectId, clientId) — was: snap.docs.map((d) => d.data() as Deliverable)
return snap.docs.map((d) => normalizeDeliverable(d.data() as Deliverable));

// getDeliverable(deliverableId, clientId) — was: const deliverable = snap.data() as Deliverable;
const deliverable = normalizeDeliverable(snap.data() as Deliverable);

// getClientDeliverables(clientId) — was: .map((d) => d.data() as Deliverable).sort(...)
return snap.docs
  .map((d) => normalizeDeliverable(d.data() as Deliverable))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
```

Add the import: `import { normalizeDeliverable } from "@/lib/deliverable-utils";`

- [ ] **Step 2: `src/lib/data/admin.ts`**

Five call sites — same wrap-the-cast pattern:
- `getStudioMetrics`: `const dels = deliverables.docs.map((d) => normalizeDeliverable(d.data() as Deliverable));`
- `getAdminProject`: `deliverables: delSnap.docs.map((d) => normalizeDeliverable(d.data() as Deliverable)).sort(byCreatedDesc),`
- `getAdminDeliverableReview`: `const deliverable = normalizeDeliverable(delSnap.data() as Deliverable);`
- `getAllDeliverables`: wrap whatever the existing `.map((d) => d.data() as Deliverable)` at line 200 does before its subsequent `.map`/spread that attaches `projectName`/`clientName` (normalize first, then decorate).
- `getInboxData`: `deliverables: deliverables.docs.map((d) => normalizeDeliverable(d.data() as Deliverable)),`

Add the import: `import { normalizeDeliverable } from "@/lib/deliverable-utils";`

- [ ] **Step 3: `src/components/admin/studio-inbox.tsx`**

The live listener:

```ts
const unsubDeliverables = onSnapshot(
  collection(db, COLLECTIONS.deliverables),
  (snap) => setDeliverables(snap.docs.map((d) => normalizeDeliverable(d.data() as Deliverable))),
  () => {},
);
```

Add the import: `import { normalizeDeliverable } from "@/lib/deliverable-utils";`. This is the one call that runs in the browser — it is why Task 1's implementation has zero `"server-only"`/`"use client"` markers of its own.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: the read-site errors from Task 1 Step 6 are gone. Remaining errors should be exactly the two "object literal missing kind/assets/coverUrl" sites in `src/lib/actions/deliverables.ts` (fixed in Task 6) and `firebase/__tests__/helpers.ts` (fixed in Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/portal.ts src/lib/data/admin.ts src/components/admin/studio-inbox.tsx
git commit -m "$(printf 'feat(deliverables): normalize every read site (server + the one client listener)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 3: `GalleryViewer` component

**Files:**
- Create: `src/components/review/gallery-viewer.tsx`

**Interfaces:**
- Consumes: `DeliverableAsset[]` from `@/types`.
- Produces:
  ```ts
  export function GalleryViewer(props: { assets: DeliverableAsset[]; name: string }): JSX.Element
  ```
  Big framed image (same `min-h-[60vh]` reservation as the existing `ImageViewer`, bounded, not full-bleed), prev/next arrow buttons (hidden at the ends — no wraparound), a `2 / 4` counter, and a thumbnail strip below. Clicking a thumbnail jumps to that asset. Non-image assets in the array (shouldn't normally happen for a `designs` deliverable, but the type allows it) render as a plain "Open file" link in place of the image. Keyboard: left/right arrow keys navigate when the component has focus.

- [ ] **Step 1: Implement**

```tsx
"use client";

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DeliverableAsset } from "@/types";

export function GalleryViewer({ assets, name }: { assets: DeliverableAsset[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = assets[index];
  const canPrev = index > 0;
  const canNext = index < assets.length - 1;

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && canPrev) setIndex((i) => i - 1);
        if (e.key === "ArrowRight" && canNext) setIndex((i) => i + 1);
      }}
      className="outline-none"
    >
      <div className="relative min-h-[60vh] overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
        {current.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.label ?? `${name} — page ${index + 1}`}
            decoding="async"
            className="mx-auto max-h-[68vh] w-auto object-contain"
          />
        ) : (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[60vh] items-center justify-center gap-2 text-[13px] text-ink-muted hover:text-ink"
          >
            <Download className="size-4" />
            Open {current.label ?? name}
          </a>
        )}

        {canPrev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-black/60 text-ink backdrop-blur transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        {canNext && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-black/60 text-ink backdrop-blur transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
        <span className="tnum absolute bottom-3 right-3 rounded-md border border-zinc-700 bg-black/60 px-2 py-1 text-[11px] text-ink-muted backdrop-blur">
          {index + 1} / {assets.length}
        </span>
      </div>

      {assets.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {assets.map((a, i) => (
            <button
              key={a.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${a.label ?? `page ${i + 1}`}`}
              aria-current={i === index}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-md border object-cover transition-opacity",
                i === index ? "border-brand-persimmon" : "border-zinc-800 opacity-60 hover:opacity-100",
              )}
            >
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-surface-2 text-[10px] text-ink-subtle">
                  file
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean (component isn't wired in yet, but must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/review/gallery-viewer.tsx
git commit -m "$(printf 'feat(review): GalleryViewer — multi-image deliverable viewer\n\nArrows + thumbnail strip + counter, bounded and framed like the existing\nImageViewer. Not wired into DeliverableReview yet (Task 5).\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 4: Video first-frame capture

**Files:**
- Create: `src/components/admin/video-frame-capture.ts`

**Interfaces:**
- Produces:
  ```ts
  export function captureVideoFrame(file: File): Promise<Blob | null>
  ```
  Loads the video file into an offscreen `<video>` element, seeks to 10% of its duration (or 1s, whichever is smaller — most deliverables open on a title card at 0:00), draws that frame to a canvas, and resolves a JPEG `Blob` (or `null` if anything about the video fails to load — callers must treat a `null` cover as "no cover", not an error).

- [ ] **Step 1: Implement**

```ts
/**
 * Client-side only — call from a browser event handler, not during SSR.
 * Never throws: a video that fails to decode (unsupported codec, corrupt
 * file) resolves `null` and the deliverable simply ships without a cover.
 */
export function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.addEventListener("error", fail, { once: true });

    video.addEventListener(
      "loadedmetadata",
      () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return fail();
        video.currentTime = Math.min(1, video.duration * 0.1);
      },
      { once: true },
    );

    video.addEventListener(
      "seeked",
      () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0 || canvas.height === 0) return fail();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.85,
        );
      },
      { once: true },
    );
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (not wired in yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/video-frame-capture.ts
git commit -m "$(printf 'feat(upload): captureVideoFrame — client-side first-frame cover capture\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 5: Wire the gallery into `DeliverableReview`

**Files:**
- Modify: `src/components/review/deliverable-review.tsx`

**Interfaces:**
- Consumes: `GalleryViewer` (Task 3), `deliverable.kind`/`.assets` (Task 1).

- [ ] **Step 1: Read the current file, then change the viewer switch**

Replace the block that currently renders `VideoPlayer` / `ImageViewer` / `PdfViewer` / the "other" download link based on `deliverable.fileType` with a switch on `deliverable.kind`, using the **first** asset for single-asset kinds and `GalleryViewer` when there's more than one:

```tsx
{deliverable.kind === "designs" && deliverable.assets.length > 1 ? (
  <GalleryViewer assets={deliverable.assets} name={deliverable.name} />
) : deliverable.assets[0]?.type === "video" ? (
  <VideoPlayer src={deliverable.assets[0].url} />
) : deliverable.assets[0]?.type === "image" ? (
  <ImageViewer src={deliverable.assets[0].url} alt={deliverable.name} />
) : deliverable.assets[0]?.type === "pdf" ? (
  <PdfViewer src={deliverable.assets[0].url} name={deliverable.name} />
) : (
  <a
    href={deliverable.fileUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-surface-1 px-4 py-16 text-[13px] text-ink-muted transition-colors hover:border-brand-persimmon hover:text-ink"
  >
    <Download className="size-4" />
    Download {deliverable.name}
  </a>
)}
```

Import `GalleryViewer` the same lazy way as the other three viewers (`next/dynamic`, `ssr: false`, the existing `ViewerSkeleton` loading fallback) — it only needs to reach the browser when a `designs` deliverable with 2+ assets is actually open.

- [ ] **Step 2: Build + screenshot**

```bash
npx tsc --noEmit && npm run build
```
Expected: clean. Manual check comes in Task 9 once the seed data has a real multi-image deliverable to open.

- [ ] **Step 3: Commit**

```bash
git add src/components/review/deliverable-review.tsx
git commit -m "$(printf 'feat(review): DeliverableReview routes to GalleryViewer for multi-image sets\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 6: Upload flow — `assets[]`, multi-image sets, video covers

**Files:**
- Modify: `src/lib/validation/schemas.ts`, `src/lib/actions/deliverables.ts`, `src/components/admin/deliverable-upload.tsx`

**Interfaces:**
- Consumes: `captureVideoFrame` (Task 4), `DeliverableAsset`/`DeliverableKind` (Task 1).
- Produces: `createDeliverable` now takes `{ projectId, clientId, name, version, versionLabel, milestoneId, kind, assets, coverUrl }` — the caller (`DeliverableUpload`) builds `assets[]` itself; the action derives legacy `fileUrl = assets[0].url` / `fileType` for dual-write.

- [ ] **Step 1: New schemas in `src/lib/validation/schemas.ts`**

Add, near `deliverableSchema`:

```ts
export const deliverableAssetTypeSchema = z.enum(["image", "video", "pdf"]);
export const deliverableKindSchema = z.enum(["designs", "website", "video", "document"]);

export const deliverableAssetSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  type: deliverableAssetTypeSchema,
  label: z.string().min(1).nullable().optional(),
});
```

Replace `createDeliverableInputSchema`:

```ts
export const createDeliverableInputSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  kind: deliverableKindSchema,
  assets: z.array(deliverableAssetSchema).min(1).max(20),
  coverUrl: z.string().url().nullable(),
  version: z.number().int().positive().max(999),
  versionLabel: z.string().trim().min(1).max(20),
  milestoneId: z.string().min(1).nullable().optional(),
});
export type CreateDeliverableInput = z.infer<typeof createDeliverableInputSchema>;
```

- [ ] **Step 2: `createDeliverable` in `src/lib/actions/deliverables.ts`**

Replace the deliverable object construction:

```ts
const legacyType: Record<(typeof d.assets)[number]["type"], Deliverable["fileType"]> = {
  image: "image",
  video: "video",
  pdf: "document",
};

const ref = adminDb.collection(COLLECTIONS.deliverables).doc();
const now = new Date().toISOString();
const deliverable: Deliverable = {
  deliverableId: ref.id,
  projectId: d.projectId,
  clientId: d.clientId,
  name: d.name,
  fileUrl: d.assets[0].url,
  fileType: legacyType[d.assets[0].type],
  kind: d.kind,
  assets: d.assets,
  coverUrl: d.coverUrl,
  version: d.version,
  versionLabel: d.versionLabel,
  status: "pending",
  feedbackCount: 0,
  decidedAt: null,
  createdAt: now,
};
await ref.set({ ...deliverable, milestoneId: d.milestoneId ?? null });
```

(Drop the old `storagePath: d.storagePath` top-level field on the write — `storagePath` now lives per-asset inside `assets[]`. Nothing else reads a top-level `storagePath`; confirm with `grep -rn "\.storagePath" src` before deleting the line — if something does, keep writing it as `d.assets[0].storagePath` for compatibility.)

- [ ] **Step 3: `DeliverableUpload` — accept multiple files for images, capture a video cover**

Read the current file fully before editing (it has the resumable single-file pause/resume/speed UI — preserve that for the single-file path). Changes:

1. The file `<input>` gains `multiple`; `pickFile` becomes `pickFiles(files: FileList | null)`.
2. **Selection rule:** if every selected file is an image and there are 2+, treat them as one `designs` set. Otherwise (1 file of any type, or a mixed/non-image multi-select — reject the multi-select with `fileError = "Select multiple files only when they're all images."`), keep exactly today's single-file behavior.
3. **Single-file path (video/pdf/single-image):** after `getDownloadURL`, build `assets: [{ storagePath: path, url: fileUrl, type: <mapped>, label: null }]`, `kind` per Task 1's `mapLegacyFileType` logic (reuse it — import from `@/lib/deliverable-utils`), and `coverUrl`:
   - image → `fileUrl`
   - video → **before** calling `createDeliverable**, run `captureVideoFrame(file)`; if it resolves a `Blob`, upload it to `${path}-cover.jpg` via `uploadBytes` (not resumable — it's small) and use its download URL as `coverUrl`; if it resolves `null`, `coverUrl: null`
   - pdf/other → `coverUrl: null`
4. **Multi-image path:** upload each file sequentially with `uploadBytesResumable` reusing the existing per-file progress state shape, but track overall progress as `"Uploading N of M"` rather than per-file speed/ETA (the existing speed/ETA sampling stays only on the single-file path). After all uploads finish, call `createDeliverable` once with `kind: "designs"`, `assets` = all uploaded assets in selection order, `coverUrl` = the first asset's URL.
5. Update the dropzone copy: `"Drop one file, or several images for a design set"`.

This step has no single code block — the file is ~380 lines with real state machine logic (`Phase` union, `taskRef`, `sampleRef`) that must stay intact for the single-file path. Implement the above directly in the file, keeping every existing single-file behavior (pause/resume/cancel/error/reset) working exactly as today; add the multi-image branch alongside it, not instead of it.

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean. This is also where the Task 1 Step 6 "object literal missing kind/assets/coverUrl" error in this file should disappear.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/schemas.ts src/lib/actions/deliverables.ts src/components/admin/deliverable-upload.tsx
git commit -m "$(printf 'feat(upload): assets[]-based createDeliverable, multi-image sets, video covers\n\nSingle file (video/pdf/single image) keeps today'"'"'s exact upload UX. Selecting\n2+ images bundles them into one "designs" deliverable. Video uploads capture a\nfirst-frame cover client-side; a failed capture ships with no cover rather\nthan blocking the upload.\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 7: Show covers wherever deliverables are listed

**Files:**
- Modify: `src/components/portal/deliverable-grid.tsx`, `src/components/portal/latest-delivery-hero.tsx`

**Interfaces:**
- Consumes: `deliverable.coverUrl` (Task 1).

- [ ] **Step 1: `DeliverableGrid`**

Add a cover thumbnail above the existing icon/name/badge block, replacing the plain icon-only header when a cover exists:

```tsx
{d.coverUrl ? (
  <div className="-mx-4 -mt-4 mb-3 aspect-video overflow-hidden rounded-t-xl border-b border-zinc-800 bg-surface-2">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={d.coverUrl} alt="" className="size-full object-cover" loading="lazy" />
  </div>
) : null}
<div className="flex items-center justify-between">
  <span className="grid size-9 place-items-center rounded-lg border border-zinc-800 bg-surface-2 text-ink-muted transition-colors group-hover:text-brand-persimmon">
    <FileTypeIcon type={d.fileType} className="size-4" />
  </span>
  ...
```

(The existing icon badge stays even when a cover shows — it doubles as a file-kind indicator over the thumbnail. Adjust the card's `p-4` padding interaction with the `-mx-4 -mt-4` cover so the cover reaches the card's edges while the rest of the content keeps its padding — this is the same "bleed a cover to the card edge, pad everything else" pattern; verify visually in Task 9, not by reasoning about the CSS alone.)

- [ ] **Step 2: `LatestDeliveryHero`**

Simplify the `Cover` sub-component to use `coverUrl` directly instead of checking `fileType === "image"` against `fileUrl`:

```tsx
function Cover({ d }: { d: Deliverable }) {
  return (
    <div className="brand-glow relative flex aspect-[20/9] w-full items-center justify-center bg-surface-2">
      <Flame className="size-8 text-brand-persimmon/70" />
      {d.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
}
```

This is a strict improvement over the Phase A version (which only showed a cover for `fileType === "image"`) — video deliverables with a captured frame now show a real cover in the hero too.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/deliverable-grid.tsx src/components/portal/latest-delivery-hero.tsx
git commit -m "$(printf 'feat(portal): show real cover thumbnails in the deliverable grid and dashboard hero\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 8: Seed data — a real multi-image set to test against

**Files:**
- Modify: `firebase/seed/seed.mjs`
- Modify: `firebase/__tests__/helpers.ts` (only if Task 1 Step 6 / Task 2 Step 4 tsc errors point here — the fixture's `deliverableDoc()` helper builds a plain object literal used only by rules tests, which read raw docs and never call `normalizeDeliverable`, so it likely does NOT need updating; check with `npx tsc --noEmit` before touching it)

- [ ] **Step 1: Read `firebase/seed/seed.mjs`'s deliverable-seeding section, then change one deliverable into a `designs` set**

Turn the existing "Homepage design — round 1" (or equivalent image deliverable) into a 3-asset `designs` deliverable so local dev actually exercises the gallery:

```js
{
  name: "Homepage design — round 1",
  kind: "designs",
  assets: [
    { storagePath: "", url: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1000&q=75", type: "image", label: "Homepage" },
    { storagePath: "", url: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1000&q=75", type: "image", label: "Product page" },
    { storagePath: "", url: "https://images.unsplash.com/photo-1481487196290-c152efe083f5?w=1000&q=75", type: "image", label: "About page" },
  ],
  coverUrl: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1000&q=75",
  // keep whatever fileUrl/fileType this deliverable already had, set to assets[0]'s values,
  // so anything that hasn't been normalized-read yet still works
  fileUrl: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1000&q=75",
  fileType: "image",
  // ...unchanged: projectId, clientId, version, versionLabel, status, etc.
}
```

Leave every other seeded deliverable exactly as-is (old-shaped, no `kind`/`assets`/`coverUrl`) — they're the fixture proving `normalizeDeliverable()` actually handles legacy docs in a real run, not just in the Task 1 unit test.

- [ ] **Step 2: Reseed and spot-check**

```bash
node --env-file=.env.local firebase/seed/seed.mjs
```
Expected: seed script completes without error.

- [ ] **Step 3: Commit**

```bash
git add firebase/seed/seed.mjs
git commit -m "$(printf "feat(seed): one deliverable becomes a 3-image designs set\n\nEverything else seeded stays old-shaped on purpose, so local dev exercises\nnormalizeDeliverable() on real legacy docs, not just the unit test.\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>")"
```

---

## Task 9: Regression, manual verification, screenshots

**Files:**
- Modify: `scripts/phase3-verify.mjs`, `scripts/phase4-verify.mjs`

- [ ] **Step 1: Extend `phase3-verify.mjs`**

After the existing deliverable-review checks, add (using the reseeded 3-image "Homepage design — round 1" deliverable):

```js
await d.goto(`${BASE}/projects/acme-marketing-website/deliverables/<its-deliverable-id>`);
// ^ adjust the path to whatever project/deliverable id the seed script assigns —
//   read seed.mjs's actual ids rather than guessing.
await d.waitForSelector("text=1 / 3");
record("gallery viewer shows a 3-image counter", true);
await d.click('button[aria-label="Next"]');
await d.waitForSelector("text=2 / 3");
record("gallery next arrow advances", true);
await d.screenshot({ path: `${OUT}/09-gallery-1440.png`, fullPage: true });
```

- [ ] **Step 2: Extend `phase4-verify.mjs`**

After the existing single-file upload check, add a multi-image upload check: select 2 PNG buffers via `setInputFiles` with an array, submit, then assert the created deliverable doc has `kind: "designs"` and `assets.length === 2` (query Firestore directly the same way the existing upload check does).

- [ ] **Step 3: Full suite**

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --project unit
npx vitest run --project firebase   # or `npm run test:rules` if no emulator is already running
node --env-file=.env.local scripts/phase3-verify.mjs
node --env-file=.env.local scripts/phase4-verify.mjs
```
Expected: all clean/green. If emulators were already running for manual testing and `npm run test:rules` conflicts on ports, reseed afterward (`firebase emulators:exec` clears Firestore) before re-running phase3/phase4.

- [ ] **Step 4: Manual screenshot pass**

Dashboard hero with the video-covered or image-covered deliverable, the project page's `DeliverableGrid` with cover thumbnails, the gallery viewer open on the 3-image set (desktop + mobile), a video deliverable's captured cover. Confirm nothing regressed for single-image/video/pdf deliverables uploaded the old way (still visible via `normalizeDeliverable`).

- [ ] **Step 5: Commit**

```bash
git add scripts/phase3-verify.mjs scripts/phase4-verify.mjs
git commit -m "$(printf 'test(deliverables): gallery + multi-image upload E2E checks\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-review notes

- **Spec §4 Model:** implemented exactly (Task 1), minus the two deviations recorded at the top (no migration script, no PDF thumbnail) and `website` staying type-only.
- **Spec §4 Review screen:** `GalleryViewer` (Task 3) wired into `DeliverableReview` (Task 5) for both client and studio (same component, `asStudio` prop already routes both through `DeliverableReview` since Phase A). Website-kind cover+link UI is Phase C, not here. Comment `assetIndex` pinning explicitly deferred per the spec's own permission.
- **Spec §4 Covers:** designs/video/document covered (Task 6 upload-time capture, Task 7 display); website left null (Phase C).
- **Spec §4 Upload flow:** multi-file → one `designs` deliverable (Task 6); separate "Deliver a build" action for `website` is Phase C.
- **Global Constraints:** no rules changes, no new dependencies, no component-test framework, `normalizeDeliverable` framework-agnostic (Task 1, exercised by the one real client-side call site in Task 2 Step 3) — all followed.
- **Type consistency:** `normalizeDeliverable(raw: Deliverable): Deliverable` (Task 1) is the single shape every downstream consumer relies on; `GalleryViewer({ assets, name })` (Task 3) matches its Task 5 call site; `createDeliverable`'s new input shape (Task 6 Step 1) matches what `DeliverableUpload` builds (Task 6 Step 3); `captureVideoFrame(file): Promise<Blob | null>` (Task 4) matches its Task 6 Step 3 usage.
- **Risk called out explicitly:** Task 6 Step 3 (the upload component rework) is the one task without a full code listing, because the existing file's resumable-upload state machine must survive intact. Read the whole file before touching it, and re-run the existing single-file phase4-verify upload check (unchanged, still in the suite) before adding the new multi-image one.
