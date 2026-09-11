"use server";

import { revalidatePath } from "next/cache";
import { writeActivity } from "@/lib/activity";
import { sendDeliverableReadyEmail, sendStudioDecisionEmail } from "@/lib/email/send";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/session";
import {
  createDeliverableInputSchema,
  deliverableDecisionSchema,
} from "@/lib/validation/schemas";
import {
  type ClientCompany,
  COLLECTIONS,
  type Deliverable,
  type DeliverableStatus,
  type Project,
} from "@/types";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.voltairstudio.com";

// ---------------------------------------------------------------------------
// Client: approve / request changes
// ---------------------------------------------------------------------------

export interface DecisionResult {
  ok: boolean;
  status?: DeliverableStatus;
  error?: string;
}

export async function approveDeliverable(input: unknown): Promise<DecisionResult> {
  return decide(input, "approved");
}

export async function requestDeliverableChanges(input: unknown): Promise<DecisionResult> {
  return decide(input, "changes-requested");
}

type Decision = Extract<DeliverableStatus, "approved" | "changes-requested">;

async function decide(input: unknown, status: Decision): Promise<DecisionResult> {
  const user = await getCurrentUser();
  if (user?.role !== "client" || !user.clientId) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = deliverableDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const ref = adminDb.collection(COLLECTIONS.deliverables).doc(parsed.data.deliverableId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Deliverable not found." };

  const deliverable = snap.data() as Deliverable;
  if (deliverable.clientId !== user.clientId || deliverable.projectId !== parsed.data.projectId) {
    return { ok: false, error: "Not authorized." };
  }

  await ref.update({ status, decidedAt: new Date().toISOString() });

  const projectSnap = await adminDb
    .collection(COLLECTIONS.projects)
    .doc(parsed.data.projectId)
    .get();
  const projectName = (projectSnap.data() as Project | undefined)?.name ?? "Project";
  const clientName = user.name ?? user.email ?? "A client";
  const clientReviewPath = `/projects/${parsed.data.projectId}/deliverables/${parsed.data.deliverableId}`;
  // Studio email links to the studio-side review screen (the /projects route
  // redirects admins to /admin via requireClient).
  const reviewUrl = `${appUrl()}/admin/projects/${parsed.data.projectId}/deliverables/${parsed.data.deliverableId}`;

  await writeActivity(adminDb, {
    type: status === "approved" ? "deliverable-approved" : "deliverable-changes-requested",
    clientId: deliverable.clientId,
    clientName,
    projectId: deliverable.projectId,
    projectName,
    deliverableId: parsed.data.deliverableId,
    deliverableName: deliverable.name,
    actorName: clientName,
    actorRole: "client",
    summary:
      status === "approved"
        ? `${clientName} approved “${deliverable.name}”`
        : `${clientName} requested changes on “${deliverable.name}”`,
  });

  try {
    await sendStudioDecisionEmail({
      decision: status,
      deliverableName: deliverable.name,
      projectName,
      clientName,
      reviewUrl,
    });
  } catch (error) {
    console.error("[deliverable decision] studio email failed", error);
  }

  revalidatePath(clientReviewPath);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  revalidatePath(
    `/admin/projects/${parsed.data.projectId}/deliverables/${parsed.data.deliverableId}`,
  );
  return { ok: true, status };
}

// ---------------------------------------------------------------------------
// Admin: create a deliverable record after a direct browser → Storage upload
// ---------------------------------------------------------------------------

export interface CreateDeliverableResult {
  ok: boolean;
  deliverableId?: string;
  /** True only if the client's ready-for-review email actually sent. */
  emailSent?: boolean;
  error?: string;
}

/** Validate and persist a newly uploaded deliverable, then notify the client. */
export async function createDeliverable(input: unknown): Promise<CreateDeliverableResult> {
  const actor = await getCurrentUser();
  if (actor?.role !== "admin") return { ok: false, error: "Not authorized." };

  const parsed = createDeliverableInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;

  const projectSnap = await adminDb.collection(COLLECTIONS.projects).doc(d.projectId).get();
  if (!projectSnap.exists) return { ok: false, error: "Project not found." };
  const project = projectSnap.data() as Project;
  if (project.clientId !== d.clientId) {
    return { ok: false, error: "Project does not belong to that client." };
  }

  const legacyFileType: Record<(typeof d.assets)[number]["type"], Deliverable["fileType"]> = {
    image: "image",
    video: "video",
    pdf: "document",
  };

  const ref = adminDb.collection(COLLECTIONS.deliverables).doc();
  const now = new Date().toISOString();
  const deliverable: Deliverable = {
    deliverableId: ref.id,
    projectId: d.projectId,
    clientId: d.clientId,
    name: d.name,
    // Legacy fields, derived — anything still reading fileUrl/fileType directly
    // (older code, or a doc round-tripped before normalizeDeliverable() lands
    // everywhere) keeps working.
    fileUrl: d.assets[0].url,
    fileType: legacyFileType[d.assets[0].type],
    kind: d.kind,
    assets: d.assets,
    coverUrl: d.coverUrl,
    siteUrl: d.siteUrl ?? null,
    version: d.version,
    versionLabel: d.versionLabel,
    status: "pending",
    feedbackCount: 0,
    decidedAt: null,
    createdAt: now,
  };
  await ref.set({ ...deliverable, milestoneId: d.milestoneId ?? null });

  const clientSnap = await adminDb.collection(COLLECTIONS.clients).doc(d.clientId).get();
  const client = clientSnap.data() as ClientCompany | undefined;
  const reviewUrl = `${appUrl()}/projects/${d.projectId}/deliverables/${ref.id}`;

  await writeActivity(adminDb, {
    type: "deliverable-published",
    clientId: d.clientId,
    clientName: client?.name ?? d.clientId,
    projectId: d.projectId,
    projectName: project.name,
    deliverableId: ref.id,
    deliverableName: d.name,
    actorName: actor.name ?? actor.email ?? "Voltair Studio",
    actorRole: "admin",
    summary: `Published “${d.name}” to ${project.name}`,
  });

  let emailSent = false;
  if (client?.primaryContactEmail) {
    try {
      await sendDeliverableReadyEmail({
        to: client.primaryContactEmail,
        contactName: client.primaryContactName ?? "there",
        deliverableName: d.name,
        projectName: project.name,
        reviewUrl,
      });
      emailSent = true;
    } catch (error) {
      console.error("[createDeliverable] client email failed", error);
    }
  }
  revalidatePath("/admin/deliverables");
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${d.projectId}`);
  revalidatePath(`/projects/${d.projectId}`);
  return { ok: true, deliverableId: ref.id, emailSent };
}

// ---------------------------------------------------------------------------
// Admin: delete a deliverable
// ---------------------------------------------------------------------------

export interface DeleteDeliverableResult {
  ok: boolean;
  error?: string;
}

/**
 * Permanently removes a deliverable: its Storage assets, every comment on it,
 * and the deliverable doc itself. Irreversible. `confirmName` must match the
 * deliverable's name exactly (mirrors deleteClientCompany's confirm pattern).
 */
export async function deleteDeliverable(
  deliverableId: unknown,
  confirmName: unknown,
): Promise<DeleteDeliverableResult> {
  const actor = await getCurrentUser();
  if (actor?.role !== "admin") return { ok: false, error: "Not authorized." };
  if (typeof deliverableId !== "string" || !deliverableId) {
    return { ok: false, error: "Missing deliverable id." };
  }

  const ref = adminDb.collection(COLLECTIONS.deliverables).doc(deliverableId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Deliverable not found." };
  const deliverable = snap.data() as Deliverable;

  if (typeof confirmName !== "string" || confirmName.trim() !== deliverable.name) {
    return { ok: false, error: "Type the deliverable name exactly to confirm." };
  }

  // Best-effort Storage cleanup — seed/demo assets can carry an empty
  // storagePath (external picsum URLs), so skip those rather than erroring.
  const bucket = adminStorage.bucket();
  for (const asset of deliverable.assets ?? []) {
    if (!asset.storagePath) continue;
    await bucket
      .file(asset.storagePath)
      .delete()
      .catch((e) => console.error("[deleteDeliverable] storage", e));
  }

  // Batch-delete every comment on this deliverable (Firestore batches cap at 500 writes).
  const commentDocs = (
    await adminDb.collection(COLLECTIONS.comments).where("deliverableId", "==", deliverableId).get()
  ).docs;
  for (let i = 0; i < commentDocs.length; i += 400) {
    const batch = adminDb.batch();
    for (const d of commentDocs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }

  await ref.delete();
  revalidatePath("/admin/deliverables");
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${deliverable.projectId}`);
  revalidatePath(`/projects/${deliverable.projectId}`);
  return { ok: true };
}
