"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { writeActivity } from "@/lib/activity";
import { sendAdminInviteEmail, sendOnboardingEmail } from "@/lib/email/send";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, type SessionUser } from "@/lib/firebase/session";
import { shortRef, toDeploymentState } from "@/lib/integrations/deployment";
import { normalizeRepo } from "@/lib/integrations/repo";
import { setProjectDeployment } from "@/lib/integrations/pulse-store";
import {
  InviteAdminError,
  type InviteAdminResult as InviteAdminData,
  inviteAdmin,
} from "@/lib/onboarding/invite-admin";
import {
  OnboardError,
  type OnboardResult,
  onboardClient,
} from "@/lib/onboarding/onboard-client";
import {
  createClientInputSchema,
  createProjectInputSchema,
  inviteAdminInputSchema,
  studioReplyInputSchema,
  updateMilestonesInputSchema,
  updateProjectInputSchema,
} from "@/lib/validation/schemas";
import {
  type ClientCompany,
  COLLECTIONS,
  type Deliverable,
  type Milestone,
  type Project,
  type ProjectDeployment,
} from "@/types";

type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

async function adminActor(): Promise<SessionUser | null> {
  const actor = await getCurrentUser();
  return actor?.role === "admin" ? actor : null;
}

const actorLabel = (a: SessionUser) => a.name ?? a.email ?? "Voltair Studio";
const issues = (e: { issues: { message: string }[] }) => e.issues.map((i) => i.message).join("; ");

// ---------------------------------------------------------------------------
// Client onboarding
// ---------------------------------------------------------------------------

export interface CreateClientResult {
  ok: boolean;
  data?: OnboardResult;
  error?: string;
}

export async function createClientCompany(input: unknown): Promise<CreateClientResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = createClientInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };

  try {
    const data = await onboardClient(parsed.data, {
      auth: adminAuth,
      db: adminDb,
      sendOnboardingEmail,
      actorName: actorLabel(actor),
    });
    revalidatePath("/admin/clients");
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    console.error("[createClientCompany]", error);
    return {
      ok: false,
      error: error instanceof OnboardError ? error.message : "Onboarding failed — check the logs.",
    };
  }
}

// ---------------------------------------------------------------------------
// Studio admin invites
// ---------------------------------------------------------------------------

export interface InviteAdminResult {
  ok: boolean;
  data?: InviteAdminData;
  error?: string;
}

export async function inviteStudioAdmin(input: unknown): Promise<InviteAdminResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = inviteAdminInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };

  try {
    const data = await inviteAdmin(parsed.data, {
      auth: adminAuth,
      db: adminDb,
      sendAdminInviteEmail,
    });
    revalidatePath("/admin/account");
    return { ok: true, data };
  } catch (error) {
    console.error("[inviteStudioAdmin]", error);
    return {
      ok: false,
      error: error instanceof InviteAdminError ? error.message : "Invite failed — check the logs.",
    };
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject(input: unknown): Promise<ActionResult<{ projectId: string }>> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = createProjectInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  const d = parsed.data;

  const clientSnap = await adminDb.collection(COLLECTIONS.clients).doc(d.clientId).get();
  if (!clientSnap.exists) return { ok: false, error: "Client not found." };
  const clientName = (clientSnap.data() as ClientCompany).name;

  const ref = adminDb.collection(COLLECTIONS.projects).doc();
  const now = new Date().toISOString();
  const project: Project = {
    projectId: ref.id,
    clientId: d.clientId,
    name: d.name,
    description: d.description || null,
    status: d.status,
    stage: d.stage,
    vercelPreviewUrl: d.vercelPreviewUrl ?? null,
    githubRepo: d.githubRepo || null,
    deployment: null,
    milestones: [],
    timeline: { startDate: now, endDate: null },
    createdAt: now,
  };
  await ref.set(project);

  await writeActivity(adminDb, {
    type: "project-created",
    clientId: d.clientId,
    clientName,
    projectId: ref.id,
    projectName: d.name,
    actorName: actorLabel(actor),
    actorRole: "admin",
    summary: `${actorLabel(actor)} created project “${d.name}” for ${clientName}`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/admin");
  return { ok: true, projectId: ref.id };
}

export async function updateProject(input: unknown): Promise<ActionResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = updateProjectInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  const { projectId, ...patch } = parsed.data;

  const ref = adminDb.collection(COLLECTIONS.projects).doc(projectId);
  if (!(await ref.get()).exists) return { ok: false, error: "Project not found." };

  await ref.update({
    name: patch.name,
    description: patch.description || null,
    stage: patch.stage,
    status: patch.status,
    vercelPreviewUrl: patch.vercelPreviewUrl ?? null,
    githubRepo: patch.githubRepo || null,
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateMilestones(input: unknown): Promise<ActionResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = updateMilestonesInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  const { projectId, milestones } = parsed.data;

  const ref = adminDb.collection(COLLECTIONS.projects).doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Project not found." };

  const previous = new Map(
    ((snap.data() as Project).milestones ?? []).map((m) => [m.id, m]),
  );
  const now = new Date().toISOString();
  const next: Milestone[] = milestones.map((m, index) => {
    const prev = previous.get(m.id);
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      order: index,
      targetDate: m.targetDate,
      completedAt:
        m.status === "complete" ? (prev?.status === "complete" ? prev.completedAt : now) : null,
    };
  });

  await ref.update({ milestones: next });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Studio inbox reply
// ---------------------------------------------------------------------------

export async function postStudioReply(input: unknown): Promise<ActionResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };

  const parsed = studioReplyInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issues(parsed.error) };
  const d = parsed.data;

  const delSnap = await adminDb.collection(COLLECTIONS.deliverables).doc(d.deliverableId).get();
  if (!delSnap.exists) return { ok: false, error: "Deliverable not found." };
  const del = delSnap.data() as Deliverable;
  if (del.projectId !== d.projectId || del.clientId !== d.clientId) {
    return { ok: false, error: "Deliverable / project / client mismatch." };
  }

  const ref = adminDb.collection(COLLECTIONS.comments).doc();
  await ref.set({
    deliverableId: d.deliverableId,
    projectId: d.projectId,
    clientId: d.clientId,
    userId: actor.uid,
    userName: actor.name ?? "Voltair Studio",
    userRole: "admin",
    avatarUrl: actor.picture ?? null,
    text: d.text,
    attachments: [],
    timestamp: new Date().toISOString(),
  });
  await delSnap.ref.update({ feedbackCount: FieldValue.increment(1) });

  revalidatePath(`/projects/${d.projectId}/deliverables/${d.deliverableId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client archive / delete
// ---------------------------------------------------------------------------

/** Archive a client (hides them from active pickers) or restore them. Reversible. */
export async function setClientArchived(
  clientId: unknown,
  archived: unknown,
): Promise<ActionResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };
  if (typeof clientId !== "string" || !clientId) return { ok: false, error: "Missing client id." };

  const ref = adminDb.collection(COLLECTIONS.clients).doc(clientId);
  if (!(await ref.get()).exists) return { ok: false, error: "Client not found." };

  await ref.update({ status: archived ? "archived" : "active" });
  // ponytail: no activity-feed entry — the status badge on the row is the signal.
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Permanently removes a client: their Auth login(s), profile, and every project,
 * deliverable, comment and activity row carrying their clientId. Irreversible.
 * `confirmName` must match the company name exactly.
 */
export async function deleteClientCompany(
  clientId: unknown,
  confirmName: unknown,
): Promise<ActionResult> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };
  if (typeof clientId !== "string" || !clientId) return { ok: false, error: "Missing client id." };

  const ref = adminDb.collection(COLLECTIONS.clients).doc(clientId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Client not found." };
  const client = snap.data() as ClientCompany;

  if (typeof confirmName !== "string" || confirmName.trim() !== client.name) {
    return { ok: false, error: "Type the company name exactly to confirm." };
  }

  // Collect every login tied to this tenant, then remove the Auth accounts.
  const userDocs = (
    await adminDb.collection(COLLECTIONS.users).where("clientId", "==", clientId).get()
  ).docs;
  const uids = new Set(userDocs.map((d) => d.id));
  if (client.primaryContactUid) uids.add(client.primaryContactUid);
  for (const uid of uids) {
    await adminAuth.deleteUser(uid).catch((e) => console.error("[deleteClientCompany] auth", e));
  }

  // Wipe every tenant-scoped collection (Firestore batches cap at 500 writes).
  for (const coll of [
    COLLECTIONS.users,
    COLLECTIONS.projects,
    COLLECTIONS.deliverables,
    COLLECTIONS.comments,
    COLLECTIONS.activity,
  ]) {
    const docs = (await adminDb.collection(coll).where("clientId", "==", clientId).get()).docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = adminDb.batch();
      for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  }

  await ref.delete();
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Developer Pulse — manual deployment-status reconcile
// ---------------------------------------------------------------------------

interface GhDeployment {
  id: number;
  ref?: string;
}
interface GhStatus {
  state?: string;
  environment_url?: string;
  target_url?: string;
  created_at?: string;
}

/**
 * Re-check (or clear) a project's deployment badge — for when a webhook delivery
 * was missed and the badge is stuck. Queries the GitHub Deployments API for the
 * latest status; if that can't be resolved, clears the badge so the next real
 * webhook repopulates it.
 */
export async function reconcileProjectDeploymentStatus(
  projectId: unknown,
): Promise<ActionResult<{ state: string | null }>> {
  const actor = await adminActor();
  if (!actor) return { ok: false, error: "Not authorized." };
  if (typeof projectId !== "string" || !projectId) return { ok: false, error: "Missing project id." };

  const ref = adminDb.collection(COLLECTIONS.projects).doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Project not found." };
  const project = snap.data() as Project;

  const repo = project.githubRepo ? normalizeRepo(project.githubRepo) : null;
  const resolved = repo ? await fetchLatestDeployment(repo) : null;

  if (resolved) {
    await setProjectDeployment(projectId, resolved);
  } else {
    // Couldn't determine a state — clear the (possibly stuck) badge.
    await ref.update({ deployment: null });
  }

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, state: resolved?.state ?? null };
}

async function fetchLatestDeployment(repo: string): Promise<ProjectDeployment | null> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "voltair-portal",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const depRes = await fetch(
      `https://api.github.com/repos/${repo}/deployments?per_page=1`,
      { headers },
    );
    if (!depRes.ok) return null;
    const dep = ((await depRes.json()) as GhDeployment[])[0];
    if (!dep) return null;

    const stRes = await fetch(
      `https://api.github.com/repos/${repo}/deployments/${dep.id}/statuses?per_page=1`,
      { headers },
    );
    if (!stRes.ok) return null;
    const st = ((await stRes.json()) as GhStatus[])[0];

    const state = st?.state ? toDeploymentState(st.state) : null;
    if (!state) return null;

    return {
      state,
      url: st.environment_url ?? st.target_url ?? null,
      deploymentId: String(dep.id),
      branch: shortRef(dep.ref ?? null),
      durationMs: null,
      updatedAt: st.created_at ? new Date(st.created_at).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error("[reconcileProjectDeploymentStatus] GitHub API failed", error);
    return null;
  }
}
