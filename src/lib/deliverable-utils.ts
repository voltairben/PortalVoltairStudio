import type {
  Deliverable,
  DeliverableAsset,
  DeliverableAssetType,
  DeliverableFileType,
  DeliverableKind,
} from "@/types";

const FILE_TYPE_TO_KIND: Record<DeliverableFileType, DeliverableKind> = {
  image: "designs",
  video: "video",
  document: "document",
  other: "document",
};

const FILE_TYPE_TO_ASSET_TYPE: Record<DeliverableFileType, DeliverableAssetType> = {
  image: "image",
  video: "video",
  document: "pdf",
  other: "pdf",
};

export function mapLegacyFileType(fileType: DeliverableFileType): {
  kind: DeliverableKind;
  assetType: DeliverableAssetType;
} {
  return { kind: FILE_TYPE_TO_KIND[fileType], assetType: FILE_TYPE_TO_ASSET_TYPE[fileType] };
}

/**
 * Every deliverable read from Firestore (Admin SDK or Web SDK) must pass
 * through this before a component sees it. A doc written by the pre-sets
 * upload flow has no `assets` — synthesize one from `fileUrl`/`fileType` so
 * old and new deliverables are indistinguishable to the rest of the app.
 * Idempotent: a doc that already has `assets` is returned with only the
 * optional fields defaulted.
 *
 * No "server-only" / "use client" here on purpose — this runs inside Admin
 * SDK server reads (src/lib/data/*.ts) AND inside a Web SDK onSnapshot
 * callback in the Studio Inbox (a client component).
 */
export function normalizeDeliverable(raw: Deliverable): Deliverable {
  if (raw.assets?.length) {
    return {
      ...raw,
      coverUrl: raw.coverUrl ?? null,
      siteUrl: raw.siteUrl ?? null,
    };
  }

  const { kind, assetType } = mapLegacyFileType(raw.fileType);
  const asset: DeliverableAsset = {
    storagePath: "",
    url: raw.fileUrl,
    type: assetType,
    label: null,
  };

  return {
    ...raw,
    kind,
    assets: [asset],
    coverUrl: kind === "designs" ? raw.fileUrl : null,
    siteUrl: null,
  };
}
