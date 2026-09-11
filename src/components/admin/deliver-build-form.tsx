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
    const parsed = new URL(v.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Enter a full http(s) URL.";
    }
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
  const [emailSent, setEmailSent] = useState(false);

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
      const numeric = parseInt(versionLabel.match(/\d+/)?.[0] ?? "1", 10) || 1;

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
        setEmailSent(!!result.emailSent);
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
    setEmailSent(false);
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-positive/30 bg-positive/10 text-positive">
          <Check className="size-5" />
        </span>
        <p className="mt-3 text-[15px] font-medium text-ink">Build delivered</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          {emailSent
            ? `${target?.clientName} was emailed a review link.`
            : `Saved — the notification email to ${target?.clientName} didn't send. You may want to follow up directly.`}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {resultId && target && (
            <Link
              href={`/admin/projects/${target.projectId}/deliverables/${resultId}`}
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
