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

/** True only for a non-empty http/https URL string. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Overwrite the project's current deployment state.
 *
 * The client-facing `vercelPreviewUrl` is refreshed ONLY from a real, successful
 * deploy URL — a payload that omits the URL (or carries a bad one) never clears a
 * curated value.
 */
export async function setProjectDeployment(
  projectId: string,
  deployment: ProjectDeployment,
): Promise<void> {
  const patch: Record<string, unknown> = { deployment };
  if (deployment.state === "ready" && isHttpUrl(deployment.url)) {
    patch.vercelPreviewUrl = deployment.url;
  }
  await adminDb.collection(COLLECTIONS.projects).doc(projectId).update(patch);
}

/**
 * Append pulse entries for a project. The doc id is
 * `{source}_{projectId}_{contentKey}` — derived from event content (commit SHA,
 * PR number, deployment id), never the `x-github-delivery` header — so a manual
 * webhook re-delivery overwrites the same doc rather than duplicating it.
 */
export async function writePulseEvents(project: Project, drafts: PulseDraft[]): Promise<void> {
  if (drafts.length === 0) return;
  const batch = adminDb.batch();

  for (const { dedupeKey, ...rest } of drafts) {
    const id = `${rest.source}_${project.projectId}_${dedupeKey}`
      .replace(/[^A-Za-z0-9_-]/g, "_")
      .slice(0, 400);
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
