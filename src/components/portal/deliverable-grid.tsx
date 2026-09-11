import Link from "next/link";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { FileTypeIcon } from "@/components/portal/file-type-icon";
import { formatDate } from "@/lib/format";
import type { Deliverable } from "@/types";

/** Render project deliverables as cover-aware review cards. */
export function DeliverableGrid({
  projectId,
  deliverables,
  basePath = "/projects",
  emptyMessage = "No deliverables yet — Voltair Studio will publish work here for your review.",
}: {
  projectId: string;
  deliverables: Deliverable[];
  /** Admin reuses this same grid — set to "/admin/projects" so the cards link into the studio review screen instead of the client one. */
  basePath?: string;
  emptyMessage?: string;
}) {
  if (deliverables.length === 0) {
    return <p className="text-[13px] text-ink-subtle">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {deliverables.map((d) => (
        <Link
          key={d.deliverableId}
          href={`${basePath}/${projectId}/deliverables/${d.deliverableId}`}
          className="group flex flex-col rounded-xl border border-zinc-800 bg-surface-1 p-4 transition-[border-color,box-shadow] duration-200 hover:glow-persimmon"
        >
          {d.coverUrl && (
            <div className="-mx-4 -mt-4 mb-3 aspect-video overflow-hidden rounded-t-xl border-b border-zinc-800 bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.coverUrl} alt="" className="size-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-lg border border-zinc-800 bg-surface-2 text-ink-muted transition-colors group-hover:text-brand-persimmon">
              <FileTypeIcon type={d.fileType} kind={d.kind} className="size-4" />
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
