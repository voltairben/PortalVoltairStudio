import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { DeliverableGrid } from "@/components/portal/deliverable-grid";
import { DeveloperPulse } from "@/components/portal/developer-pulse";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { MilestoneRail } from "@/components/portal/milestone-rail";
import { StagingPreview } from "@/components/portal/staging-preview";
import { Badge } from "@/components/ui/badge";
import { getDeliverables, getInitialPulse, getProject } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";
import { STAGE_LABELS } from "@/types";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId } = await params;
  const user = await requireClient();
  const project = await getProject(projectId, user.clientId ?? "");
  return { title: project?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const user = await requireClient();
  const project = await getProject(projectId, user.clientId ?? "");
  if (!project) notFound();

  const [deliverables, pulse] = await Promise.all([
    getDeliverables(projectId, user.clientId ?? ""),
    getInitialPulse(projectId, user.clientId ?? ""),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Projects
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl text-ink">{project.name}</h1>
          <Badge tone="neutral">{STAGE_LABELS[project.stage]}</Badge>
          {project.status === "completed" && <Badge tone="neutral">Completed</Badge>}
          {project.status === "paused" && <Badge tone="neutral">Paused</Badge>}
        </div>
        {project.description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-muted">
            {project.description}
          </p>
        )}
        <p className="tnum mt-2 text-[12px] text-ink-subtle">
          {formatDate(project.timeline.startDate)} &ndash;{" "}
          {project.timeline.endDate ? formatDate(project.timeline.endDate) : "ongoing"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-line-strong bg-surface-1 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
              Milestones
            </h2>
            <MilestoneProgress milestones={project.milestones} className="w-32" />
          </div>
          <MilestoneRail milestones={project.milestones} />
        </section>

        <aside className="space-y-4">
          {project.vercelPreviewUrl ? (
            <StagingPreview url={project.vercelPreviewUrl} />
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface-1/50 p-5 text-center text-[12px] text-ink-subtle">
              A staging preview link will appear here during the build phase.
            </div>
          )}
        </aside>
      </div>

      <DeveloperPulse
        projectId={projectId}
        clientId={user.clientId ?? ""}
        initialEvents={pulse}
        initialDeployment={project.deployment}
      />

      <section className="space-y-4">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          Deliverables{" "}
          <span className="tnum ml-1 font-mono normal-case tracking-normal text-ink-subtle">
            {deliverables.length}
          </span>
        </h2>
        <DeliverableGrid projectId={projectId} deliverables={deliverables} />
      </section>
    </div>
  );
}
