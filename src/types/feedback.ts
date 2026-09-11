import type { Role } from "./user";

export interface CommentAttachment {
  name: string;
  url: string;
  size: number;
  contentType: string;
}

export interface FeedbackItem {
  commentId: string;
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  userId: string;
  userName: string;
  userRole: Role;
  /** Snapshot of the poster's avatar at post time — not backfilled on older comments. */
  avatarUrl: string | null;
  text: string;
  attachments: CommentAttachment[];
  timestamp: string; // ISO 8601
}
