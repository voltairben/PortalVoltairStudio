"use server";

import { revalidatePath } from "next/cache";
import { sendStudioDecisionEmail } from "@/lib/email/send";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/session";
import { deliverableDecisionSchema } from "@/lib/validation/schemas";
import { COLLECTIONS, type Deliverable, type DeliverableStatus } from "@/types";

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

  try {
    const projectSnap = await adminDb
      .collection(COLLECTIONS.projects)
      .doc(parsed.data.projectId)
      .get();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.voltairstudio.com";
    await sendStudioDecisionEmail({
      decision: status,
      deliverableName: deliverable.name,
      projectName: (projectSnap.data()?.name as string | undefined) ?? "Project",
      clientName: user.name ?? user.email ?? "A client",
      reviewUrl: `${appUrl}/projects/${parsed.data.projectId}/deliverables/${parsed.data.deliverableId}`,
    });
  } catch (error) {
    console.error("[deliverable decision] studio email failed", error);
  }

  revalidatePath(`/projects/${parsed.data.projectId}/deliverables/${parsed.data.deliverableId}`);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");

  return { ok: true, status };
}
