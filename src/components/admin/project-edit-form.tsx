"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateProject } from "@/lib/actions/admin";
import { STAGE_LABELS, type Project } from "@/types";

const STAGES = Object.entries(STAGE_LABELS) as [keyof typeof STAGE_LABELS, string][];
const STATUSES = ["active", "paused", "completed"] as const;

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-800 bg-brand-obsidian px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25";

export function ProjectEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateProject({
        projectId: project.projectId,
        name: formData.get("name"),
        description: formData.get("description") ?? "",
        stage: formData.get("stage"),
        status: formData.get("status"),
        vercelPreviewUrl: formData.get("vercelPreviewUrl") ?? "",
        githubRepo: formData.get("githubRepo") ?? "",
      });
      if (result.ok) {
        setSavedAt(Date.now());
        router.refresh();
      } else {
        setError(result.error ?? "Could not save.");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-3.5">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Project name
        </span>
        <input name="name" defaultValue={project.name} required className={inputCls} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Description
        </span>
        <textarea
          name="description"
          defaultValue={project.description ?? ""}
          rows={2}
          className={`${inputCls} h-auto resize-none py-2`}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Stage
          </span>
          <select name="stage" defaultValue={project.stage} className={inputCls}>
            {STAGES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Status
          </span>
          <select name="status" defaultValue={project.status} className={inputCls}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Vercel preview URL
        </span>
        <input
          name="vercelPreviewUrl"
          defaultValue={project.vercelPreviewUrl ?? ""}
          placeholder="https://acme-site.vercel.app"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          GitHub repo
        </span>
        <input
          name="githubRepo"
          defaultValue={project.githubRepo ?? ""}
          placeholder="voltairben/acme-site"
          className={inputCls}
        />
      </label>

      {error && <p className="text-[12px] text-critical">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" loading={pending} className="h-9 px-4 text-[13px]">
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {savedAt && !pending && <span className="text-[11px] text-positive">Saved</span>}
      </div>
    </form>
  );
}
