# Portal Visual Redesign — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the client portal read like a creative studio's product — new typography, disciplined use of the persimmon accent, and a restructured dashboard — with no data-model or backend changes.

**Architecture:** Swap the Geist Sans typeface for a Sentient (serif display) + Satoshi (sans body) pairing, self-hosted via `next/font/local`. Add a type scale and heading treatment to the Tailwind v4 `@theme` block. Neutralise progress bars and reserve persimmon for one action per screen. Replace the dashboard's milestone-stat block and card grid with a "latest delivery" hero, an attention panel, and a full-width project list; reuse the same list on the projects page.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first `@theme`), `next/font/local`, Firebase Admin SDK (reads only), Playwright (verify scripts).

**Spec:** `docs/superpowers/specs/2026-09-10-portal-visual-redesign-design.md`

## Global Constraints

- Tailwind is **CSS-first** — all design tokens live in `src/app/globals.css` under `@theme`. There is **no `tailwind.config.js`**.
- Strict CSP is enforced in `next.config.ts`: `font-src 'self' data:`. Fonts **must** be self-hosted; no external font CDN at runtime.
- Fonts: **Sentient** (weights 500, 700) for display; **Satoshi** (weights 400, 500, 700) for body. Both Fontshare, ITF Free Font License (commercial use OK). Keep **Geist Mono** for tabular/measurement text.
- Palette unchanged: obsidian `#0A0A0A`, persimmon `#FF4F00`, status colours `--color-positive` / `--color-caution` / `--color-critical`. No new colours, gradients-as-decoration, or textures.
- **One persimmon fill per screen** — the primary action or the single "needs you" signal. Progress bars are neutral unless the project is awaiting the client.
- Motion near zero: one route-load settle at most, hover transitions ≤ 150 ms. Respect the existing `prefers-reduced-motion` block.
- No changes to auth, RBAC, Firestore rules, the tenant model, or any `src/lib/data/**` write path. Phase A adds **one read accessor** and touches no writes.
- Verify scripts must stay green: `node --env-file=.env.local scripts/phase3-verify.mjs` (client, 13 checks) and `scripts/phase4-verify.mjs` (admin, 11 checks). They need the emulator suite + `npm run dev` + `npm run seed`.
- **No React component-test framework is added.** The repo has no `@testing-library/react` / jsdom and no component tests. New presentational components (hero, attention panel, project list) are verified by `phase3-verify` (renders the real dashboard against emulators) + `npm run build` + screenshots. Pure logic (`milestoneStats`) gets a Node-env `*.test.ts` in the existing `unit` project.
- Executed on branch `redesign/portal-phase-a`; merges to `main` only after the full Task 10 regression passes and the user has seen it.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. `.claude/` and `.codex/` stay unstaged. Commit only the files each task lists.

---

## File Structure

**Created:**
- `src/app/fonts/Sentient-Medium.woff2`, `Sentient-Bold.woff2`, `Satoshi-Regular.woff2`, `Satoshi-Medium.woff2`, `Satoshi-Bold.woff2` — self-hosted font files
- `src/components/portal/project-list.tsx` — full-width divided project list (dashboard + projects page)
- `src/components/portal/latest-delivery-hero.tsx` — dashboard hero for the most recent deliverable
- `src/components/portal/attention-panel.tsx` — dashboard "needs your attention" summary

**Modified:**
- `src/app/layout.tsx` — `next/font/local` wiring, `<html>` font variable classes
- `src/app/globals.css` — `@theme` font + type-scale tokens, base heading treatment
- `src/components/portal/milestone-progress.tsx` — neutral by default, `tone` prop
- `src/components/portal/project-card.tsx` — quieter (neutral stage badge, static active-milestone dot, neutral progress) — kept for the project *detail* page header context only, or deleted if unused after Task 7
- `src/lib/data/portal.ts` — add `getClientDeliverables`
- `src/app/(portal)/dashboard/page.tsx` — layout A
- `src/app/(portal)/projects/page.tsx` — use `ProjectList`
- `src/app/(portal)/account/page.tsx` — spacing + heading pass
- `src/app/(portal)/projects/[projectId]/page.tsx` — heading + spacing pass (no structural change)
- `scripts/phase3-verify.mjs` — update selectors changed by the dashboard rewrite; add a hero check

---

## Task 1: Typography — self-host fonts + type tokens

**Files:**
- Create: `src/app/fonts/Sentient-Medium.woff2`, `src/app/fonts/Sentient-Bold.woff2`, `src/app/fonts/Satoshi-Regular.woff2`, `src/app/fonts/Satoshi-Medium.woff2`, `src/app/fonts/Satoshi-Bold.woff2`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties `--font-display` (Sentient stack) and `--font-sans` (Satoshi stack) available through Tailwind (`font-display`, `font-sans` utilities). `--font-mono` unchanged. Type-scale tokens `--text-2xs … --text-5xl`.

- [ ] **Step 1: Fetch the font files**

Fontshare serves the raw `.woff2` behind its CSS API. Run from the repo root:

```bash
mkdir -p src/app/fonts
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
# Resolve the current CDN URLs, then download the five faces we use.
curl -s -A "$UA" 'https://api.fontshare.com/v2/css?f%5B%5D=sentient@500,700&f%5B%5D=satoshi@400,500,700&display=swap' -o /tmp/fs.css
cat /tmp/fs.css   # inspect: each @font-face has one src: url(https://cdn.fontshare.com/wf/....woff2)
```

Map the `@font-face` blocks (font-family + font-weight) to filenames and download each:

```bash
# Example — replace HASH.woff2 with the real URLs from /tmp/fs.css
curl -s -A "$UA" 'https://cdn.fontshare.com/wf/<SENTIENT_500>.woff2' -o src/app/fonts/Sentient-Medium.woff2
curl -s -A "$UA" 'https://cdn.fontshare.com/wf/<SENTIENT_700>.woff2' -o src/app/fonts/Sentient-Bold.woff2
curl -s -A "$UA" 'https://cdn.fontshare.com/wf/<SATOSHI_400>.woff2' -o src/app/fonts/Satoshi-Regular.woff2
curl -s -A "$UA" 'https://cdn.fontshare.com/wf/<SATOSHI_500>.woff2' -o src/app/fonts/Satoshi-Medium.woff2
curl -s -A "$UA" 'https://cdn.fontshare.com/wf/<SATOSHI_700>.woff2' -o src/app/fonts/Satoshi-Bold.woff2
```

Verify each file is a real font, not an error page:

```bash
file src/app/fonts/*.woff2   # each must report "Web Open Font Format (Version 2)"
ls -la src/app/fonts/*.woff2  # each 20–120 KB, none 0 bytes
```

If the CDN blocks scripted download, get the family zips from `https://www.fontshare.com/fonts/sentient` and `https://www.fontshare.com/fonts/satoshi` ("Download Family"), and copy the matching `.woff2` weights out of `fonts/WEB/` in each zip.

- [ ] **Step 2: Wire `next/font/local` in `src/app/layout.tsx`**

Replace the `next/font/google` import and the two `Geist*` calls. Keep Geist Mono (it stays on Google Fonts).

```tsx
import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { PwaProvider } from "@/components/pwa-provider";
import "./globals.css";

const sentient = localFont({
  variable: "--font-sentient",
  display: "swap",
  src: [
    { path: "./fonts/Sentient-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Sentient-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "./fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
```

Update the `<html>` className:

```tsx
    <html
      lang="en"
      className={`${sentient.variable} ${satoshi.variable} ${geistMono.variable} h-full antialiased`}
    >
```

- [ ] **Step 3: Update `@theme` and base styles in `src/app/globals.css`**

Replace the `/* Type */` block:

```css
  /* Type */
  --font-sans: var(--font-satoshi), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-sentient), ui-serif, Georgia, serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", monospace;

  /* Type scale */
  --text-2xs: 0.6875rem;
  --text-xs: 0.8125rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.5rem;
  --text-5xl: 3.25rem;
```

In `@layer base`, change the heading rule so headings render in the display face, and let `body` lose the negative tracking (Satoshi sets its own):

```css
  body {
    background-color: var(--color-brand-obsidian);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: var(--font-display);
    font-weight: 500;
    text-wrap: balance;
    letter-spacing: -0.018em;
  }
```

- [ ] **Step 4: Build and screenshot**

```bash
npm run build
```
Expected: compiles clean; no "Failed to find font file" error.

With `npm run dev` + emulators + seed running, capture the dashboard as `client@acme.test` / `voltair123` at 1440px (adapt `scripts/phase3-verify.mjs`'s login helper into a throwaway script, or reuse an existing scratch script). Expected: page headings ("Welcome back, Ada") render in Sentient (a serif); body text and buttons render in Satoshi (a sans); no invisible-text flash on reload.

- [ ] **Step 5: Commit**

```bash
git add src/app/fonts src/app/layout.tsx src/app/globals.css
git commit -m "$(printf 'feat(design): Sentient + Satoshi typography, self-hosted\n\nReplaces Geist Sans with a Sentient (serif display) + Satoshi (sans body)\npairing, self-hosted via next/font/local (CSP blocks font CDNs). Adds a\ntype scale and routes headings through --font-display. Geist Mono kept for\ntabular text.\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 2: `MilestoneProgress` — neutral by default, `tone` prop

**Files:**
- Modify: `src/components/portal/milestone-progress.tsx`
- Test: `src/components/portal/milestone-progress.test.ts` (create — Node env, pure logic only)

**Interfaces:**
- Consumes: `Milestone[]` from `@/types` (unchanged).
- Produces: `MilestoneProgress` now accepts `tone?: "neutral" | "active"` (default `"neutral"`). `milestoneStats(milestones)` unchanged. `neutral` renders the bar fill (`[data-fill]`) as `bg-line-strong` and the count in `text-ink-subtle`; `active` renders both in persimmon.

- [ ] **Step 1: Write the failing test**

`src/components/portal/milestone-progress.test.ts` (pure logic — no rendering, runs in the Node-env `unit` project):

```ts
import { describe, expect, it } from "vitest";
import { milestoneStats } from "./milestone-progress";
import type { Milestone } from "@/types";

const m = (status: Milestone["status"]): Milestone =>
  ({ id: "x", title: "x", status, order: 0 }) as Milestone;

describe("milestoneStats", () => {
  it("counts completed milestones and a rounded percentage", () => {
    expect(milestoneStats([m("complete"), m("complete"), m("active")])).toEqual({
      total: 3,
      done: 2,
      pct: 67,
    });
  });

  it("is 0% for an empty list", () => {
    expect(milestoneStats([])).toEqual({ total: 0, done: 0, pct: 0 });
  });
});
```

- [ ] **Step 2: Run it, verify it passes (logic already exists)**

Run: `npx vitest run --project unit src/components/portal/milestone-progress.test.ts`
Expected: PASS — `milestoneStats` is unchanged; this test just locks its behaviour before the `tone` edit. The `tone` prop / `data-fill` are verified by the dashboard screenshot in Task 8 and the `phase3-verify` bar check.

- [ ] **Step 3: Implement**

Rewrite `src/components/portal/milestone-progress.tsx`:

```tsx
import type { Milestone } from "@/types";
import { cn } from "@/lib/utils";

export function milestoneStats(milestones: Milestone[]) {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "complete").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

/**
 * Milestone completion bar. Neutral by default; `tone="active"` (persimmon) is
 * for the one project on a screen that is currently waiting on the client.
 */
export function MilestoneProgress({
  milestones,
  size = "sm",
  tone = "neutral",
  className,
}: {
  milestones: Milestone[];
  size?: "sm" | "lg";
  tone?: "neutral" | "active";
  className?: string;
}) {
  const { total, done, pct } = milestoneStats(milestones);
  const persimmon = tone === "active";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-ink-muted", size === "lg" ? "text-sm" : "text-2xs")}>
          Milestones
        </span>
        <span
          className={cn(
            "tnum font-mono",
            persimmon ? "text-brand-persimmon" : "text-ink-subtle",
            size === "lg" ? "text-sm" : "text-2xs",
          )}
        >
          {done} / {total}
        </span>
      </div>
      <div
        className={cn(
          "mt-2 overflow-hidden rounded-full bg-surface-3",
          size === "lg" ? "h-1.5" : "h-1",
        )}
      >
        <div
          data-fill
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            persimmon ? "bg-brand-persimmon" : "bg-line-strong",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests + build**

Run: `npx vitest run --project unit src/components/portal/milestone-progress.test.ts && npm run build`
Expected: test passes; build clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/milestone-progress.tsx src/components/portal/milestone-progress.test.ts
git commit -m "$(printf 'feat(design): neutral milestone bars, persimmon only for the client'\''s turn\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 3: Quiet the project card

**Files:**
- Modify: `src/components/portal/project-card.tsx`

**Interfaces:**
- Consumes: `Project` (unchanged), `MilestoneProgress` with `tone` (Task 2).
- Produces: `ProjectCard` unchanged signature. No persimmon fill: stage badge is `tone="neutral"`, the active-milestone dot is static (no `pulse-persimmon`), the progress bar is neutral. Hover keeps the existing `glow-persimmon` edge (that is a hover affordance, not a resting accent — leave it).

- [ ] **Step 1: Edit the component**

In `src/components/portal/project-card.tsx`:
- Line ~27: `<Badge tone="persimmon">` → `<Badge tone="neutral">`.
- Lines ~32-37: replace the active-milestone block's dot:

```tsx
      {activeMilestone && (
        <p className="mt-3.5 flex items-center gap-2 text-[13px] text-ink">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-subtle" />
          <span className="truncate">{activeMilestone.title}</span>
        </p>
      )}
```

- The `<MilestoneProgress milestones={project.milestones} className="mt-4" />` call is left as-is — it now defaults to neutral.

- [ ] **Step 2: Verify**

Run: `npm run build` → clean.
Grep check: `grep -n "brand-persimmon" src/components/portal/project-card.tsx` → only the `hover:` / `group-hover:` / `glow-persimmon` lines remain, no resting `bg-brand-persimmon`.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/project-card.tsx
git commit -m "$(printf 'feat(design): quiet the project card — neutral badge, static dot\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 4: `getClientDeliverables` accessor

**Files:**
- Modify: `src/lib/data/portal.ts`
- Test: covered by the Task 8 `phase3-verify` extension (no unit test — the file's other accessors have none, and this is a thin query).

**Interfaces:**
- Produces:
  ```ts
  export async function getClientDeliverables(clientId: string): Promise<Deliverable[]>
  ```
  Returns every deliverable for the client, newest first. Used by the dashboard for the hero (first `status === "pending"`) and the attention panel (counts + recent decisions).

- [ ] **Step 1: Add the accessor**

Append to `src/lib/data/portal.ts` (after `getDeliverable`):

```ts
/**
 * Every deliverable for the client, newest first. Sorted in memory — a client
 * has tens of deliverables at most, and this avoids a (clientId, createdAt)
 * composite index that only the dashboard would use.
 */
export async function getClientDeliverables(clientId: string): Promise<Deliverable[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.deliverables)
    .where("clientId", "==", clientId)
    .get();
  return snap.docs
    .map((d) => d.data() as Deliverable)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/portal.ts
git commit -m "$(printf 'feat(portal): getClientDeliverables — all deliverables for a client\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 5: `LatestDeliveryHero` component

**Files:**
- Create: `src/components/portal/latest-delivery-hero.tsx`

Verified via the Task 8 dashboard screenshot + the `phase3-verify` hero check (Task 8 Step 3). No unit test (presentational, no branching logic beyond the `pending ?? lastDecided` fallback).

**Interfaces:**
- Consumes: `Deliverable` from `@/types`; `formatDate` from `@/lib/format`.
- Produces:
  ```ts
  export function LatestDeliveryHero(props: {
    pending: Deliverable | null;       // most recent status === "pending"
    lastDecided: Deliverable | null;   // most recent status !== "pending", for the empty state
  }): JSX.Element | null
  ```
  Renders nothing (`null`) when both are null. When `pending` is set: the "review me" state — contained cover, eyebrow "New from Voltair Studio" (muted), Sentient title, persimmon **Open review** button linking to `/projects/{projectId}/deliverables/{deliverableId}`. Otherwise: the quiet state — same cover, "Latest delivery", an "Approved {date}" line, a neutral **View** link.

- [ ] **Step 1: Implement**

`src/components/portal/latest-delivery-hero.tsx`:

```tsx
import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import type { Deliverable } from "@/types";
import { formatDate } from "@/lib/format";

function Cover({ d }: { d: Deliverable }) {
  if (d.fileType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={d.fileUrl}
        alt=""
        className="aspect-[20/9] w-full object-cover"
        loading="eager"
        decoding="async"
      />
    );
  }
  return (
    <div className="brand-glow flex aspect-[20/9] w-full items-center justify-center bg-surface-2">
      <Flame className="size-8 text-brand-persimmon/70" />
    </div>
  );
}

export function LatestDeliveryHero({
  pending,
  lastDecided,
}: {
  pending: Deliverable | null;
  lastDecided: Deliverable | null;
}) {
  const d = pending ?? lastDecided;
  if (!d) return null;
  const href = `/projects/${d.projectId}/deliverables/${d.deliverableId}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface-1">
      <Cover d={d} />
      <div className="p-4 sm:p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          {pending ? "New from Voltair Studio" : "Latest delivery"}
        </p>
        <h2 className="mt-1.5 text-lg text-ink">{d.name}</h2>
        {pending ? (
          <Link
            href={href}
            className="mt-3.5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-persimmon px-4 text-[13px] font-semibold text-brand-persimmon-fg transition-opacity hover:opacity-90"
          >
            Open review
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[13px] text-ink-muted">
              {d.status === "approved" ? "Approved" : "Changes requested"}
              {d.decidedAt ? ` ${formatDate(d.decidedAt)}` : ""}
            </span>
            <Link href={href} className="text-[13px] text-ink-subtle hover:text-ink">
              View
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/latest-delivery-hero.tsx
git commit -m "$(printf 'feat(portal): LatestDeliveryHero — dashboard hero for the newest deliverable\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 6: `AttentionPanel` component

**Files:**
- Create: `src/components/portal/attention-panel.tsx`

Verified via the Task 8 dashboard screenshot + a `phase3-verify` text check (Task 8 Step 3). No unit test.

**Interfaces:**
- Consumes: nothing from other tasks (pure props).
- Produces:
  ```ts
  export function AttentionPanel(props: {
    pendingCount: number;
    recent: { label: string; when: string }[];  // when = already-formatted, e.g. "2d ago"
  }): JSX.Element
  ```
  Renders a bordered panel: heading "Needs your attention", a line "{n} deliverable(s) to review" (or "You're all caught up" when 0), then up to 4 `recent` rows under a divider. No persimmon.

- [ ] **Step 1: Implement**

`src/components/portal/attention-panel.tsx`:

```tsx
export function AttentionPanel({
  pendingCount,
  recent,
}: {
  pendingCount: number;
  recent: { label: string; when: string }[];
}) {
  return (
    <div className="rounded-xl border border-line-strong bg-surface-1 p-4 sm:p-5">
      <h3 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
        Needs your attention
      </h3>
      <p className="mt-2 text-sm font-medium text-ink">
        {pendingCount === 0
          ? "You're all caught up"
          : `${pendingCount} deliverable${pendingCount === 1 ? "" : "s"} to review`}
      </p>
      {recent.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
          {recent.slice(0, 4).map((r, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-xs text-ink-muted">
              <span className="truncate">{r.label}</span>
              <span className="tnum shrink-0 text-ink-subtle">{r.when}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/attention-panel.tsx
git commit -m "$(printf 'feat(portal): AttentionPanel — dashboard summary of what needs the client\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 7: `ProjectList` component

**Files:**
- Create: `src/components/portal/project-list.tsx`

Verified via the Task 8 dashboard + projects screenshots and the `phase3-verify` neutral/active bar check (Task 8 Step 3).

**Interfaces:**
- Consumes: `Project` from `@/types`; `MilestoneProgress` (Task 2); `STAGE_LABELS` from `@/types`; `Badge`.
- Produces:
  ```ts
  export function ProjectList(props: {
    projects: Project[];
    awaitingClient?: Set<string>;   // projectIds whose latest deliverable is pending
  }): JSX.Element
  ```
  A full-width list — each row links to `/projects/{projectId}`, shows the name (via `<h3>` — inherits the display font), a `MilestoneProgress` (tone `"active"` iff `awaitingClient.has(projectId)`), and a neutral stage `Badge`. Rows separated by `divide-y divide-line`. No wrapping card.

- [ ] **Step 1: Implement**

`src/components/portal/project-list.tsx`:

```tsx
import Link from "next/link";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, type Project } from "@/types";

export function ProjectList({
  projects,
  awaitingClient,
}: {
  projects: Project[];
  awaitingClient?: Set<string>;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {projects.map((p) => {
        const awaiting = awaitingClient?.has(p.projectId) ?? false;
        return (
          <li key={p.projectId}>
            <Link
              href={`/projects/${p.projectId}`}
              className="grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-3 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <h3 className="truncate text-[15px] text-ink">{p.name}</h3>
                {p.description && (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{p.description}</p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <MilestoneProgress milestones={p.milestones} tone={awaiting ? "active" : "neutral"} />
              </div>
              <Badge tone="neutral">{STAGE_LABELS[p.stage]}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/project-list.tsx
git commit -m "$(printf 'feat(portal): ProjectList — full-width project rows, replaces the card grid\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 8: Rebuild the dashboard (layout A) + projects page

**Files:**
- Modify: `src/app/(portal)/dashboard/page.tsx`, `src/app/(portal)/projects/page.tsx`
- Modify: `scripts/phase3-verify.mjs`

**Interfaces:**
- Consumes: `getClientDeliverables` (Task 4), `LatestDeliveryHero` (Task 5), `AttentionPanel` (Task 6), `ProjectList` (Task 7), `relativeTime` from `@/lib/format`.

- [ ] **Step 1: Rewrite `src/app/(portal)/dashboard/page.tsx`**

```tsx
import type { Metadata } from "next";
import { AttentionPanel } from "@/components/portal/attention-panel";
import { LatestDeliveryHero } from "@/components/portal/latest-delivery-hero";
import { ProjectList } from "@/components/portal/project-list";
import { getClientCompany, getClientDeliverables, getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";
import { relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireClient();
  const clientId = user.clientId ?? "";
  const [company, projects, deliverables] = await Promise.all([
    getClientCompany(clientId),
    getProjects(clientId),
    getClientDeliverables(clientId),
  ]);

  const firstName = user.name?.split(" ")[0] ?? null;
  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");

  const pending = deliverables.filter((d) => d.status === "pending");
  const hero = pending[0] ?? null;
  const lastDecided = deliverables.find((d) => d.status !== "pending") ?? null;
  const awaitingClient = new Set(pending.map((d) => d.projectId));

  const recent = deliverables
    .filter((d) => d.status !== "pending" && d.decidedAt)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
    .slice(0, 4)
    .map((d) => ({
      label: `${d.name} · ${d.status === "approved" ? "approved" : "changes requested"}`,
      when: relativeTime(d.decidedAt as string),
    }));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl text-ink">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {company?.name ?? "Your studio workspace"} · {active.length}{" "}
          {active.length === 1 ? "project" : "projects"} in progress
        </p>
      </header>

      {(hero || lastDecided) && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <LatestDeliveryHero pending={hero} lastDecided={lastDecided} />
          <AttentionPanel pendingCount={pending.length} recent={recent} />
        </div>
      )}

      {active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Your projects
          </h2>
          <ProjectList projects={active} awaitingClient={awaitingClient} />
        </section>
      ) : (
        <EmptyProjects />
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Past projects
          </h2>
          <ProjectList projects={past} />
        </section>
      )}
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-1/50 px-5 py-12 text-center">
      <p className="text-sm font-medium text-ink">No projects yet</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-muted">
        Voltair Studio will add your projects here as they kick off. You&rsquo;ll get an email
        when the first one is ready to review.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/(portal)/projects/page.tsx`**

```tsx
import type { Metadata } from "next";
import { ProjectList } from "@/components/portal/project-list";
import { getClientDeliverables, getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireClient();
  const clientId = user.clientId ?? "";
  const [projects, deliverables] = await Promise.all([
    getProjects(clientId),
    getClientDeliverables(clientId),
  ]);

  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");
  const awaitingClient = new Set(
    deliverables.filter((d) => d.status === "pending").map((d) => d.projectId),
  );

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every engagement with Voltair Studio, past and present.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          No projects yet.
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
                In progress
              </h2>
              <ProjectList projects={active} awaitingClient={awaitingClient} />
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
                Completed &amp; paused
              </h2>
              <ProjectList projects={past} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Fix `scripts/phase3-verify.mjs` selectors**

The dashboard rewrite removes the milestone-stat block and the `ProjectCard` grid. Update the mobile-section checks:
- Any `page.click("text=Brand Film 2026")` on the dashboard still works (the project name is a link in `ProjectList`).
- The desktop check `d.isVisible('[data-testid="sidebar"]')` is unaffected.
- Add, in the desktop dashboard block (after login + `waitForSelector("text=Brand Film 2026")`):

```js
  record(
    "dashboard hero shows the latest deliverable",
    (await d.isVisible("text=New from Voltair Studio")) ||
      (await d.isVisible("text=Latest delivery")),
  );
  record(
    "attention panel renders",
    (await d.isVisible("text=Needs your attention")),
  );
  // one persimmon bar (the project awaiting the client) and at least one neutral bar
  const fills = await d.$$eval("[data-fill]", (els) =>
    els.map((e) => getComputedStyle(e).backgroundColor),
  );
  const persimmonish = (c) => /rgb\(255,\s*79,\s*0\)/.test(c);
  record(
    "exactly one project bar is persimmon (client's turn)",
    fills.filter(persimmonish).length === 1 && fills.length >= 2,
  );
```

If a check asserted the "Milestones completed across active projects" text, delete that line.

- [ ] **Step 4: Build + typecheck + unit + E2E**

```bash
npx tsc --noEmit
npm run build
npx vitest run --project unit
node --env-file=.env.local scripts/phase3-verify.mjs
```
Expected: tsc clean; build clean; unit all pass; phase3 all checks pass (with the updated hero check).

- [ ] **Step 5: Screenshot the dashboard at 1440 + 390**

Reuse a throwaway Playwright script (login `client@acme.test` / `voltair123`, screenshot `/dashboard` and `/projects`). Confirm visually: Sentient headings, hero card with cover + persimmon "Open review", neutral project rows, one persimmon bar for the project with a pending deliverable, no horizontal scroll at 390.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(portal)/dashboard/page.tsx" "src/app/(portal)/projects/page.tsx" scripts/phase3-verify.mjs
git commit -m "$(printf 'feat(portal): dashboard layout A — latest-delivery hero + project list\n\nReplaces the milestone-stat block and the ProjectCard grid with the\nLatestDeliveryHero + AttentionPanel + full-width ProjectList. Projects page\nuses the same list.\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 9: Heading + spacing pass on project detail & account

**Files:**
- Modify: `src/app/(portal)/projects/[projectId]/page.tsx`, `src/app/(portal)/account/page.tsx`

**Interfaces:** none — visual only. No new components, no data changes.

- [ ] **Step 1: Project detail page**

Read the file first. Apply, without restructuring the milestone rail or Developer Pulse:
- The page `<h1>` (project name) → ensure it uses `text-2xl` (inherits Sentient). Remove any `font-semibold` on `h1`/`h2` (the base rule sets weight 500).
- Section sub-headings ("Milestones", "Developer Pulse", "Deliverables") → `text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle` for consistency with the dashboard, OR leave as `text-sm text-ink` — pick one and use it on all three.
- Where a section is wrapped in `rounded-xl border border-zinc-800 bg-surface-1 p-*` purely as a container (not a card of content), replace with a plain `border-t border-line pt-*` divider + heading. The milestone rail and any deliverable cards stay as they are.
- Deliverable list items: if they use `MilestoneProgress` or a persimmon fill, none applies here; leave the `DeliverableStatusBadge`.

- [ ] **Step 2: Account page**

Read the file first. It is very sparse. Apply:
- `<h1>` → `text-2xl` (Sentient).
- Widen the content: if it is constrained to a narrow `max-w-*`, raise to `max-w-2xl` and give the two cards real vertical rhythm (`space-y-4` between, `p-5` inside).
- The "Sign out" row: keep, but the sign-out text link is fine as the one interactive accent — no persimmon fill needed.

- [ ] **Step 3: Verify**

```bash
npm run build
node --env-file=.env.local scripts/phase3-verify.mjs
```
Expected: clean; phase3 green. Screenshot `/projects/acme-brand-film` and `/account` — headings in Sentient, no lone cards floating in empty space.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(portal)/projects/[projectId]/page.tsx" "src/app/(portal)/account/page.tsx"
git commit -m "$(printf 'feat(design): heading + spacing pass on project detail and account\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Task 10: Final regression + cleanup

**Files:**
- Possibly delete: `src/components/portal/project-card.tsx` if nothing imports it after Task 8/9.
- Modify: `scripts/phase3-verify.mjs` only if a screenshot revealed a broken selector.

- [ ] **Step 1: Dead-code check**

```bash
grep -rn "project-card\|ProjectCard" src --include="*.tsx" --include="*.ts"
```
If the only hits are the file itself and its (now-updated) test, delete `src/components/portal/project-card.tsx` and its test, and remove the "Modified" note for it. If the project *detail* page still uses it for the header, keep it.

- [ ] **Step 2: Full suite**

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run --project unit
node --env-file=.env.local scripts/phase3-verify.mjs
node --env-file=.env.local scripts/phase4-verify.mjs
```
Expected: tsc clean; lint 0 errors (pre-existing warnings in `android/app/build/**` are fine); build clean; unit all pass; phase3 13+ checks pass; phase4 11 checks pass (admin portal untouched by Phase A — this is a guard).

- [ ] **Step 3: Screenshot review at 1440 + 390**

Dashboard, projects, project detail, account, login. Confirm the six principles from the spec §2 hold: one persimmon fill per screen, Sentient headings, Satoshi body, no card-soup, canvas used, no horizontal scroll on mobile.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A -- src scripts
git commit -m "$(printf 'chore(portal): remove unused ProjectCard, phase-A regression pass\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>')"
```

---

## Self-review notes

- **Spec §1 (typography):** Task 1. Geist Mono retained. Marketing-site adoption explicitly out of scope.
- **Spec §2 (principles):** persimmon discipline — Tasks 2, 3, 7, 8 (bars neutral; badges neutral; one CTA per screen). Break the card grid — Tasks 7, 8, 9. Use the canvas — Tasks 8, 9. Motion — no new animation added; Task 3 removes the `pulse-persimmon` dot. Palette unchanged — enforced by Global Constraints.
- **Spec §3 (dashboard):** Tasks 5, 6, 7, 8. Hero pending vs. quiet state covered (Task 5 test). Neutral bars with the persimmon exception (Task 2 + Task 7 `awaitingClient`).
- **Spec §4 (deliverables as sets):** **Phase B — not this plan.** Task 5's `Cover` reads `fileUrl`/`fileType` directly as an interim.
- **Spec §5 phasing:** this plan is Phase A only. B, C, D get their own plans.
- **Spec §6 (out of scope):** respected — no rules/model/auth changes; `getClientDeliverables` is read-only.
- **Spec §7 (testing):** repo has no component-test stack and none is added (Global Constraints). `milestoneStats` gets a Node-env `*.test.ts`; the new components are verified by `phase3-verify` (extended: hero + attention panel + one-persimmon-bar checks) + `npm run build` + screenshots. `phase4-verify` run as a guard in Task 10.
- **Type consistency:** `getClientDeliverables → Deliverable[]` consumed by Task 8; `LatestDeliveryHero({pending, lastDecided})` matches Task 8's call; `ProjectList({projects, awaitingClient})` matches Task 8's call; `MilestoneProgress` `tone` added in Task 2 and used in Tasks 3, 7. `relativeTime` and `formatDate` are existing exports of `@/lib/format` (used already in `studio-inbox.tsx` / `project-card.tsx`).
- **Open risk:** Task 1 Step 1 depends on Fontshare's CDN being scriptable; the zip fallback is documented. If neither works in the execution environment, the user supplies the five `.woff2` files.
