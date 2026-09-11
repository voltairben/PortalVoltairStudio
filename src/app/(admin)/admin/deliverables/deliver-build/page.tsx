import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeliverBuildFormLazy } from "@/components/admin/deliver-build-form-lazy";
import { PageHeader } from "@/components/admin/page-header";
import { getUploadTargets } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Deliver a build" };

export default async function DeliverBuildPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireAdmin();
  const [{ project }, targets] = await Promise.all([searchParams, getUploadTargets()]);

  return (
    <div className="max-w-2xl space-y-7">
      <div>
        <Link
          href="/admin/deliverables"
          className="inline-flex items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Deliverables
        </Link>
        <PageHeader
          title="Deliver a build"
          subtitle="Record the live URL and a screenshot of a delivered website build."
        />
      </div>

      {targets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-10 text-center text-sm text-ink-muted">
          Create a project first, then deliver a build to it.
        </p>
      ) : (
        <DeliverBuildFormLazy targets={targets} preselectedProjectId={project} />
      )}
    </div>
  );
}
