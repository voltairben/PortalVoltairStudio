import type { Metadata } from "next";
import { AdminProjectList } from "@/components/admin/admin-project-list";
import { PageHeader } from "@/components/admin/page-header";
import { ProjectCreateForm } from "@/components/admin/project-create-form";
import { getAllProjects, getClientOptions } from "@/lib/data/admin";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Projects & Milestones" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await requireAdmin();
  const [{ new: newParam }, projects, clients] = await Promise.all([
    searchParams,
    getAllProjects(),
    getClientOptions(),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Projects & milestones"
        subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} across all clients`}
        action={<ProjectCreateForm clients={clients} openOnLoad={newParam === "1"} />}
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-surface-1/50 px-5 py-12 text-center text-sm text-ink-muted">
          {clients.length === 0
            ? "Onboard a client first, then create a project for them."
            : "No projects yet. Create the first one."}
        </div>
      ) : (
        <AdminProjectList projects={projects} />
      )}
    </div>
  );
}
