"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createProject } from "@/lib/actions/admin";
import { STAGE_LABELS } from "@/types";

const STAGES = Object.entries(STAGE_LABELS) as [keyof typeof STAGE_LABELS, string][];
const STATUSES = ["active", "paused", "completed"] as const;

export function ProjectCreateForm({
  clients,
  openOnLoad = false,
}: {
  clients: { clientId: string; name: string }[];
  openOnLoad?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad && clients.length > 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProject({
        clientId: formData.get("clientId"),
        name: formData.get("name"),
        description: formData.get("description") || "",
        stage: formData.get("stage"),
        status: formData.get("status"),
        vercelPreviewUrl: formData.get("vercelPreviewUrl") || "",
        githubRepo: formData.get("githubRepo") || "",
      });
      if (result.ok) {
        setOpen(false);
        router.push(`/admin/projects/${result.projectId}`);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        <Plus className="size-4" />
        New project
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Create a project">
        <form action={onSubmit} className="space-y-3.5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Client
            </span>
            <select name="clientId" required className={inputCls}>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <TextField name="name" label="Project name" placeholder="Website Redesign" required />
          <TextField name="description" label="Description (optional)" placeholder="Short summary" />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
                Stage
              </span>
              <select name="stage" defaultValue="onboarding" className={inputCls}>
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
              <select name="status" defaultValue="active" className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <TextField
            name="vercelPreviewUrl"
            label="Vercel preview URL (optional)"
            placeholder="https://acme-site.vercel.app"
          />
          <TextField
            name="githubRepo"
            label="GitHub repo (optional)"
            placeholder="voltairben/acme-site"
          />

          {error && <p className="text-[12px] text-critical">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" loading={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-800 bg-brand-obsidian px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25";

function TextField({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <input name={name} placeholder={placeholder} required={required} className={inputCls} />
    </label>
  );
}
