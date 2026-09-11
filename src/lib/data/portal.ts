import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeDeliverable } from "@/lib/deliverable-utils";
import type {
  ClientCompany,
  Deliverable,
  FeedbackItem,
  Project,
  PulseEvent,
  UserProfile,
} from "@/types";
import { COLLECTIONS } from "@/types";

/**
 * Client-facing read accessors. The Admin SDK bypasses security rules, so every
 * single-doc read re-checks `clientId` in code and every list query filters by it.
 */

export async function getClientCompany(clientId: string): Promise<ClientCompany | null> {
  const snap = await adminDb.collection(COLLECTIONS.clients).doc(clientId).get();
  return snap.exists ? (snap.data() as ClientCompany) : null;
}

/** The signed-in user's own `users/{uid}` profile doc (phone, job title, etc). */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb.collection(COLLECTIONS.users).doc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

export async function getProjects(clientId: string): Promise<Project[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.projects)
    .where("clientId", "==", clientId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(readProject);
}

export async function getProject(projectId: string, clientId: string): Promise<Project | null> {
  const snap = await adminDb.collection(COLLECTIONS.projects).doc(projectId).get();
  if (!snap.exists) return null;
  const project = readProject(snap);
  return project.clientId === clientId ? project : null;
}

export async function getDeliverables(
  projectId: string,
  clientId: string,
): Promise<Deliverable[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.deliverables)
    .where("clientId", "==", clientId)
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => normalizeDeliverable(d.data() as Deliverable));
}

export async function getDeliverable(
  deliverableId: string,
  clientId: string,
): Promise<Deliverable | null> {
  const snap = await adminDb.collection(COLLECTIONS.deliverables).doc(deliverableId).get();
  if (!snap.exists) return null;
  const deliverable = normalizeDeliverable(snap.data() as Deliverable);
  return deliverable.clientId === clientId ? deliverable : null;
}

/**
 * Every deliverable for the client, newest first. Sorted in memory — a client
 * has tens of deliverables at most, and this avoids a (clientId, createdAt)
 * composite index that only the dashboard would use.
 */
export async function getClientDeliverables(clientId: string): Promise<Deliverable[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.deliverables)
    .where("clientId", "==", clientId)
    .get();
  return snap.docs
    .map((d) => normalizeDeliverable(d.data() as Deliverable))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** SSR seed for the Developer Pulse stream; the client listener takes over on mount. */
export async function getInitialPulse(
  projectId: string,
  clientId: string,
): Promise<PulseEvent[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.pulseEvents)
    .where("clientId", "==", clientId)
    .where("projectId", "==", projectId)
    .orderBy("createdAt", "desc")
    .limit(25)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as PulseEvent), id: d.id }));
}

/** SSR seed for the live comment thread; the client listener takes over on mount. */
export async function getInitialComments(
  deliverableId: string,
  clientId: string,
): Promise<FeedbackItem[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.comments)
    .where("clientId", "==", clientId)
    .where("deliverableId", "==", deliverableId)
    .orderBy("timestamp", "asc")
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as FeedbackItem), commentId: d.id }));
}

function readProject(snap: DocumentSnapshot): Project {
  const project = snap.data() as Project;
  return {
    ...project,
    projectId: snap.id,
    deployment: project.deployment ?? null,
    milestones: [...(project.milestones ?? [])].sort((a, b) => a.order - b.order),
  };
}
