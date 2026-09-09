"use client";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage";
import { Check, FileUp, Pause, Play, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createDeliverable } from "@/lib/actions/deliverables";
import type { UploadTarget } from "@/lib/data/admin";
import { storage } from "@/lib/firebase/client";
import type { DeliverableFileType } from "@/types";

const MAX_BYTES = 500 * 1024 * 1024;

function fileTypeOf(mime: string): DeliverableFileType {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "document";
  return "other";
}

function validate(f: File): string | null {
  if (f.size > MAX_BYTES) return "Files must be 500 MB or smaller.";
  if (fileTypeOf(f.type) === "other") return "Upload a video, image, or PDF.";
  return null;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function fmtEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  return `${Math.ceil(seconds / 60)} min left`;
}

type Phase = "idle" | "uploading" | "paused" | "finalizing" | "done" | "error";

export function DeliverableUpload({
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
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const taskRef = useRef<UploadTask | null>(null);
  const sampleRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: 0 });

  const target = useMemo(() => targets.find((t) => t.projectId === projectId), [targets, projectId]);
  const canStart =
    !!target && title.trim().length > 0 && versionLabel.trim().length > 0 && !!file && phase === "idle";

  function pickFile(files: FileList | null) {
    setFileError(null);
    const f = files?.[0];
    if (!f) return;
    const problem = validate(f);
    if (problem) {
      setFileError(problem);
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function start() {
    if (!canStart || !target || !file) return;
    setError(null);
    setPhase("uploading");
    sampleRef.current = { bytes: 0, time: Date.now() };

    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `deliverables/${target.clientId}/${target.projectId}/${Date.now()}-${safeName}`;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
    taskRef.current = task;

    task.on(
      "state_changed",
      (snap) => {
        const now = Date.now();
        const dt = (now - sampleRef.current.time) / 1000;
        if (dt > 0.4) {
          const instant = (snap.bytesTransferred - sampleRef.current.bytes) / dt;
          setSpeed((prev) => (prev ? prev * 0.6 + instant * 0.4 : instant));
          const remaining = snap.totalBytes - snap.bytesTransferred;
          setEta(remaining / Math.max(instant, 1));
          sampleRef.current = { bytes: snap.bytesTransferred, time: now };
        }
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        setPhase(snap.state === "paused" ? "paused" : "uploading");
      },
      (err) => {
        setError(err.message || "Upload failed.");
        setPhase("error");
        taskRef.current = null;
      },
      async () => {
        setPhase("finalizing");
        try {
          const fileUrl = await getDownloadURL(task.snapshot.ref);
          const numeric = parseInt(versionLabel.replace(/[^\d]/g, ""), 10) || 1;
          const result = await createDeliverable({
            projectId: target.projectId,
            clientId: target.clientId,
            name: title.trim(),
            fileUrl,
            storagePath: path,
            fileType: fileTypeOf(file.type),
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
          setError(err instanceof Error ? err.message : "Finalization failed.");
          setPhase("error");
        }
        taskRef.current = null;
      },
    );
  }

  function reset() {
    taskRef.current = null;
    setFile(null);
    setTitle("");
    setVersionLabel("v1.0");
    setMilestoneId("");
    setPhase("idle");
    setProgress(0);
    setSpeed(0);
    setEta(0);
    setError(null);
    setResultId(null);
  }

  const busy = phase === "uploading" || phase === "paused" || phase === "finalizing";

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-6 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-positive/30 bg-positive/10 text-positive">
          <Check className="size-5" />
        </span>
        <p className="mt-3 text-[15px] font-medium text-ink">Deliverable published</p>
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
            Upload another
          </Button>
        </div>
      </div>
    );
  }

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
                {t.clientName} — {t.name}
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
            placeholder="Brand Film — Cut v3"
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
            placeholder="v2.1"
            className={inputCls}
          />
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

      {/* Dropzone / progress */}
      {phase === "idle" && !file && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 px-4 py-12 text-center transition-colors hover:border-brand-persimmon/60"
        >
          <UploadCloud className="size-7 text-ink-subtle" />
          <span className="text-[13px] font-medium text-ink">Drop a file or click to browse</span>
          <span className="text-[11px] text-ink-subtle">MP4, PNG, JPG or PDF · up to 500 MB</span>
          <input
            type="file"
            accept="video/*,image/*,application/pdf"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files)}
          />
        </label>
      )}

      {file && (
        <div className="rounded-xl border border-zinc-800 bg-surface-1 p-4">
          <div className="flex items-center gap-3">
            <FileUp className="size-4 shrink-0 text-ink-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">{file.name}</p>
              <p className="tnum text-[11px] text-ink-subtle">{fmtBytes(file.size)}</p>
            </div>
            {phase === "idle" && (
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => setFile(null)}
                className="text-ink-subtle hover:text-critical"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {busy && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-brand-persimmon transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="tnum mt-2 flex items-center justify-between font-mono text-[11px] text-ink-subtle">
                <span className="text-brand-persimmon">
                  {phase === "finalizing" ? "Finalizing…" : `${progress}%`}
                </span>
                <span>
                  {phase === "paused"
                    ? "Paused"
                    : phase === "finalizing"
                      ? ""
                      : `${fmtBytes(speed)}/s · ${fmtEta(eta)}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {(fileError || error) && (
        <p className="text-[12px] text-critical">{fileError ?? error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" && (
          <Button onClick={start} disabled={!canStart}>
            <UploadCloud className="size-4" />
            Start upload
          </Button>
        )}
        {phase === "uploading" && (
          <Button variant="outline" onClick={() => taskRef.current?.pause()}>
            <Pause className="size-4" />
            Pause
          </Button>
        )}
        {phase === "paused" && (
          <Button variant="outline" onClick={() => taskRef.current?.resume()}>
            <Play className="size-4" />
            Resume
          </Button>
        )}
        {(phase === "uploading" || phase === "paused") && (
          <Button
            variant="ghost"
            onClick={() => {
              taskRef.current?.cancel();
              reset();
            }}
          >
            Cancel
          </Button>
        )}
        {phase === "error" && <Button onClick={reset}>Start over</Button>}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-800 bg-brand-obsidian px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25 disabled:opacity-60";
