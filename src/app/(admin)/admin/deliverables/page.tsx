import { Globe, UploadCloud } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import { FileTypeIcon } from "@/components/portal/file-type-icon";
import { getAllDeliverables } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Deliverables" };

export default async function AdminDeliverablesPage() {
  await requireAdmin();
  const deliverables = await getAllDeliverables();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Deliverables"
        subtitle={`${deliverables.length} published across all projects`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/deliverables/deliver-build"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-surface-1 px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
            >
              <Globe className="size-4" />
              Deliver a build
            </Link>
            <Link
              href="/admin/deliverables/upload"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-persimmon px-4 text-[13px] font-medium text-brand-persimmon-fg transition-colors hover:bg-brand-persimmon-bright"
            >
              <UploadCloud className="size-4" />
              Upload deliverable
            </Link>
          </div>
        }
      />

      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          Nothing published yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-surface-1 text-[11px] uppercase tracking-wide text-ink-subtle">
                <th className="px-4 py-2.5 font-medium">Deliverable</th>
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {deliverables.map((d) => (
                <tr key={d.deliverableId} className="bg-surface-1/40 hover:bg-surface-1">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${d.projectId}/deliverables/${d.deliverableId}`}
                      className="flex items-center gap-2.5"
                    >
                      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg border border-zinc-800 bg-surface-2 text-ink-muted">
                        {d.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.coverUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <FileTypeIcon type={d.fileType} kind={d.kind} className="size-3.5" />
                        )}
                      </span>
                      <span className="font-medium text-ink hover:text-brand-persimmon">{d.name}</span>
                      <span className="tnum font-mono text-[11px] text-ink-subtle">
                        {d.versionLabel ?? `v${d.version}`}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{d.projectName}</td>
                  <td className="px-4 py-3 text-ink-muted">{d.clientName}</td>
                  <td className="px-4 py-3">
                    <DeliverableStatusBadge status={d.status} />
                  </td>
                  <td className="tnum px-4 py-3 text-ink-subtle">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
