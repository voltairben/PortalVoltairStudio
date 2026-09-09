import Link from "next/link";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { FileTypeIcon } from "@/components/portal/file-type-icon";
import { formatDate } from "@/lib/format";
import type { Deliverable } from "@/types";

export function DeliverableGrid({
  projectId,
  deliverables,
}: {
  projectId: string;
  deliverables: Deliverable[];
}) {
  if (deliverables.length === 0) {
    return (
      <p className="text-[13px] text-ink-subtle">
        No deliverables yet — Voltair Studio will publish work here for your review.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {deliverables.map((d) => (
        <Link
          key={d.deliverableId}
          href={`/projects/${projectId}/deliverables/${d.deliverableId}`}
          className="group flex flex-col rounded-xl border border-zinc-800 bg-surface-1 p-4 transition-[border-color,box-shadow] duration-200 hover:glow-persimmon"
        >
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-lg border border-zinc-800 bg-surface-2 text-ink-muted transition-colors group-hover:text-brand-persimmon">
              <FileTypeIcon type={d.fileType} className="size-4" />
            </span>
            <span className="tnum font-mono text-[11px] text-ink-subtle">
              {d.versionLabel ?? `v${d.version}`}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-[14px] font-medium text-ink">{d.name}</p>
          <p className="tnum mt-1 text-[11px] text-ink-subtle">{formatDate(d.createdAt)}</p>
          <div className="mt-3">
            <DeliverableStatusBadge status={d.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
