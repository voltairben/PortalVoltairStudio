import { DEPLOY_TITLE } from "@/lib/integrations/deployment";
import type { DeploymentState, ProjectDeployment, PulseDraft } from "@/types";

/**
 * Normalize a Vercel webhook event into a project deployment state + a single
 * Developer Pulse entry. Returns null for events we don't surface.
 */
export interface VercelNormalized {
  /** "owner/repo" lowercased — matched against project.githubRepo. */
  repo: string | null;
  deployment: ProjectDeployment;
  pulse: PulseDraft;
}

const STATE_BY_TYPE: Record<string, DeploymentState> = {
  "deployment.created": "building",
  "deployment.succeeded": "ready",
  "deployment.ready": "ready",
  "deployment.error": "error",
  "deployment.canceled": "canceled",
};

export function normalizeVercelEvent(rawBody: string): VercelNormalized | null {
  let body: VercelWebhookBody;
  try {
    body = JSON.parse(rawBody) as VercelWebhookBody;
  } catch (error) {
    console.warn(`[webhook/vercel] payload is not valid JSON: ${(error as Error).message}`);
    return null;
  }

  const state = STATE_BY_TYPE[body.type ?? ""];
  if (!state) return null; // an event type we don't surface — normal, no warn

  const d = body.payload?.deployment ?? {};
  const meta = d.meta ?? {};
  const org = meta.githubCommitOrg ?? meta.githubOrg ?? null;
  const name = meta.githubCommitRepo ?? meta.githubRepo ?? null;
  const repo = org && name ? `${org}/${name}`.toLowerCase() : null;

  const branch = meta.githubCommitRef ?? null;
  const previewUrl = d.url ? `https://${d.url}` : null;
  const inspectorUrl = body.payload?.links?.deployment ?? null;
  const createdAt = body.createdAt
    ? new Date(body.createdAt).toISOString()
    : new Date().toISOString();
  const durationMs =
    d.ready && d.buildingAt ? Math.max(0, d.ready - d.buildingAt) : null;

  const deployment: ProjectDeployment = {
    state,
    url: previewUrl,
    deploymentId: d.id ?? null,
    branch,
    durationMs,
    updatedAt: createdAt,
  };

  const pulse: PulseDraft = {
    source: "vercel",
    kind: "deployment",
    title: DEPLOY_TITLE[state],
    detail: branch ? `${branch} branch` : (body.payload?.target ?? null),
    url: state === "ready" ? (previewUrl ?? inspectorUrl) : inspectorUrl,
    state,
    actorName: meta.githubCommitAuthorName ?? null,
    actorAvatar: null,
    createdAt,
    dedupeKey: body.id ?? `${d.id ?? "dep"}-${state}`,
  };

  return { repo, deployment, pulse };
}

interface VercelWebhookBody {
  id?: string;
  type?: string;
  createdAt?: number;
  payload?: {
    target?: string | null;
    links?: { deployment?: string | null };
    project?: { id?: string };
    deployment?: {
      id?: string;
      url?: string;
      name?: string;
      buildingAt?: number;
      ready?: number;
      meta?: {
        githubCommitOrg?: string;
        githubOrg?: string;
        githubCommitRepo?: string;
        githubRepo?: string;
        githubCommitRef?: string;
        githubCommitAuthorName?: string;
      };
    };
  };
}
