import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { DeliverableReview } from "@/components/review/deliverable-review";
import { getAdminDeliverableReview } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";

type Params = Promise<{ projectId: string; deliverableId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await requireAdmin();
  const { projectId, deliverableId } = await params;
  const view = await getAdminDeliverableReview(projectId, deliverableId);
  return { title: view ? `${view.deliverable.name} · Admin` : "Deliverable" };
}

export default async function AdminDeliverablePage({ params }: { params: Params }) {
  const user = await requireAdmin();
  const { projectId, deliverableId } = await params;
  const view = await getAdminDeliverableReview(projectId, deliverableId);
  if (!view) notFound();
  const { project, deliverable, comments } = view;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          {project.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{deliverable.name}</h1>
          <span className="tnum font-mono text-[12px] text-ink-subtle">
            {deliverable.versionLabel ?? `v${deliverable.version}`}
          </span>
          <DeliverableStatusBadge status={deliverable.status} />
        </div>
        <p className="tnum mt-1 text-[12px] text-ink-subtle">
          Published {formatDate(deliverable.createdAt)} · for {project.name}
        </p>
      </div>

      <DeliverableReview
        asStudio
        deliverable={deliverable}
        projectId={projectId}
        user={{
          uid: user.uid,
          name: user.name ?? "Voltair Studio",
          clientId: deliverable.clientId,
        }}
        initialComments={comments}
      />
    </div>
  );
}
