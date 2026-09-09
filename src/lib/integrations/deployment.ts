import type { DeploymentState } from "@/types";

/**
 * Shared deployment-state mapping. Feeds both the Vercel webhook (event-type
 * keyed, Pro plan only) and the GitHub `deployment_status` webhook (state keyed,
 * works on the free plan — Vercel posts the status to GitHub, GitHub forwards it).
 */

/** GitHub `deployment_status.state` → our state. `null` means "don't surface". */
export function toDeploymentState(raw: string): DeploymentState | null {
  switch (raw) {
    case "queued":
      return "queued";
    case "pending":
    case "in_progress":
      return "building";
    case "success":
      return "ready";
    case "failure":
    case "error":
      return "error";
    default:
      return null; // "inactive" (superseded) and anything unknown
  }
}

export const DEPLOY_TITLE: Record<DeploymentState, string> = {
  queued: "Build queued",
  building: "New build started",
  ready: "Staging preview updated",
  error: "Deployment failed",
  canceled: "Deployment canceled",
};

/** Vercel's deployment_status payload puts the commit SHA in `ref` — show 7 chars. */
export function shortRef(ref: string | null): string | null {
  return ref && /^[0-9a-f]{40}$/i.test(ref) ? ref.slice(0, 7) : ref;
}
