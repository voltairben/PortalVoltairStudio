export type DeliverableFileType = "video" | "image" | "document" | "other";
export type DeliverableStatus = "pending" | "approved" | "changes-requested";

export interface Deliverable {
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  fileUrl: string;
  fileType: DeliverableFileType;
  /** Numeric version for ordering. */
  version: number;
  /** Free-form label shown to the client, e.g. "v2.1". Falls back to `v{version}`. */
  versionLabel: string | null;
  status: DeliverableStatus;
  feedbackCount: number;
  /** When the client last approved / requested changes. */
  decidedAt: string | null;
  createdAt: string; // ISO 8601
}
