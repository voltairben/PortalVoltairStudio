import type { Role } from "./user";

export interface FeedbackItem {
  commentId: string;
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  userId: string;
  userName: string;
  userRole: Role;
  text: string;
  timestamp: string; // ISO 8601
}
