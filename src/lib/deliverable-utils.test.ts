import { describe, expect, it } from "vitest";
import { normalizeDeliverable } from "./deliverable-utils";
import type { Deliverable } from "@/types";

const base = {
  deliverableId: "d1",
  projectId: "p1",
  clientId: "c1",
  name: "Old-shaped deliverable",
  version: 1,
  versionLabel: "v1",
  status: "pending",
  feedbackCount: 0,
  decidedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
} as const;

describe("normalizeDeliverable", () => {
  it("synthesizes assets from fileUrl/fileType when assets is missing (legacy doc)", () => {
    const legacy = { ...base, fileUrl: "https://x/y.png", fileType: "image" } as Deliverable;
    const n = normalizeDeliverable(legacy);
    expect(n.kind).toBe("designs");
    expect(n.assets).toEqual([{ storagePath: "", url: "https://x/y.png", type: "image", label: null }]);
    expect(n.coverUrl).toBe("https://x/y.png");
  });

  it("maps video/document fileTypes to the matching kind and asset type", () => {
    const video = { ...base, fileUrl: "https://x/v.mp4", fileType: "video" } as Deliverable;
    expect(normalizeDeliverable(video).kind).toBe("video");
    expect(normalizeDeliverable(video).assets[0].type).toBe("video");

    const doc = { ...base, fileUrl: "https://x/d.pdf", fileType: "document" } as Deliverable;
    expect(normalizeDeliverable(doc).kind).toBe("document");
    expect(normalizeDeliverable(doc).assets[0].type).toBe("pdf");
    expect(normalizeDeliverable(doc).coverUrl).toBeNull();
  });

  it("leaves an already-normalized doc's assets untouched", () => {
    const modern = {
      ...base,
      fileUrl: "https://x/a.png",
      fileType: "image",
      kind: "designs",
      assets: [
        { storagePath: "s/a.png", url: "https://x/a.png", type: "image", label: "Homepage" },
        { storagePath: "s/b.png", url: "https://x/b.png", type: "image", label: "Product page" },
      ],
      coverUrl: "https://x/a.png",
    } as Deliverable;
    const n = normalizeDeliverable(modern);
    expect(n.assets).toHaveLength(2);
    expect(n.assets[1].label).toBe("Product page");
  });

  it("is idempotent", () => {
    const legacy = { ...base, fileUrl: "https://x/y.png", fileType: "image" } as Deliverable;
    const once = normalizeDeliverable(legacy);
    const twice = normalizeDeliverable(once);
    expect(twice).toEqual(once);
  });
});
