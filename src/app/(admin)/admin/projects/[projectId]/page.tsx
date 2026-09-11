import { ChevronLeft, Globe, UploadCloud } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MilestoneEditor } from "@/components/admin/milestone-editor";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectEditForm } from "@/components/admin/project-edit-form";
import { ReconcileDeploymentButton } from "@/components/admin/reconcile-deployment-button";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { FileTypeIcon } from "@/components/portal/file-type-icon";
import { getAdminProject } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireAdmin();
  const { projectId } = await params;
  const view = await getAdminProject(projectId);
  return { title: view ? `${view.project.name} · Admin` : "Project" };
}

export default async function AdminProjectPage({ params }: { params: Params }) {
  await requireAdmin();
  const { projectId } = await params;
  const view = await getAdminProject(projectId);
  if (!view) notFound();
  const { project, client, deliverables } = view;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Projects
        </Link>
        <PageHeader
          title={project.name}
          subtitle={client?.name ?? project.clientId}
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/deliverables/deliver-build?project=${project.projectId}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
              >
                <Globe className="size-4" />
                Deliver a build
              </Link>
              <Link
                href={`/admin/deliverables/upload?project=${project.projectId}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
              >
                <UploadCloud className="size-4" />
                Upload deliverable
              </Link>
            </div>
          }
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Project details</h2>
          <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
            <ProjectEditForm project={project} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Milestone timeline</h2>
          <MilestoneEditor projectId={project.projectId} milestones={project.milestones} />
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Developer Pulse</h2>
        <div className="rounded-xl border border-zinc-800 bg-surface-1 p-4">
          <ReconcileDeploymentButton
            projectId={project.projectId}
            state={project.deployment?.state ?? null}
          />
          {!project.githubRepo && (
            <p className="mt-2 text-[11px] text-ink-subtle">
              Set a GitHub repo above so webhook events reach this project.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Deliverables{" "}
          <span className="tnum font-mono text-ink-subtle">({deliverables.length})</span>
        </h2>
        {deliverables.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-4 py-8 text-center text-[13px] text-ink-subtle">
            Nothing published yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
            {deliverables.map((d) => (
              <li key={d.deliverableId}>
                <Link
                  href={`/admin/projects/${project.projectId}/deliverables/${d.deliverableId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-zinc-800 bg-surface-2 text-ink-muted">
                    <FileTypeIcon type={d.fileType} kind={d.kind} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{d.name}</p>
                    <p className="tnum text-[11px] text-ink-subtle">
                      v{d.version} · {formatDate(d.createdAt)}
                      {d.feedbackCount > 0 &&
                        ` · ${d.feedbackCount} comment${d.feedbackCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <DeliverableStatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
