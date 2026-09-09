export type ProjectStage =
  | "onboarding"
  | "design"
  | "development"
  | "qa"
  | "launched";

export type ProjectStatus = "active" | "completed" | "paused";

export type MilestoneStatus = "pending" | "active" | "complete";

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  order: number;
  targetDate: string | null; // ISO 8601
  completedAt: string | null; // ISO 8601
}

export interface Project {
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  description: string | null;
  status: ProjectStatus;
  stage: ProjectStage;
  /** Current Vercel preview / staging deployment, surfaced read-only to the client. */
  vercelPreviewUrl: string | null;
  /** GitHub repo, e.g. "voltairben/acme-site". Studio-only. */
  githubRepo: string | null;
  milestones: Milestone[];
  timeline: {
    startDate: string;
    endDate: string | null;
  };
  createdAt: string; // ISO 8601
}

export const STAGE_LABELS: Record<ProjectStage, string> = {
  onboarding: "Onboarding",
  design: "Design",
  development: "Development",
  qa: "QA",
  launched: "Launched",
};
