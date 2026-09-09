export type { Role, UserProfile } from "./user";
export type { ClientCompany } from "./client";
export type {
  Milestone,
  MilestoneStatus,
  Project,
  ProjectStage,
  ProjectStatus,
} from "./project";
export { STAGE_LABELS } from "./project";
export type {
  Deliverable,
  DeliverableFileType,
  DeliverableStatus,
} from "./deliverable";
export type { CommentAttachment, FeedbackItem } from "./feedback";

/** Firestore root collection names — one source of truth for paths + rules review. */
export const COLLECTIONS = {
  users: "users",
  clients: "clients",
  projects: "projects",
  deliverables: "deliverables",
  comments: "comments",
} as const;
