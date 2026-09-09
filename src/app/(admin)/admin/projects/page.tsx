import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectCreateForm } from "@/components/admin/project-create-form";
import { MilestoneProgress } from "@/components/portal/milestone-progress";
import { Badge } from "@/components/ui/badge";
import { getAllProjects, getClientOptions } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";
import { STAGE_LABELS } from "@/types";

export const metadata: Metadata = { title: "Projects & Milestones" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireAdmin();
  const [{ new: newParam }, projects, clients] = await Promise.all([
    searchParams,
    getAllProjects(),
    getClientOptions(),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Projects & milestones"
        subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} across all clients`}
        action={<ProjectCreateForm clients={clients} openOnLoad={newParam === "1"} />}
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          {clients.length === 0
            ? "Onboard a client first, then create a project for them."
            : "No projects yet. Create the first one."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.projectId}
              href={`/admin/projects/${p.projectId}`}
              className="group rounded-xl border border-zinc-800 bg-surface-1 p-5 transition-[border-color,box-shadow] duration-200 hover:glow-persimmon"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{p.name}</p>
                  <p className="mt-0.5 text-[12px] text-ink-subtle">{p.clientName}</p>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-brand-persimmon" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="persimmon">{STAGE_LABELS[p.stage]}</Badge>
                {p.status !== "active" && <Badge tone="neutral">{p.status}</Badge>}
              </div>
              <MilestoneProgress milestones={p.milestones} className="mt-4" />
              <p className="tnum mt-3 text-[11px] text-ink-subtle">
                Started {formatDate(p.timeline.startDate)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
