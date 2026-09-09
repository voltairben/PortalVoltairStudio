"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { writeActivity } from "@/lib/activity";
import { sendOnboardingEmail } from "@/lib/email/send";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, type SessionUser } from "@/lib/firebase/session";
import {
  OnboardError,
  type OnboardResult,
  onboardClient,
} from "@/lib/onboarding/onboard-client";
import {
  createClientInputSchema,
  createProjectInputSchema,
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
    text: d.text,
    attachments: [],
    timestamp: new Date().toISOString(),
  });
  await delSnap.ref.update({ feedbackCount: FieldValue.increment(1) });

  revalidatePath(`/projects/${d.projectId}/deliverables/${d.deliverableId}`);
  return { ok: true };
}
