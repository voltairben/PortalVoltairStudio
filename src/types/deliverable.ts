export type DeliverableFileType = "video" | "image" | "document" | "other";
export type DeliverableStatus = "pending" | "approved" | "changes-requested";
export type DeliverableAssetType = "image" | "video" | "pdf";
export type DeliverableKind = "designs" | "website" | "video" | "document";

export interface DeliverableAsset {
  storagePath: string;
  url: string;
  type: DeliverableAssetType;
  label?: string | null;
}

export interface Deliverable {
  deliverableId: string;
  projectId: string;
  clientId: string; // The critical multi-tenant isolation key
  name: string;
  /** @deprecated kept for backward compatibility with pre-sets deliverables; use `assets`. */
  fileUrl: string;
  /** @deprecated kept for backward compatibility with pre-sets deliverables; use `kind`. */
  fileType: DeliverableFileType;
  kind: DeliverableKind;
  /** 1..N. Always non-empty after `normalizeDeliverable()`. */
  assets: DeliverableAsset[];
  /** Thumbnail — first asset for `designs`, a captured frame for `video`, null for `document`/unset `website`. */
  coverUrl: string | null;
  /** `website` kind only. */
  siteUrl?: string | null;
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
