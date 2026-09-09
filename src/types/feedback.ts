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
  text: string;
  attachments: CommentAttachment[];
  timestamp: string; // ISO 8601
}
