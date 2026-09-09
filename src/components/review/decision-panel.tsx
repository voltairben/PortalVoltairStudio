"use client";

import { CircleCheck, PartyPopper, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DELIVERABLE_STATUS_META } from "@/components/portal/deliverable-status";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { approveDeliverable } from "@/lib/actions/deliverables";
import { celebrate } from "@/lib/confetti";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliverableStatus } from "@/types";

const STATUS_BLOCK: Record<DeliverableStatus, string> = {
  pending: "border-caution/30 bg-caution/10 text-caution",
  approved: "border-positive/30 bg-positive/10 text-positive",
  "changes-requested": "border-critical/30 bg-critical/10 text-critical",
};

export function DecisionPanel({
  deliverableId,
  projectId,
  status,
  decidedAt,
  onRequestChanges,
}: {
  deliverableId: string;
  projectId: string;
  status: DeliverableStatus;
  decidedAt: string | null;
  onRequestChanges: () => void;
}) {
  const router = useRouter();
  // Optimistic override until router.refresh() brings the updated prop through.
  const [override, setOverride] = useState<DeliverableStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = override ?? status;

  function confirmApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveDeliverable({ deliverableId, projectId });
      if (result.ok) {
        setOverride("approved");
        setModalOpen(false);
        celebrate();
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong. Try again.");
      }
    });
  }

  const meta = DELIVERABLE_STATUS_META[current];
  const approved = current === "approved";

  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
      <div className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium", STATUS_BLOCK[current])}>
        <meta.Icon className="size-4 shrink-0" />
        <span>{meta.label}</span>
        {decidedAt && current !== "pending" && (
          <span className="tnum ml-auto font-mono text-[11px] opacity-70">{formatDate(decidedAt)}</span>
        )}
      </div>

      {approved ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-start gap-2 text-[13px] leading-6 text-ink-muted">
            <PartyPopper className="mt-0.5 size-4 shrink-0 text-brand-persimmon" />
            Approved. Voltair Studio has been notified and will move the project forward.
          </p>
          <button
            type="button"
            onClick={onRequestChanges}
            className="text-[12px] text-ink-subtle underline-offset-2 transition-colors hover:text-brand-persimmon hover:underline"
          >
            Something to change? Request a revision
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <Button className="w-full focus-glow" onClick={() => setModalOpen(true)}>
            <CircleCheck className="size-4" />
            Approve deliverable
          </Button>
          <Button variant="outline" className="w-full focus-glow" onClick={onRequestChanges}>
            <PencilLine className="size-4" />
            Request changes
          </Button>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Approve this deliverable?">
        <p className="text-[13px] leading-6 text-ink-muted">
          This marks the work as approved and emails Voltair Studio right away. You can still
          request a revision afterward if something comes up.
        </p>
        {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1" loading={pending} onClick={confirmApprove}>
            Approve
          </Button>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
