import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { normalizeDeliverable } from "@/lib/deliverable-utils";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/firebase/session";
import {
  type Activity,
  type ClientCompany,
  COLLECTIONS,
  type Deliverable,
  type FeedbackItem,
  type Project,
} from "@/types";

/**
 * Studio-wide read accessors. Admin SDK bypasses rules; every function
 * re-verifies role === "admin" via requireAdmin() (cached per request).
 */

function readProject(snap: DocumentSnapshot): Project {
  const p = snap.data() as Project;
  return {
    ...p,
    projectId: snap.id,
    milestones: [...(p.milestones ?? [])].sort((a, b) => a.order - b.order),
  };
}

const byCreatedDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt);

export interface StudioMetrics {
  activeClients: number;
  activeProjects: number;
  pendingReviews: number;
  approvedDeliverables: number;
}

/** Load aggregate client, project, deliverable, and review counts for the studio dashboard. */
export async function getStudioMetrics(): Promise<StudioMetrics> {
  await requireAdmin();
  const [clients, projects, deliverables] = await Promise.all([
    adminDb.collection(COLLECTIONS.clients).get(),
    adminDb.collection(COLLECTIONS.projects).get(),
    adminDb.collection(COLLECTIONS.deliverables).get(),
  ]);
  const dels = deliverables.docs.map((d) => normalizeDeliverable(d.data() as Deliverable));
  return {
    activeClients: clients.docs.filter((d) => (d.data() as ClientCompany).status === "active").length,
    activeProjects: projects.docs.filter((d) => (d.data() as Project).status === "active").length,
    pendingReviews: dels.filter((d) => d.status === "pending").length,
    approvedDeliverables: dels.filter((d) => d.status === "approved").length,
  };
}

export async function getRecentActivity(limit = 12): Promise<Activity[]> {
  await requireAdmin();
  const snap = await adminDb
    .collection(COLLECTIONS.activity)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as Activity);
}

export type ClientRow = ClientCompany & { projectCount: number };

export async function getAllClients(): Promise<ClientRow[]> {
  await requireAdmin();
  const [clients, projects] = await Promise.all([
    adminDb.collection(COLLECTIONS.clients).get(),
    adminDb.collection(COLLECTIONS.projects).get(),
  ]);
  const counts = new Map<string, number>();
  for (const doc of projects.docs) {
    const cid = (doc.data() as Project).clientId;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return clients.docs
    .map((d) => d.data() as ClientCompany)
    .sort(byCreatedDesc)
    .map((c) => ({ ...c, projectCount: counts.get(c.clientId) ?? 0 }));
}

export async function getClientOptions(): Promise<{ clientId: string; name: string }[]> {
  await requireAdmin();
  const snap = await adminDb.collection(COLLECTIONS.clients).get();
  return snap.docs
    .map((d) => d.data() as ClientCompany)
    .filter((c) => c.status !== "archived")
    .map((c) => ({ clientId: c.clientId, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type ProjectRow = Project & { clientName: string };

export async function getAllProjects(): Promise<ProjectRow[]> {
  await requireAdmin();
  const [projects, clients] = await Promise.all([
    adminDb.collection(COLLECTIONS.projects).get(),
    adminDb.collection(COLLECTIONS.clients).get(),
  ]);
  const names = new Map(clients.docs.map((d) => [d.id, (d.data() as ClientCompany).name]));
  return projects.docs
    .map(readProject)
    .sort(byCreatedDesc)
    .map((p) => ({ ...p, clientName: names.get(p.clientId) ?? p.clientId }));
}

export interface AdminProjectView {
  project: Project;
  client: ClientCompany | null;
  deliverables: Deliverable[];
}

/** Load one project and its related client and deliverables for the admin view. */
export async function getAdminProject(projectId: string): Promise<AdminProjectView | null> {
  await requireAdmin();
  const snap = await adminDb.collection(COLLECTIONS.projects).doc(projectId).get();
  if (!snap.exists) return null;
  const project = readProject(snap);
  const [clientSnap, delSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.clients).doc(project.clientId).get(),
    adminDb.collection(COLLECTIONS.deliverables).where("projectId", "==", projectId).get(),
  ]);
  return {
    project,
    client: clientSnap.exists ? (clientSnap.data() as ClientCompany) : null,
    deliverables: delSnap.docs
      .map((d) => normalizeDeliverable(d.data() as Deliverable))
      .sort(byCreatedDesc),
  };
}

export interface AdminDeliverableView {
  project: Project;
  deliverable: Deliverable;
  comments: FeedbackItem[];
}

/** The studio-side review view: media + the full feedback thread, no tenant filter. */
export async function getAdminDeliverableReview(
  projectId: string,
  deliverableId: string,
): Promise<AdminDeliverableView | null> {
  await requireAdmin();
  const [projSnap, delSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.projects).doc(projectId).get(),
    adminDb.collection(COLLECTIONS.deliverables).doc(deliverableId).get(),
  ]);
  if (!projSnap.exists || !delSnap.exists) return null;
  const deliverable = normalizeDeliverable(delSnap.data() as Deliverable);
  if (deliverable.projectId !== projectId) return null;

  const commentsSnap = await adminDb
    .collection(COLLECTIONS.comments)
    .where("deliverableId", "==", deliverableId)
    .get();
  const comments = commentsSnap.docs
    .map((d) => ({ ...(d.data() as FeedbackItem), commentId: d.id }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return { project: readProject(projSnap), deliverable, comments };
}

export interface UploadTarget {
  projectId: string;
  name: string;
  clientId: string;
  clientName: string;
  milestones: { id: string; title: string }[];
}

export async function getUploadTargets(): Promise<UploadTarget[]> {
  await requireAdmin();
  const [projects, clients] = await Promise.all([
    adminDb.collection(COLLECTIONS.projects).get(),
    adminDb.collection(COLLECTIONS.clients).get(),
  ]);
  const names = new Map(clients.docs.map((d) => [d.id, (d.data() as ClientCompany).name]));
  return projects.docs
    .map(readProject)
    .sort(byCreatedDesc)
    .map((p) => ({
      projectId: p.projectId,
      name: p.name,
      clientId: p.clientId,
      clientName: names.get(p.clientId) ?? p.clientId,
      milestones: p.milestones.map((m) => ({ id: m.id, title: m.title })),
    }));
}

export type DeliverableRow = Deliverable & { projectName: string; clientName: string };

/** Load all deliverables with the client and project labels needed by admin tables. */
export async function getAllDeliverables(): Promise<DeliverableRow[]> {
  await requireAdmin();
  const [deliverables, projects, clients] = await Promise.all([
    adminDb.collection(COLLECTIONS.deliverables).get(),
    adminDb.collection(COLLECTIONS.projects).get(),
    adminDb.collection(COLLECTIONS.clients).get(),
  ]);
  const projectNames = new Map(projects.docs.map((d) => [d.id, (d.data() as Project).name]));
  const clientNames = new Map(clients.docs.map((d) => [d.id, (d.data() as ClientCompany).name]));
  return deliverables.docs
    .map((d) => normalizeDeliverable(d.data() as Deliverable))
    .sort(byCreatedDesc)
    .map((d) => ({
      ...d,
      projectName: projectNames.get(d.projectId) ?? d.projectId,
      clientName: clientNames.get(d.clientId) ?? d.clientId,
    }));
}

export interface InboxData {
  comments: FeedbackItem[];
  deliverables: Deliverable[];
  projects: { projectId: string; name: string }[];
  clients: { clientId: string; name: string }[];
}

/** Load feedback, deliverables, and project labels for the studio inbox. */
export async function getInboxData(): Promise<InboxData> {
  await requireAdmin();
  const [comments, deliverables, projects, clients] = await Promise.all([
    adminDb.collection(COLLECTIONS.comments).orderBy("timestamp", "desc").limit(200).get(),
    adminDb.collection(COLLECTIONS.deliverables).get(),
    adminDb.collection(COLLECTIONS.projects).get(),
    adminDb.collection(COLLECTIONS.clients).get(),
  ]);
  return {
    comments: comments.docs.map((d) => ({ ...(d.data() as FeedbackItem), commentId: d.id })),
    deliverables: deliverables.docs.map((d) => normalizeDeliverable(d.data() as Deliverable)),
    projects: projects.docs.map((d) => ({ projectId: d.id, name: (d.data() as Project).name })),
    clients: clients.docs.map((d) => ({ clientId: d.id, name: (d.data() as ClientCompany).name })),
  };
}
