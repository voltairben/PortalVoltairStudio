import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { type Activity, type ActivityType, COLLECTIONS, type Role } from "@/types";

export interface ActivityInput {
  type: ActivityType;
  clientId: string;
  clientName: string;
  projectId?: string | null;
  projectName?: string | null;
  deliverableId?: string | null;
  deliverableName?: string | null;
  actorName: string;
  actorRole: Role;
  summary: string;
}

/** Append one entry to the studio activity feed. Never throws to the caller. */
export async function writeActivity(db: Firestore, input: ActivityInput): Promise<void> {
  try {
    const ref = db.collection(COLLECTIONS.activity).doc();
    const doc: Activity = {
      id: ref.id,
      type: input.type,
      clientId: input.clientId,
      clientName: input.clientName,
      projectId: input.projectId ?? null,
      projectName: input.projectName ?? null,
      deliverableId: input.deliverableId ?? null,
      deliverableName: input.deliverableName ?? null,
      actorName: input.actorName,
      actorRole: input.actorRole,
      summary: input.summary,
      createdAt: new Date().toISOString(),
    };
    await ref.set(doc);
  } catch (error) {
    console.error("[writeActivity] failed", error);
  }
}
