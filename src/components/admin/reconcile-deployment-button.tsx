"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reconcileProjectDeploymentStatus } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import type { DeploymentState } from "@/types";

export function ReconcileDeploymentButton({
  projectId,
  state,
}: {
  projectId: string;
  state: DeploymentState | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function sync() {
    setMessage(null);
    start(async () => {
      const result = await reconcileProjectDeploymentStatus(projectId);
      if (result.ok) {
        setMessage(
          result.state
            ? `Deployment status is “${result.state}”.`
            : "Badge cleared — the next deploy webhook will refresh it.",
        );
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon disabled:opacity-55"
      >
        <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        {pending ? "Syncing…" : "Sync deployment status"}
      </button>
      <span className="text-[11px] text-ink-subtle">
        {message ?? (state ? `currently: ${state}` : "no deployment recorded")}
      </span>
    </div>
  );
}
