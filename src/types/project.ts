export interface Project {
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  description: string | null;
  status: "active" | "completed" | "paused";
  timeline: {
    startDate: string; // ISO 8601
    endDate: string | null;
  };
  createdAt: string; // ISO 8601
}
