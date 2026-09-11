"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createClientCompany } from "@/lib/actions/admin";
import type { OnboardResult } from "@/lib/onboarding/onboard-client";

export function ClientOnboardModal({ openOnLoad = false }: { openOnLoad?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OnboardResult | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    setDone(null);
    setCopied(false);
    router.replace("/admin/clients");
    router.refresh();
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClientCompany({
        companyName: formData.get("companyName"),
        displayName: formData.get("displayName"),
        email: formData.get("email"),
        initialProjectName: formData.get("initialProjectName") || undefined,
      });
      if (result.ok && result.data) {
        setDone(result.data);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        Onboard client
      </Button>

      <Modal open={open} onClose={close} title={done ? "Client onboarded" : "Onboard a new client"}>
        {done ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 text-[13px] leading-6 text-ink-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-positive" />
              Account created and the welcome email {done.emailSent ? "sent" : "queued"}.
              {done.projectId && " Their first project is ready."}
            </p>
            <div className="rounded-lg border border-zinc-800 bg-surface-2 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-subtle">Temporary password</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="tnum font-mono text-[14px] text-brand-persimmon">
                  {done.tempPassword}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(done.tempPassword).then(() => setCopied(true));
                  }}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <form action={onSubmit} className="space-y-3.5">
            <Field name="companyName" label="Company name" placeholder="Acme Corp" required />
            <Field name="displayName" label="Primary contact" placeholder="Ada Mercer" required />
            <Field
              name="email"
              label="Client email"
              type="email"
              placeholder="ada@acme.com"
              required
            />
            <Field
              name="initialProjectName"
              label="First project (optional)"
              placeholder="Client Project — Website"
            />
            {error && <p className="text-[12px] text-critical">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1" loading={pending}>
                {pending ? "Creating…" : "Create client"}
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border border-zinc-800 bg-brand-obsidian px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25"
      />
    </label>
  );
}
