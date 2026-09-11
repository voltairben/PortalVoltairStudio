import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { Badge } from "@/components/ui/badge";
import type { ProjectRow } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { STAGE_LABELS } from "@/types";

/**
 * Full-width divided rows — the same "break the card grid" move as the
 * client portal's ProjectList, adapted for admin: shows which client each
 * project belongs to, and skips the client-only "awaiting" signal (admin
 * has no single "your turn" project the way a client does).
 */
export function AdminProjectList({ projects }: { projects: ProjectRow[] }) {
  return (
    <ul className="divide-y divide-zinc-800 border-y border-zinc-800">
      {projects.map((p) => (
        <li key={p.projectId}>
          <Link
            href={`/admin/projects/${p.projectId}`}
            className="group grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 py-4 transition-colors hover:bg-surface-1/50 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_7rem_1.5rem] sm:items-center sm:gap-x-6"
          >
            <div className="min-w-0 sm:col-start-1 sm:row-start-1">
              <p className="truncate text-[15px] text-ink">{p.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-subtle">{p.clientName}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5 justify-self-end self-start sm:col-start-3 sm:row-start-1 sm:self-center">
              <Badge tone="neutral">{STAGE_LABELS[p.stage]}</Badge>
              {p.status !== "active" && <Badge tone="neutral">{p.status}</Badge>}
            </div>
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
              <MilestoneProgress milestones={p.milestones} />
              <p className="tnum mt-1.5 text-[11px] text-ink-subtle">
                Started {formatDate(p.timeline.startDate)}
              </p>
            </div>
            <ChevronRight className="hidden size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-brand-persimmon sm:col-start-4 sm:row-start-1 sm:block sm:justify-self-end" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
