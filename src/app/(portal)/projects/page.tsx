import type { Metadata } from "next";
import { ProjectList } from "@/components/portal/project-list";
import { getClientDeliverables, getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireClient();
  const clientId = user.clientId ?? "";
  const [projects, deliverables] = await Promise.all([
    getProjects(clientId),
    getClientDeliverables(clientId),
  ]);

  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");
  const awaitingClient = new Set(
    deliverables.filter((d) => d.status === "pending").map((d) => d.projectId),
  );

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every engagement with Voltair Studio, past and present.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          No projects yet.
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
                In progress
              </h2>
              <ProjectList projects={active} awaitingClient={awaitingClient} />
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
                Completed &amp; paused
              </h2>
              <ProjectList projects={past} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
