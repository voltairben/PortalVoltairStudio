# Portal Visual Redesign — Phase C: Website Deliverable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `website` deliverable kind end-to-end — a dedicated "Deliver a build" studio action (name + staging URL + a screenshot), and a client/studio review treatment that shows the screenshot with a persimmon "Open the live site ↗" button instead of the generic image/gallery viewer.

**Architecture:** `Deliverable.kind`, `assets[]`, `coverUrl`, and `siteUrl` already exist on the type and in `createDeliverableInputSchema`/`normalizeDeliverable()` from Phase B — `website` was type-only there. This phase wires the missing pieces: (1) `siteUrl` accepted by the create-deliverable schema/action, (2) a small standalone upload form (screenshot is one small image — no resumable engine needed, unlike the existing 500MB video/PDF upload path), (3) a new review-screen component, (4) entry points, (5) a kind-aware file icon, (6) seed data, (7) E2E coverage.

**Tech Stack:** Next.js 16 App Router, TypeScript, Firebase Storage (`uploadBytes`, non-resumable), zod, Tailwind v4, Playwright (via the existing `phase3-verify.mjs`/`phase4-verify.mjs` scripts).

**Spec:** `docs/superpowers/specs/2026-09-10-portal-visual-redesign-design.md` (§4 "Website kind" review-screen row, §4 "Covers/thumbnails" table, §4 "Upload flow" — "a separate 'Deliver a build' action for website (name + staging URL + a screenshot upload)", §5 "Phase C").

## Deviations from the spec

- **No "manual screenshot cover, automate later" ambiguity to resolve** — the spec already says manual upload is fine at studio scale (§4 covers table, §6 out-of-scope explicitly excludes auto-capture). Implemented as a plain single-image upload, no Puppeteer/automation.
- **"Upload new version" on an existing website deliverable's studio status card still points at the generic `/admin/deliverables/upload` form**, not `/admin/deliverables/deliver-build`. Re-delivering a website build (new screenshot/URL) means the studio navigates to Deliverables → "Deliver a build" manually. Not wired as a deliverable-kind-aware redirect — small enough gap to leave for a follow-up if it's ever annoying in practice, not worth the branching in `StudioStatusCard` for a first cut.
- **Added, not in the original spec text:** `FileTypeIcon` becomes kind-aware so a website deliverable shows a globe icon instead of a generic image icon in the three list views (admin deliverables table, admin project page, client `DeliverableGrid`). Cheap (one component + three call-site prop additions) and directly avoids a website build looking indistinguishable from a plain screenshot upload in every list.

## Global Constraints

- No React component-test framework (established Phase A/B precedent — the repo has none; `@testing-library/react` intentionally not added). New components are verified via `phase3-verify.mjs`/`phase4-verify.mjs` (extended in Task 7) + `npm run build` + manual screenshots.
- `normalizeDeliverable()` already defaults `siteUrl` to `null` for both already-normalized and legacy docs (`src/lib/deliverable-utils.ts:43-67`, shipped in Phase B) — no changes needed there.
- No Firestore/Storage rules changes needed — website screenshots upload to the same `deliverables/{clientId}/{projectId}/**` Storage path already covered by existing rules (admin-write, tenant-scoped), and `createDeliverable` already requires `actor.role === "admin"`.
- No new npm dependencies.
- Branch off `main` (this repo's current tip after Phase B's merge, `ba3bc42`) — never build multi-commit work directly on `main`.
- Match existing code style exactly: `"use client"` only where interactivity requires it, Tailwind utility classes inline (no CSS modules), lucide-react icons, the established button/badge color tokens (`bg-brand-persimmon`, `border-zinc-800`, etc.) — copy patterns from the files this plan points at rather than inventing new ones.

---

## Task 1: `siteUrl` on the create-deliverable path

**Files:**
- Modify: `src/lib/validation/schemas.ts:196-206` (`createDeliverableInputSchema`)
- Modify: `src/lib/actions/deliverables.ts:142-162` (`createDeliverable`, the `Deliverable` object literal)

**Interfaces:**
- Consumes: `Deliverable.siteUrl?: string | null` (already defined, `src/types/deliverable.ts:28`).
- Produces: `CreateDeliverableInput` now includes an optional `siteUrl`; `createDeliverable` persists it. Task 4's `DeliverBuildForm` is the first real caller that sets it.

- [ ] **Step 1: Add `siteUrl` to the input schema**

In `src/lib/validation/schemas.ts`, the current schema (~line 196):

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
```

Add one field:

```ts
export const createDeliverableInputSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  kind: deliverableKindSchema,
  assets: z.array(deliverableAssetSchema).min(1).max(20),
  coverUrl: z.string().url().nullable(),
  siteUrl: z.string().trim().url().nullable().optional(),
  version: z.number().int().positive().max(999),
  versionLabel: z.string().trim().min(1).max(20),
  milestoneId: z.string().min(1).nullable().optional(),
});
```

- [ ] **Step 2: Persist it in `createDeliverable`**

In `src/lib/actions/deliverables.ts`, the `Deliverable` object literal (~line 142) currently ends with:

```ts
    kind: d.kind,
    assets: d.assets,
    coverUrl: d.coverUrl,
    version: d.version,
```

Add `siteUrl` between `coverUrl` and `version`:

```ts
    kind: d.kind,
    assets: d.assets,
    coverUrl: d.coverUrl,
    siteUrl: d.siteUrl ?? null,
    version: d.version,
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors. `Deliverable` already declares `siteUrl` as optional/nullable, so this is a pure addition — no other read site breaks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/schemas.ts src/lib/actions/deliverables.ts
git commit -m "$(printf 'feat(deliverables): createDeliverable accepts and persists siteUrl\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 2: `FileTypeIcon` becomes kind-aware

**Files:**
- Modify: `src/components/portal/file-type-icon.tsx`
- Modify: `src/components/portal/deliverable-grid.tsx:2,38` (import + call site)
- Modify: `src/app/(admin)/admin/deliverables/page.tsx:6,58` (import + call site)
- Modify: `src/app/(admin)/admin/projects/[projectId]/page.tsx:10,103` (import + call site)

**Interfaces:**
- Consumes: `DeliverableKind` (`src/types/deliverable.ts:4`).
- Produces: `<FileTypeIcon type={DeliverableFileType} kind={DeliverableKind} className? />` — `kind` is optional so any caller that doesn't pass it keeps today's behavior exactly.

- [ ] **Step 1: Add the `kind` prop**

Replace the full contents of `src/components/portal/file-type-icon.tsx`:

```tsx
import { FileText, Film, Globe, ImageIcon, Paperclip } from "lucide-react";
import type { ComponentType } from "react";
import type { DeliverableFileType, DeliverableKind } from "@/types";

const ICONS: Record<DeliverableFileType, ComponentType<{ className?: string }>> = {
  video: Film,
  image: ImageIcon,
  document: FileText,
  other: Paperclip,
};

export function FileTypeIcon({
  type,
  kind,
  className,
}: {
  type: DeliverableFileType;
  /** When "website", overrides `type` with a globe icon — a website build's
   *  single asset is just an image (its screenshot), so `type` alone can't
   *  tell it apart from a plain image upload. */
  kind?: DeliverableKind;
  className?: string;
}) {
  if (kind === "website") return <Globe className={className} />;
  const Icon = ICONS[type] ?? Paperclip;
  return <Icon className={className} />;
}
```

- [ ] **Step 2: Pass `kind` from the three call sites**

`src/components/portal/deliverable-grid.tsx:38` — change:

```tsx
              <FileTypeIcon type={d.fileType} className="size-4" />
```

to:

```tsx
              <FileTypeIcon type={d.fileType} kind={d.kind} className="size-4" />
```

`src/app/(admin)/admin/deliverables/page.tsx:58` — change:

```tsx
                        <FileTypeIcon type={d.fileType} className="size-3.5" />
```

to:

```tsx
                        <FileTypeIcon type={d.fileType} kind={d.kind} className="size-3.5" />
```

`src/app/(admin)/admin/projects/[projectId]/page.tsx:103` — change:

```tsx
                    <FileTypeIcon type={d.fileType} className="size-4" />
```

to:

```tsx
                    <FileTypeIcon type={d.fileType} kind={d.kind} className="size-4" />
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean. (`DeliverableRow`/`AdminProjectView`'s `deliverables` are `Deliverable[]`/`DeliverableRow` which already carry `kind` — no type plumbing needed beyond the prop.)

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/file-type-icon.tsx src/components/portal/deliverable-grid.tsx "src/app/(admin)/admin/deliverables/page.tsx" "src/app/(admin)/admin/projects/[projectId]/page.tsx"
git commit -m "$(printf 'feat(portal): FileTypeIcon shows a globe for website deliverables\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 3: `WebsitePreview` + wire it into `DeliverableReview`

**Files:**
- Create: `src/components/review/website-preview.tsx`
- Modify: `src/components/review/deliverable-review.tsx:108-129` (the viewer switch)

**Interfaces:**
- Produces: `WebsitePreview({ coverUrl, siteUrl, name }: { coverUrl: string | null; siteUrl: string | null; name: string })` — a plain function component (not dynamically imported: unlike `VideoPlayer`/`ImageViewer`/`PdfViewer`/`GalleryViewer`, it carries no heavy client-side engine — no zoom/canvas/resumable-upload code — so there's no bundle-size reason to code-split it. Rendered directly from `DeliverableReview`, which is already `"use client"`.

- [ ] **Step 1: Create `WebsitePreview`**

```tsx
import { ArrowUpRight, Globe } from "lucide-react";

/**
 * Website-kind review treatment: the studio's screenshot, a persimmon
 * "Open the live site" action, and the URL shown small underneath — no
 * gallery, no viewer chrome, per spec §4 "Website kind".
 */
export function WebsitePreview({
  coverUrl,
  siteUrl,
  name,
}: {
  coverUrl: string | null;
  siteUrl: string | null;
  name: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      <div className="relative flex min-h-[60vh] w-full items-center justify-center bg-surface-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${name} screenshot`}
            decoding="async"
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <Globe className="size-8 text-brand-persimmon/60" />
            <p className="text-[13px] text-ink-subtle">
              No screenshot yet — the studio will add one when the build is delivered.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="truncate text-[12px] text-ink-subtle">{siteUrl ?? "No live URL set yet."}</span>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-persimmon px-4 text-[13px] font-semibold text-brand-persimmon-fg transition-opacity hover:opacity-90"
          >
            Open the live site
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the viewer switch**

In `src/components/review/deliverable-review.tsx`, add the import alongside the other dynamic viewer imports (~line 8):

```tsx
import { WebsitePreview } from "@/components/review/website-preview";
```

Then change the viewer switch (currently lines 111-129) so the `website` kind is checked **first** — a website deliverable's single asset is type `"image"`, so it would otherwise be swallowed by the `assets[0]?.type === "image"` branch below it:

```tsx
        {deliverable.kind === "website" ? (
          <WebsitePreview
            coverUrl={deliverable.coverUrl}
            siteUrl={deliverable.siteUrl ?? null}
            name={deliverable.name}
          />
        ) : deliverable.kind === "designs" && deliverable.assets.length > 1 ? (
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

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/review/website-preview.tsx src/components/review/deliverable-review.tsx
git commit -m "$(printf 'feat(review): WebsitePreview — screenshot + Open the live site\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 4: `DeliverBuildForm` — the studio "Deliver a build" action

**Files:**
- Create: `src/components/admin/deliver-build-form.tsx`
- Create: `src/components/admin/deliver-build-form-lazy.tsx`
- Create: `src/app/(admin)/admin/deliverables/deliver-build/page.tsx`

**Interfaces:**
- Consumes: `UploadTarget` (`src/lib/data/admin.ts:166-172`), `getUploadTargets()` (`src/lib/data/admin.ts:174`), `createDeliverable` (`src/lib/actions/deliverables.ts`, now accepting `siteUrl` per Task 1), `storage` (`src/lib/firebase/client.ts`).
- Produces: `DeliverBuildForm({ targets, preselectedProjectId }: { targets: UploadTarget[]; preselectedProjectId?: string })`, re-exported lazily as `DeliverBuildFormLazy` with the same props — mirrors `DeliverableUpload`/`DeliverableUploadLazy` exactly.

- [ ] **Step 1: Write `DeliverBuildForm`**

```tsx
"use client";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Check, Globe, ImageIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createDeliverable } from "@/lib/actions/deliverables";
import type { UploadTarget } from "@/lib/data/admin";
import { storage } from "@/lib/firebase/client";
import type { DeliverableAsset } from "@/types";

const MAX_BYTES = 20 * 1024 * 1024; // screenshots are small; generous cap

function validateScreenshot(f: File): string | null {
  if (f.size > MAX_BYTES) return "Screenshots must be 20 MB or smaller.";
  if (!f.type.startsWith("image/")) return "Upload an image screenshot.";
  return null;
}

function validateSiteUrl(v: string): string | null {
  if (!v.trim()) return "Enter the live site URL.";
  try {
    new URL(v.trim());
    return null;
  } catch {
    return "Enter a full URL, including https://.";
  }
}

type Phase = "idle" | "uploading" | "error" | "done";

/** Record a delivered website build: a name, the live URL, and a screenshot cover. */
export function DeliverBuildForm({
  targets,
  preselectedProjectId,
}: {
  targets: UploadTarget[];
  preselectedProjectId?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(
    targets.some((t) => t.projectId === preselectedProjectId) ? (preselectedProjectId ?? "") : "",
  );
  const [title, setTitle] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1.0");
  const [milestoneId, setMilestoneId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const target = useMemo(() => targets.find((t) => t.projectId === projectId), [targets, projectId]);
  const canStart =
    !!target &&
    title.trim().length > 0 &&
    versionLabel.trim().length > 0 &&
    !!screenshot &&
    validateSiteUrl(siteUrl) === null &&
    phase === "idle";

  function pickFile(fileList: FileList | null) {
    setFileError(null);
    const f = fileList?.[0];
    if (!f) return;
    const problem = validateScreenshot(f);
    if (problem) {
      setFileError(problem);
      return;
    }
    setScreenshot(f);
    if (!title.trim()) setTitle(target?.name ? `${target.name} — live build` : "Live build");
  }

  async function start() {
    if (!canStart || !target || !screenshot) return;
    setError(null);
    setPhase("uploading");

    try {
      const safeName = screenshot.name.replace(/[^\w.\-]+/g, "_");
      const path = `deliverables/${target.clientId}/${target.projectId}/${Date.now()}-${safeName}`;
      const snapshot = await uploadBytes(ref(storage, path), screenshot, {
        contentType: screenshot.type,
      });
      const url = await getDownloadURL(snapshot.ref);
      const asset: DeliverableAsset = { storagePath: path, url, type: "image", label: null };
      const numeric = parseInt(versionLabel.replace(/[^\d]/g, ""), 10) || 1;

      const result = await createDeliverable({
        projectId: target.projectId,
        clientId: target.clientId,
        name: title.trim(),
        kind: "website",
        assets: [asset],
        coverUrl: url,
        siteUrl: siteUrl.trim(),
        version: numeric,
        versionLabel: versionLabel.trim(),
        milestoneId: milestoneId || null,
      });
      if (result.ok) {
        setResultId(result.deliverableId ?? null);
        setPhase("done");
        router.refresh();
      } else {
        setError(result.error ?? "Could not create the deliverable record.");
        setPhase("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setPhase("error");
    }
  }

  function reset() {
    setScreenshot(null);
    setTitle("");
    setVersionLabel("v1.0");
    setMilestoneId("");
    setSiteUrl("");
    setPhase("idle");
    setError(null);
    setResultId(null);
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-positive/30 bg-positive/10 text-positive">
          <Check className="size-5" />
        </span>
        <p className="mt-3 text-[15px] font-medium text-ink">Build delivered</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          {target?.clientName} was emailed a review link.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {resultId && target && (
            <Link
              href={`/projects/${target.projectId}/deliverables/${resultId}`}
              className="inline-flex h-9 items-center rounded-lg border border-zinc-800 px-3.5 text-[13px] text-ink hover:border-brand-persimmon hover:text-brand-persimmon"
            >
              View review page
            </Link>
          )}
          <Button className="h-9 px-4 text-[13px]" onClick={reset}>
            Deliver another
          </Button>
        </div>
      </div>
    );
  }

  const busy = phase === "uploading";
  const siteUrlError = siteUrl.length > 0 ? validateSiteUrl(siteUrl) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Target project
          </span>
          <select
            value={projectId}
            disabled={busy}
            onChange={(e) => {
              setProjectId(e.target.value);
              setMilestoneId("");
            }}
            className={inputCls}
          >
            <option value="">Select a project…</option>
            {targets.map((t) => (
              <option key={t.projectId} value={t.projectId}>
                {t.clientName} · {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Deliverable title
          </span>
          <input
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Live build"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Version tag
          </span>
          <input
            value={versionLabel}
            disabled={busy}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="v1.0"
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Live site URL
          </span>
          <input
            value={siteUrl}
            disabled={busy}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://acme.com"
            className={inputCls}
          />
          {siteUrlError && <p className="mt-1 text-[12px] text-critical">{siteUrlError}</p>}
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Milestone anchor (optional)
          </span>
          <select
            value={milestoneId}
            disabled={busy || !target}
            onChange={(e) => setMilestoneId(e.target.value)}
            className={inputCls}
          >
            <option value="">No milestone</option>
            {target?.milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!screenshot ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 px-4 py-12 text-center transition-colors hover:border-brand-persimmon/60"
        >
          <Globe className="size-7 text-ink-subtle" />
          <span className="text-[13px] font-medium text-ink">Drop a screenshot of the live build</span>
          <span className="text-[11px] text-ink-subtle">PNG or JPG · up to 20 MB</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files)}
          />
        </label>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-surface-1 p-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="size-4 shrink-0 text-ink-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{screenshot.name}</p>
            </div>
            {phase === "idle" && (
              <button
                type="button"
                aria-label="Remove screenshot"
                onClick={() => setScreenshot(null)}
                className="text-ink-subtle hover:text-critical"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {busy && <p className="mt-3 text-[11px] text-brand-persimmon">Uploading…</p>}
        </div>
      )}

      {(fileError || error) && <p className="text-[12px] text-critical">{fileError ?? error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" && (
          <Button onClick={start} disabled={!canStart}>
            <Globe className="size-4" />
            Deliver build
          </Button>
        )}
        {phase === "error" && <Button onClick={reset}>Start over</Button>}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-800 bg-brand-obsidian px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25 disabled:opacity-60";
```

- [ ] **Step 2: Write the lazy wrapper**

```tsx
"use client";

import dynamic from "next/dynamic";
import type { UploadTarget } from "@/lib/data/admin";

const DeliverBuildForm = dynamic(
  () => import("@/components/admin/deliver-build-form").then((m) => m.DeliverBuildForm),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-80 animate-pulse rounded-xl border border-zinc-800 bg-surface-1" />
    ),
  },
);

export function DeliverBuildFormLazy(props: {
  targets: UploadTarget[];
  preselectedProjectId?: string;
}) {
  return <DeliverBuildForm {...props} />;
}
```

- [ ] **Step 3: Write the route page**

```tsx
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeliverBuildFormLazy } from "@/components/admin/deliver-build-form-lazy";
import { PageHeader } from "@/components/admin/page-header";
import { getUploadTargets } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Deliver a build" };

export default async function DeliverBuildPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireAdmin();
  const [{ project }, targets] = await Promise.all([searchParams, getUploadTargets()]);

  return (
    <div className="max-w-2xl space-y-7">
      <div>
        <Link
          href="/admin/deliverables"
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Deliverables
        </Link>
        <PageHeader
          title="Deliver a build"
          subtitle="Record the live URL and a screenshot of a delivered website build."
        />
      </div>

      {targets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-10 text-center text-sm text-ink-muted">
          Create a project first, then deliver a build to it.
        </p>
      ) : (
        <DeliverBuildFormLazy targets={targets} preselectedProjectId={project} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean. `/admin/deliverables/deliver-build` appears in the build's route list as a dynamic (`ƒ`) page, same as `/admin/deliverables/upload`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/deliver-build-form.tsx src/components/admin/deliver-build-form-lazy.tsx "src/app/(admin)/admin/deliverables/deliver-build/page.tsx"
git commit -m "$(printf 'feat(admin): Deliver a build — website deliverable upload form\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 5: Entry points — "Deliver a build" buttons

**Files:**
- Modify: `src/app/(admin)/admin/deliverables/page.tsx:1,22-30`
- Modify: `src/app/(admin)/admin/projects/[projectId]/page.tsx:1,44-53`

**Interfaces:**
- Consumes: nothing new — plain `<Link>`s to the Task 4 route.

- [ ] **Step 1: Add the button to the deliverables list page**

In `src/app/(admin)/admin/deliverables/page.tsx`, add `Globe` to the lucide import (line 1):

```tsx
import { Globe, UploadCloud } from "lucide-react";
```

Then change the `PageHeader`'s `action` (currently lines 22-30) from a single `<Link>` to two, wrapped in a flex row:

```tsx
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/deliverables/deliver-build"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
            >
              <Globe className="size-4" />
              Deliver a build
            </Link>
            <Link
              href="/admin/deliverables/upload"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-persimmon px-4 text-[13px] font-medium text-brand-persimmon-fg transition-colors hover:bg-brand-persimmon-bright"
            >
              <UploadCloud className="size-4" />
              Upload deliverable
            </Link>
          </div>
        }
```

- [ ] **Step 2: Add the button to the project detail page**

In `src/app/(admin)/admin/projects/[projectId]/page.tsx`, add `Globe` to the lucide import (line 1):

```tsx
import { ChevronLeft, Globe, UploadCloud } from "lucide-react";
```

Then change the `PageHeader`'s `action` (currently lines 44-53):

```tsx
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/deliverables/deliver-build?project=${project.projectId}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
              >
                <Globe className="size-4" />
                Deliver a build
              </Link>
              <Link
                href={`/admin/deliverables/upload?project=${project.projectId}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
              >
                <UploadCloud className="size-4" />
                Upload deliverable
              </Link>
            </div>
          }
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/deliverables/page.tsx" "src/app/(admin)/admin/projects/[projectId]/page.tsx"
git commit -m "$(printf 'feat(admin): add Deliver a build entry points\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 6: Seed data — a real website deliverable

**Files:**
- Modify: `firebase/seed/seed.mjs` (the `deliverables` array, after the `web-design-review` entry)

**Interfaces:**
- Consumes: the existing `iso()` helper and `deliverables` array already in the file.

- [ ] **Step 1: Add the seeded deliverable**

In `firebase/seed/seed.mjs`, inside the `deliverables` array, add a new entry after the `web-design-review` object (before the closing `];`). Status is `"approved"` (not `"pending"`) so it doesn't compete with `web-design-review`'s changes-requested state or `film-cut-v3`'s pending state for the dashboard hero slot — same reasoning Phase B used for its own new seed entry:

```js
  {
    deliverableId: "live-build-v1",
    projectId: "acme-website",
    clientId: "acme",
    name: "Live build",
    fileUrl: "https://picsum.photos/id/1029/1600/1000",
    fileType: "image",
    kind: "website",
    assets: [
      { storagePath: "", url: "https://picsum.photos/id/1029/1600/1000", type: "image", label: null },
    ],
    coverUrl: "https://picsum.photos/id/1029/1600/1000",
    siteUrl: "https://acme-web-staging.vercel.app",
    version: 1,
    versionLabel: null,
    status: "approved",
    feedbackCount: 0,
    decidedAt: iso(-1),
    createdAt: iso(-1),
  },
```

(`siteUrl` reuses the project's existing `vercelPreviewUrl` value for `acme-website` — a deliberate consistency touch, not a functional requirement.)

- [ ] **Step 2: Run the seed and confirm**

```bash
npm run seed
```

Expected output includes:

```
✓ deliverable  Live build
```

- [ ] **Step 3: Commit**

```bash
git add firebase/seed/seed.mjs
git commit -m "$(printf 'feat(seed): a website-kind deliverable to exercise the new UI in dev\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 7: E2E verification — extend phase3/phase4, full suite, screenshots

**Files:**
- Modify: `scripts/phase3-verify.mjs`
- Modify: `scripts/phase4-verify.mjs`

- [ ] **Step 1: Extend `phase3-verify.mjs`**

After the gallery-viewer checks added in Phase B (the block ending `record("gallery next arrow advances", true);` / the screenshot right before `} catch (err) {` in the desktop `try` block), add:

```js
  // --- Phase C: website deliverable ---------------------------------------
  await d.goto(`${BASE}/projects/acme-website/deliverables/live-build-v1`);
  await d.waitForSelector("text=Open the live site", { timeout: 10000 });
  record("website deliverable shows the Open the live site action", true);
  const siteHref = await d.getAttribute('a:has-text("Open the live site")', "href");
  record("Open the live site links to the seeded siteUrl", siteHref === "https://acme-web-staging.vercel.app");
  await d.screenshot({ path: `${OUT}/10-website-1440.png`, fullPage: true });
```

- [ ] **Step 2: Extend `phase4-verify.mjs`**

After the multi-image upload block added in Phase B (right before the `// --- Unified inbox real-time ---------------------------------------` comment), add:

```js
  // --- Deliver a build (website deliverable) --------------------------
  await a.goto(`${BASE}/admin/deliverables/deliver-build`);
  await a.waitForSelector("select");
  await a.selectOption("select", "acme-brand-film");
  await a.fill('input[placeholder="Live build"]', `PW Build ${stamp}`);
  await a.fill('input[placeholder="https://acme.com"]', `https://pw-build-${stamp}.example.com`);
  await a.setInputFiles('input[type="file"]', {
    name: `pw-build-${stamp}.png`,
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  await a.click('button:has-text("Deliver build")');
  await a.waitForSelector("text=Build delivered", { timeout: 30000 });
  record("Deliver a build streams a screenshot + creates the deliverable", true);
  await a.screenshot({ path: `${OUT}/p4-06-deliver-build.png` });

  const buildSnap = await adminDb
    .collection("deliverables")
    .where("name", "==", `PW Build ${stamp}`)
    .get();
  const build = buildSnap.docs[0]?.data();
  record(
    "website deliverable: kind=website, 1 asset, coverUrl = asset url, siteUrl set",
    !!build &&
      build.kind === "website" &&
      Array.isArray(build.assets) &&
      build.assets.length === 1 &&
      build.coverUrl === build.assets[0]?.url &&
      build.siteUrl === `https://pw-build-${stamp}.example.com`,
  );
```

- [ ] **Step 3: Full suite**

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --project unit
npx vitest run --project firebase
```

Expected: all clean/green. The rules run clears Firestore — reseed before the E2E scripts:

```bash
npm run seed
```

If leftover E2E-created docs (from a previous local run) are already sitting in Firestore and confusing manual review, wipe first (Auth is untouched):

```bash
curl -s -X DELETE "http://localhost:8080/emulator/v1/projects/voltairstudio-aa855/databases/(default)/documents"
npm run seed
```

Then, with `npm run dev` and the emulators running:

```bash
node --env-file=.env.local scripts/phase3-verify.mjs
node --env-file=.env.local scripts/phase4-verify.mjs
```

Expected: both scripts report all checks passed, including the two new ones each.

- [ ] **Step 4: Manual screenshot pass**

Confirm visually (screenshots already taken by the scripts above, `scratch-shots/10-website-1440.png` and `scratch-shots/p4-06-deliver-build.png`): the website deliverable's cover shows in `DeliverableGrid` on the Website Project page and in the dashboard hero if it's ever the newest; the review screen shows the screenshot large with the persimmon "Open the live site ↗" button and the URL beneath; the admin deliverables table and project page both show a globe icon on the website row. Confirm nothing regressed for designs/video/document deliverables (still render through their existing viewers).

- [ ] **Step 5: Wipe test-run clutter and reseed clean**

```bash
curl -s -X DELETE "http://localhost:8080/emulator/v1/projects/voltairstudio-aa855/databases/(default)/documents"
npm run seed
```

- [ ] **Step 6: Commit**

```bash
git add scripts/phase3-verify.mjs scripts/phase4-verify.mjs
git commit -m "$(printf 'test(deliverables): website-deliverable E2E checks\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-review notes

- **Spec §4 "Website kind" review row:** implemented exactly — screenshot cover, persimmon "Open the live site ↗", URL shown small, no gallery (Task 3).
- **Spec §4 covers table, website row:** "studio uploads a screenshot when marking the build delivered" — implemented as the `DeliverBuildForm` upload (Task 4); auto-capture explicitly out of scope per the spec itself.
- **Spec §4 upload flow:** "a separate 'Deliver a build' action for website (name + staging URL + a screenshot upload)" — implemented as a standalone form/route, not bolted onto the existing multi-purpose `DeliverableUpload` (Task 4), keeping that component's existing single-file/multi-image state machine untouched.
- **Spec §5 Phase C scope line** ("`website` kind, 'Deliver a build' action, manual screenshot cover, 'Open the live site'.") — all four covered by Tasks 1, 3, 4.
- **Type consistency:** `DeliverBuildForm`'s `createDeliverable(...)` call (Task 4) matches the schema shape from Task 1 exactly (`siteUrl` alongside the existing fields); `WebsitePreview({ coverUrl, siteUrl, name })` (Task 3) matches its call site in `DeliverableReview` exactly; `FileTypeIcon`'s new `kind` prop (Task 2) is optional so it can't break any caller that isn't updated.
- **Global Constraints:** no rules changes, no new dependencies, no component-test framework, branch off `main` — all followed.
