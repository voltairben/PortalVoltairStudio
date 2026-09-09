import type { Metadata } from "next";
import { ProjectCard } from "@/components/portal/project-card";
import { getClientCompany, getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";
import type { Project } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireClient();
  const clientId = user.clientId ?? "";
  const [company, projects] = await Promise.all([
    getClientCompany(clientId),
    getProjects(clientId),
  ]);

  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");
  const totals = aggregate(active);
  const firstName = user.name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-ink">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {company?.name ?? "Your studio workspace"} — {active.length}{" "}
          {active.length === 1 ? "project" : "projects"} in progress
        </p>
      </header>

      {totals.total > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-surface-1 p-6 sm:p-8">
          <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-32" />
          <div className="relative">
            <p className="text-sm text-ink-muted">Milestones completed across active projects</p>
            <p className="tnum mt-2 font-mono text-5xl font-semibold text-ink">
              {totals.done}
              <span className="text-2xl text-ink-subtle"> / {totals.total}</span>
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brand-persimmon transition-[width] duration-700 ease-out"
                style={{ width: `${totals.pct}%` }}
              />
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-muted">Active projects</h2>
        {active.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-ink-muted">Past projects</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function aggregate(projects: Project[]) {
  const total = projects.reduce((n, p) => n + p.milestones.length, 0);
  const done = projects.reduce(
    (n, p) => n + p.milestones.filter((m) => m.status === "complete").length,
    0,
  );
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-12 text-center">
      <p className="text-sm font-medium text-ink">No projects yet</p>
      <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-muted">
        Voltair Studio will add your projects here as they kick off. You&rsquo;ll get an
        email when the first one is ready to review.
      </p>
    </div>
  );
}
