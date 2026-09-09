import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level tests for POST /api/webhooks/github — signature check, content-type
 * unwrapping, event routing, project matching. The Firestore layer is mocked so
 * this stays a fast unit test; the pure normalizers are covered separately in
 * src/lib/integrations/verify.test.ts.
 */

const setProjectDeployment = vi.fn();
const writePulseEvents = vi.fn();
const findProjectByRepo = vi.fn();

vi.mock("@/lib/integrations/pulse-store", () => ({
  findProjectByRepo,
  setProjectDeployment,
  writePulseEvents,
  isHttpUrl: (v: unknown) => typeof v === "string" && /^https?:\/\//.test(v),
}));

const { POST } = await import("@/app/api/webhooks/github/route");

const SECRET = "route-test-secret";
const PROJECT = { projectId: "proj-1", clientId: "client-1", githubRepo: "voltairben/portalvoltairstudio" };

function request(
  event: string,
  payload: unknown,
  opts: { secret?: string; contentType?: string; signature?: string } = {},
): Request {
  const contentType = opts.contentType ?? "application/json";
  const raw =
    contentType.includes("x-www-form-urlencoded")
      ? `payload=${encodeURIComponent(JSON.stringify(payload))}`
      : JSON.stringify(payload);
  const signature =
    opts.signature ??
    `sha256=${createHmac("sha256", opts.secret ?? SECRET).update(raw).digest("hex")}`;
  return new Request("https://portal.test/api/webhooks/github", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-github-event": event,
      "x-github-delivery": "d-test-1",
      "x-hub-signature-256": signature,
    },
    body: raw,
  });
}

// A trimmed but realistic capture of Vercel's deployment_status delivery.
const DEPLOYMENT_STATUS = {
  action: "created",
  deployment_status: {
    id: 18068375943,
    state: "success",
    environment: "Production",
    target_url: "https://portalvoltairstudio-1e9t0nks3-voltairneb.vercel.app",
    environment_url: "https://portalvoltairstudio-1e9t0nks3-voltairneb.vercel.app",
    description: "Deployment has completed",
    created_at: "2026-09-09T16:16:34Z",
    creator: { login: "vercel[bot]", type: "Bot" },
  },
  deployment: { id: 6354266773, ref: "bf8a580c93d347b1f7b6ed634d9a441a2777011d", environment: "Production" },
  repository: { id: 1361844923, full_name: "voltairben/PortalVoltairStudio", private: false },
  sender: { login: "vercel[bot]", type: "Bot" },
};

const PUSH = {
  ref: "refs/heads/main",
  deleted: false,
  repository: { full_name: "voltairben/PortalVoltairStudio" },
  sender: { login: "voltairben", avatar_url: "https://avatars.githubusercontent.com/u/1?v=4" },
  commits: [
    {
      id: "c0ffee1234567890",
      message: "Tighten the hero animation timing",
      url: "https://github.com/voltairben/PortalVoltairStudio/commit/c0ffee1234567890",
      timestamp: "2026-09-09T16:15:00Z",
      author: { name: "Ben", username: "voltairben" },
    },
    {
      id: "b07b07b07b07b07b",
      message: "Bump dependencies",
      url: "https://github.com/voltairben/PortalVoltairStudio/commit/b07",
      author: { name: "dependabot[bot]", username: "dependabot[bot]" },
    },
  ],
};

const PULL_REQUEST = {
  action: "opened",
  number: 42,
  pull_request: {
    number: 42,
    title: "Pricing page layout",
    html_url: "https://github.com/voltairben/PortalVoltairStudio/pull/42",
    merged: false,
    updated_at: "2026-09-09T16:10:00Z",
    user: { login: "voltairben", avatar_url: "https://avatars.githubusercontent.com/u/1?v=4" },
    head: { ref: "feat/pricing" },
    base: { ref: "main" },
  },
  repository: { full_name: "voltairben/PortalVoltairStudio" },
  sender: { login: "voltairben" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", SECRET);
  findProjectByRepo.mockResolvedValue(PROJECT);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/webhooks/github", () => {
  it("processes a form-urlencoded deployment_status: updates deployment + writes a pulse event", async () => {
    const res = await POST(
      request("deployment_status", DEPLOYMENT_STATUS, {
        contentType: "application/x-www-form-urlencoded",
      }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, projectId: "proj-1", deployment: "ready" });

    expect(setProjectDeployment).toHaveBeenCalledWith(
      "proj-1",
      expect.objectContaining({
        state: "ready",
        url: "https://portalvoltairstudio-1e9t0nks3-voltairneb.vercel.app",
        branch: "bf8a580",
      }),
    );
    expect(writePulseEvents).toHaveBeenCalledOnce();
    const [, drafts] = writePulseEvents.mock.calls[0];
    expect(drafts[0]).toMatchObject({ kind: "deployment", state: "ready", dedupeKey: "deploy-18068375943" });
  });

  it("processes a JSON push: writes one pulse event, drops the bot commit", async () => {
    const res = await POST(request("push", PUSH));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, written: 1 });

    expect(setProjectDeployment).not.toHaveBeenCalled();
    const [, drafts] = writePulseEvents.mock.calls[0];
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      kind: "commit",
      title: "Tighten the hero animation timing",
      dedupeKey: "commit-c0ffee1234567890",
    });
  });

  it("processes a pull_request opened event", async () => {
    const res = await POST(request("pull_request", PULL_REQUEST));
    expect(res.status).toBe(200);
    const [, drafts] = writePulseEvents.mock.calls[0];
    expect(drafts[0]).toMatchObject({ kind: "pull-request", state: "open", dedupeKey: "pr-42-opened" });
  });

  it("rejects a forged signature with 401 and touches nothing", async () => {
    const res = await POST(request("push", PUSH, { signature: "sha256=deadbeef" }));
    expect(res.status).toBe(401);
    expect(findProjectByRepo).not.toHaveBeenCalled();
    expect(writePulseEvents).not.toHaveBeenCalled();
  });

  it("returns 503 when the secret is not configured", async () => {
    vi.stubEnv("GITHUB_WEBHOOK_SECRET", "");
    const res = await POST(request("push", PUSH, { secret: "" }));
    expect(res.status).toBe(503);
  });

  it("answers a signed ping with pong", async () => {
    const res = await POST(request("ping", { zen: "Keep it logically awesome." }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ pong: true });
  });

  it("skips (200) when no project matches the repo", async () => {
    findProjectByRepo.mockResolvedValue(null);
    const res = await POST(request("push", PUSH));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ skipped: expect.stringContaining("no project") });
    expect(writePulseEvents).not.toHaveBeenCalled();
  });
});
