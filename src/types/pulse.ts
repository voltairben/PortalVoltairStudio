/**
 * Developer Pulse — deployment + commit activity mirrored from Vercel / GitHub
 * webhooks into Firestore, so the client browser listens via onSnapshot and
 * never hits an external API.
 *
 * Root collection `pulseEvents`, one denormalized `clientId` per doc — the same
 * O(1) tenant-isolation model as every other client-facing collection.
 */
export type PulseSource = "vercel" | "github";

export type PulseKind = "deployment" | "commit" | "pull-request";

export interface PulseEvent {
  id: string;
  clientId: string; // tenant isolation key (denormalized, matched in rules)
  projectId: string;
  source: PulseSource;
  kind: PulseKind;
  /** Client-friendly one-liner, e.g. "Updated the video player controls". */
  title: string;
  /** Secondary line — branch, author, PR number. */
  detail: string | null;
  /** External link (commit, PR, or live preview). */
  url: string | null;
  /** Provider state token: "ready" | "error" | "merged" | "open" | ... */
  state: string | null;
  actorName: string | null;
  actorAvatar: string | null;
  createdAt: string; // ISO 8601 — the provider's own event time (stable across re-deliveries)
}

/** Everything a normalizer produces; the store fills in id / clientId / projectId. */
export type PulseDraft = Omit<PulseEvent, "id" | "clientId" | "projectId"> & {
  /** Idempotency key — deterministic per provider event so re-deliveries overwrite. */
  dedupeKey: string;
};
