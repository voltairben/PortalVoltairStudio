export type { Role, UserProfile } from "./user";
export type { ClientCompany, ClientStatus } from "./client";
export type {
  DeploymentState,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectDeployment,
  ProjectStage,
  ProjectStatus,
} from "./project";
export { STAGE_LABELS } from "./project";
export type { PulseDraft, PulseEvent, PulseKind, PulseSource } from "./pulse";
export type {
  Deliverable,
  DeliverableAsset,
  DeliverableAssetType,
  DeliverableFileType,
  DeliverableKind,
  DeliverableStatus,
} from "./deliverable";
export type { CommentAttachment, FeedbackItem } from "./feedback";
export type { Activity, ActivityType } from "./activity";

/** Firestore root collection names — one source of truth for paths + rules review. */
export const COLLECTIONS = {
  users: "users",
  clients: "clients",
  projects: "projects",
  deliverables: "deliverables",
  comments: "comments",
  activity: "activity",
  pulseEvents: "pulseEvents",
} as const;
