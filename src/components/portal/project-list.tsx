import Link from "next/link";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, type Project } from "@/types";

export function ProjectList({
  projects,
  awaitingClient,
}: {
  projects: Project[];
  awaitingClient?: Set<string>;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {projects.map((p) => {
        const awaiting = awaitingClient?.has(p.projectId) ?? false;
        return (
          <li key={p.projectId}>
            <Link
              href={`/projects/${p.projectId}`}
              className="grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-3 py-4 transition-colors hover:bg-surface-1/50 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <h3 className="truncate text-[15px] text-ink">{p.name}</h3>
                {p.description && (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{p.description}</p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <MilestoneProgress
                  milestones={p.milestones}
                  tone={awaiting ? "active" : "neutral"}
                />
              </div>
              <Badge tone="neutral">{STAGE_LABELS[p.stage]}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
