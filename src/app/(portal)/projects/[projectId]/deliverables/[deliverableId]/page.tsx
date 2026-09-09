import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { DeliverableReview } from "@/components/review/deliverable-review";
import { getDeliverable, getInitialComments, getProject } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";

type Params = Promise<{ projectId: string; deliverableId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { deliverableId } = await params;
  const user = await requireClient();
  const deliverable = await getDeliverable(deliverableId, user.clientId ?? "");
  return { title: deliverable?.name ?? "Deliverable" };
}

export default async function DeliverablePage({ params }: { params: Params }) {
  const { projectId, deliverableId } = await params;
  const user = await requireClient();
  const clientId = user.clientId ?? "";

  const [project, deliverable] = await Promise.all([
    getProject(projectId, clientId),
    getDeliverable(deliverableId, clientId),
  ]);
  if (!project || !deliverable || deliverable.projectId !== projectId) notFound();

  const initialComments = await getInitialComments(deliverableId, clientId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          {project.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{deliverable.name}</h1>
          <span className="tnum font-mono text-[12px] text-ink-subtle">v{deliverable.version}</span>
          <DeliverableStatusBadge status={deliverable.status} />
        </div>
        <p className="tnum mt-1 text-[12px] text-ink-subtle">
          Published {formatDate(deliverable.createdAt)}
        </p>
      </div>

      <DeliverableReview
        deliverable={deliverable}
        projectId={projectId}
        user={{ uid: user.uid, name: user.name ?? user.email ?? "Client", clientId }}
        initialComments={initialComments}
      />
    </div>
  );
}
