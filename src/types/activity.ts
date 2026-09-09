import type { Role } from "./user";

export type ActivityType =
  | "client-onboarded"
  | "project-created"
  | "deliverable-published"
  | "deliverable-approved"
  | "deliverable-changes-requested";

/**
 * Studio activity feed. Written server-side only (Admin SDK), read by admins.
 * Client comments are NOT activity — the inbox listens to `comments` directly.
 */
export interface Activity {
  id: string;
  type: ActivityType;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  deliverableId: string | null;
  deliverableName: string | null;
  actorName: string;
  actorRole: Role;
  summary: string;
  createdAt: string; // ISO 8601
}
