import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { STAGE_LABELS, type Project } from "@/types";

export function ProjectCard({ project }: { project: Project }) {
  const activeMilestone = project.milestones.find((m) => m.status === "active");

  return (
    <Link
      href={`/projects/${project.projectId}`}
      className="group block rounded-xl border border-zinc-800 bg-surface-1 p-5 transition-[border-color,box-shadow] duration-200 hover:glow-persimmon"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{project.name}</h3>
          {project.description && (
            <p className="mt-1 line-clamp-1 text-[13px] text-ink-muted">{project.description}</p>
          )}
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-brand-persimmon" />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Badge tone="persimmon">{STAGE_LABELS[project.stage]}</Badge>
        {project.status === "completed" && <Badge tone="neutral">Completed</Badge>}
        {project.status === "paused" && <Badge tone="neutral">Paused</Badge>}
      </div>

      {activeMilestone && (
        <p className="mt-3.5 flex items-center gap-2 text-[13px] text-ink">
          <span aria-hidden className="pulse-persimmon size-1.5 rounded-full bg-brand-persimmon" />
          <span className="truncate">{activeMilestone.title}</span>
        </p>
      )}

      <MilestoneProgress milestones={project.milestones} className="mt-4" />

      <p className="tnum mt-3 text-[11px] text-ink-subtle">
        {formatDate(project.timeline.startDate)} &ndash;{" "}
        {project.timeline.endDate ? formatDate(project.timeline.endDate) : "ongoing"}
      </p>
    </Link>
  );
}
