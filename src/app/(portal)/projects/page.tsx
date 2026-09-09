import type { Metadata } from "next";
import { ProjectCard } from "@/components/portal/project-card";
import { getProjects } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireClient();
  const projects = await getProjects(user.clientId ?? "");

  const active = projects.filter((p) => p.status === "active");
  const past = projects.filter((p) => p.status !== "active");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every engagement with Voltair Studio, past and present.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          No projects yet.
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-ink-muted">In progress</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-ink-muted">Completed &amp; paused</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
