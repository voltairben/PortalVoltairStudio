import { DEPLOY_TITLE, toDeploymentState } from "@/lib/integrations/deployment";
import type { ProjectDeployment, PulseDraft } from "@/types";

/**
 * Normalize a GitHub webhook event into Developer Pulse entries.
 *  - push / pull_request → commit + PR timeline (bots + merge noise filtered)
 *  - deployment_status   → Vercel's build state, forwarded by GitHub (no Pro plan
 *    needed): also yields a `deployment` patch for the project doc
 * Returns empty for events we don't surface.
 */
export interface GithubNormalized {
  repo: string | null; // "owner/repo" lowercased
  events: PulseDraft[];
  /** Set only for deployment_status events — overwrites project.deployment. */
  deployment: ProjectDeployment | null;
}

const MAX_COMMITS = 15;
const BOT_LOGINS = new Set(["dependabot", "dependabot[bot]", "github-actions", "github-actions[bot]", "renovate", "renovate[bot]"]);
const HANDLED_PR_ACTIONS = new Set(["opened", "reopened", "closed", "ready_for_review"]);

export function normalizeGithubEvent(
  eventName: string | null,
  deliveryId: string | null,
  rawBody: string,
): GithubNormalized {
  let body: GithubWebhookBody;
  try {
    body = JSON.parse(rawBody) as GithubWebhookBody;
  } catch {
    return { repo: null, events: [], deployment: null };
  }

  const repo = body.repository?.full_name?.toLowerCase() ?? null;
  const delivery = deliveryId ?? "gh";

  if (eventName === "push") {
    return { repo, events: pushEvents(body, delivery), deployment: null };
  }
  if (eventName === "pull_request") {
    return { repo, events: pullRequestEvents(body, delivery), deployment: null };
  }
  if (eventName === "deployment_status") {
    return { repo, ...deploymentStatusEvent(body) };
  }
  return { repo, events: [], deployment: null };
}

function deploymentStatusEvent(body: GithubWebhookBody): {
  events: PulseDraft[];
  deployment: ProjectDeployment | null;
} {
  const ds = body.deployment_status;
  if (!ds?.state) return { events: [], deployment: null };

  const state = toDeploymentState(ds.state);
  if (!state) return { events: [], deployment: null };

  const url = ds.environment_url ?? ds.target_url ?? null;
  const branch = body.deployment?.ref ?? null;
  const createdAt = ds.created_at
    ? new Date(ds.created_at).toISOString()
    : new Date().toISOString();

  const deployment: ProjectDeployment = {
    state,
    url,
    deploymentId: body.deployment?.id != null ? String(body.deployment.id) : null,
    branch,
    durationMs: null,
    updatedAt: createdAt,
  };

  const pulse: PulseDraft = {
    source: "vercel", // it's the Vercel deploy — just carried over the GitHub webhook
    kind: "deployment",
    title: DEPLOY_TITLE[state],
    detail: ds.environment ?? branch ?? null,
    url,
    state,
    actorName: null, // the deploy bot, not a person
    actorAvatar: null,
    createdAt,
    dedupeKey: `ds-${body.deployment?.id ?? "d"}-${ds.id ?? state}`,
  };

  return { events: [pulse], deployment };
}

function pushEvents(body: GithubWebhookBody, delivery: string): PulseDraft[] {
  if (body.deleted || !body.ref?.startsWith("refs/heads/")) return [];
  const branch = body.ref.replace("refs/heads/", "");
  const avatar = body.sender?.avatar_url ?? null;

  return (body.commits ?? [])
    .filter((c) => !isNoise(c.message, c.author?.name ?? c.author?.username))
    .slice(0, MAX_COMMITS)
    .map((c) => ({
      source: "github" as const,
      kind: "commit" as const,
      title: firstLine(c.message),
      detail: `${branch} · ${c.author?.name ?? c.author?.username ?? "unknown"}`,
      url: c.url ?? null,
      state: null,
      actorName: c.author?.name ?? c.author?.username ?? null,
      actorAvatar: avatar,
      createdAt: c.timestamp ? new Date(c.timestamp).toISOString() : new Date().toISOString(),
      dedupeKey: `${delivery}-${c.id}`,
    }));
}

function pullRequestEvents(body: GithubWebhookBody, delivery: string): PulseDraft[] {
  const pr = body.pull_request;
  if (!pr || !HANDLED_PR_ACTIONS.has(body.action ?? "")) return [];

  const state =
    body.action === "closed" ? (pr.merged ? "merged" : "closed") : "open";
  const verb =
    state === "merged" ? "merged" : body.action === "closed" ? "closed" : "opened";

  return [
    {
      source: "github",
      kind: "pull-request",
      title: `Pull request ${verb}: ${pr.title ?? "untitled"}`,
      detail: `#${pr.number ?? "?"} · ${pr.head?.ref ?? "?"} → ${pr.base?.ref ?? "?"}`,
      url: pr.html_url ?? null,
      state,
      actorName: pr.user?.login ?? body.sender?.login ?? null,
      actorAvatar: pr.user?.avatar_url ?? body.sender?.avatar_url ?? null,
      createdAt: pr.updated_at
        ? new Date(pr.updated_at).toISOString()
        : new Date().toISOString(),
      dedupeKey: `${delivery}-pr${pr.number}-${verb}`,
    },
  ];
}

function isNoise(message: string, author: string | undefined): boolean {
  const a = (author ?? "").toLowerCase();
  if (a.endsWith("[bot]") || BOT_LOGINS.has(a)) return true;
  return /^merge (pull request|branch|remote-tracking|commit)/i.test(message.trim());
}

function firstLine(message: string): string {
  const line = message.split("\n")[0]?.trim() ?? "";
  return line.length > 100 ? `${line.slice(0, 99)}…` : line || "(no message)";
}

interface GithubWebhookBody {
  ref?: string;
  deleted?: boolean;
  action?: string;
  repository?: { full_name?: string };
  sender?: { login?: string; avatar_url?: string };
  deployment_status?: {
    id?: number;
    state?: string;
    environment?: string;
    environment_url?: string;
    target_url?: string;
    created_at?: string;
  };
  deployment?: { id?: number; ref?: string };
  commits?: {
    id: string;
    message: string;
    url?: string;
    timestamp?: string;
    author?: { name?: string; username?: string };
  }[];
  pull_request?: {
    number?: number;
    title?: string;
    html_url?: string;
    merged?: boolean;
    updated_at?: string;
    user?: { login?: string; avatar_url?: string };
    head?: { ref?: string };
    base?: { ref?: string };
  };
}
