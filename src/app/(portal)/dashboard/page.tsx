import type { Metadata } from "next";
import { AttentionPanel } from "@/components/portal/attention-panel";
import { LatestDeliveryHero } from "@/components/portal/latest-delivery-hero";
import { ProjectList } from "@/components/portal/project-list";
import { getClientCompany, getClientDeliverables, getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";
import { relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireClient();
  const clientId = user.clientId ?? "";
  const [company, projects, deliverables] = await Promise.all([
    getClientCompany(clientId),
    getProjects(clientId),
    getClientDeliverables(clientId),
  ]);

  const firstName = user.name?.split(" ")[0] ?? null;
  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");

  const pending = deliverables.filter((d) => d.status === "pending");
  const hero = pending[0] ?? null;
  const lastDecided = deliverables.find((d) => d.status !== "pending") ?? null;
  const awaitingClient = new Set(pending.map((d) => d.projectId));

  const recent = deliverables
    .filter((d) => d.status !== "pending" && d.decidedAt)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))
    .slice(0, 4)
    .map((d) => ({
      label: `${d.name} · ${d.status === "approved" ? "approved" : "changes requested"}`,
      when: relativeTime(d.decidedAt as string),
    }));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl text-ink sm:text-4xl">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {company?.name ?? "Your studio workspace"} · {active.length}{" "}
          {active.length === 1 ? "project" : "projects"} in progress
        </p>
      </header>

      {(hero || lastDecided) && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <LatestDeliveryHero pending={hero} lastDecided={lastDecided} />
          <AttentionPanel pendingCount={pending.length} recent={recent} />
        </div>
      )}

      {active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Your projects
          </h2>
          <ProjectList projects={active} awaitingClient={awaitingClient} />
        </section>
      ) : (
        <EmptyProjects />
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Past projects
          </h2>
          <ProjectList projects={past} />
        </section>
      )}
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface-1/50 px-5 py-12 text-center">
      <p className="text-sm font-medium text-ink">No projects yet</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-muted">
        Voltair Studio will add your projects here as they kick off. You&rsquo;ll get an email
        when the first one is ready to review.
      </p>
    </div>
  );
}
