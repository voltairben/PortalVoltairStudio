import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeRepo } from "@/lib/integrations/repo";
import { COLLECTIONS, type Project, type ProjectDeployment, type PulseDraft, type PulseEvent } from "@/types";

/**
 * Match a webhook to a Firestore project by its `githubRepo` field. Tolerates a
 * full URL or an `owner/repo` slug on either side. A linear scan — studio scale
 * is a handful of projects.
 * ponytail: swap for a normalized-slug field + `where(...)` query if that grows.
 */
export async function findProjectByRepo(repo: string | null): Promise<Project | null> {
  if (!repo) return null;
  const target = normalizeRepo(repo);
  const snap = await adminDb.collection(COLLECTIONS.projects).get();
  for (const doc of snap.docs) {
    const data = doc.data() as Project;
    if (data.githubRepo && normalizeRepo(data.githubRepo) === target) {
      return { ...data, projectId: doc.id };
    }
  }
  return null;
}

/** Overwrite the project's current deployment state (Vercel webhook). */
export async function setProjectDeployment(
  projectId: string,
  deployment: ProjectDeployment,
): Promise<void> {
  const patch: Record<string, unknown> = { deployment };
  // A successful deploy also refreshes the preview link the client sees.
  if (deployment.state === "ready" && deployment.url) {
    patch.vercelPreviewUrl = deployment.url;
  }
  await adminDb.collection(COLLECTIONS.projects).doc(projectId).update(patch);
}

/**
 * Append pulse entries for a project. The doc id is derived from the provider's
 * event id, so a webhook re-delivery overwrites rather than duplicates.
 */
export async function writePulseEvents(project: Project, drafts: PulseDraft[]): Promise<void> {
  if (drafts.length === 0) return;
  const batch = adminDb.batch();

  for (const { dedupeKey, ...rest } of drafts) {
    const id = `${rest.source}_${dedupeKey}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 400);
    const ref = adminDb.collection(COLLECTIONS.pulseEvents).doc(id);
    const event: PulseEvent = {
      ...rest,
      id,
      clientId: project.clientId,
      projectId: project.projectId,
    };
    batch.set(ref, event);
  }

  await batch.commit();
}
