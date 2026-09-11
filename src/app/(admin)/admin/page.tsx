import { CircleCheck, Clock3, FolderKanban, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityStream } from "@/components/admin/activity-stream";
import { MetricCard } from "@/components/admin/metric-card";
import { PageHeader } from "@/components/admin/page-header";
import { getRecentActivity, getStudioMetrics } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Studio Overview" };

const QUICK_ACTIONS = [
  { href: "/admin/clients?new=1", label: "Onboard a client" },
  { href: "/admin/projects?new=1", label: "Create a project" },
  { href: "/admin/deliverables/upload", label: "Upload a deliverable" },
];

export default async function AdminOverviewPage() {
  const user = await requireAdmin();
  const [metrics, activity] = await Promise.all([getStudioMetrics(), getRecentActivity(20)]);
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-9">
      <PageHeader title={`Good to see you, ${firstName}`} subtitle="Studio operations at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active clients" value={metrics.activeClients} Icon={Users} />
        <MetricCard label="Projects in flight" value={metrics.activeProjects} Icon={FolderKanban} />
        <MetricCard
          label="Pending client reviews"
          value={metrics.pendingReviews}
          Icon={Clock3}
          accent
        />
        <MetricCard
          label="Deliverables approved"
          value={metrics.approvedDeliverables}
          Icon={CircleCheck}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-lg border border-zinc-800 bg-surface-1 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          Recent activity
        </h2>
        <ActivityStream initial={activity} />
      </section>
    </div>
  );
}
