export type DeliverableFileType = "video" | "image" | "document" | "other";
export type DeliverableStatus = "pending" | "approved" | "changes-requested";

export interface Deliverable {
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  fileUrl: string;
  fileType: DeliverableFileType;
  version: number;
  status: DeliverableStatus;
  feedbackCount: number;
  createdAt: string; // ISO 8601
}
