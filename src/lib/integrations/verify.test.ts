import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeGithubEvent } from "./github";
import { normalizeVercelEvent } from "./vercel";
import { verifyGithubSignature, verifyVercelSignature } from "./verify";

const VERCEL_SECRET = "vercel-secret";
const GITHUB_SECRET = "github-secret";

const sign = (algo: "sha1" | "sha256", body: string, secret: string) =>
  createHmac(algo, secret).update(body).digest("hex");

describe("verifyVercelSignature", () => {
  const body = JSON.stringify({ type: "deployment.succeeded" });

  it("accepts a correct SHA1 signature", () => {
    expect(verifyVercelSignature(body, sign("sha1", body, VERCEL_SECRET), VERCEL_SECRET)).toBe(true);
  });

  it("rejects a forged / wrong-secret signature", () => {
    expect(verifyVercelSignature(body, sign("sha1", body, "wrong"), VERCEL_SECRET)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyVercelSignature(body, null, VERCEL_SECRET)).toBe(false);
  });

  it("rejects a body tampered after signing", () => {
    const sig = sign("sha1", body, VERCEL_SECRET);
    expect(verifyVercelSignature(`${body} `, sig, VERCEL_SECRET)).toBe(false);
  });
});

describe("verifyGithubSignature", () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });

  it("accepts a correct sha256= signature", () => {
    const sig = `sha256=${sign("sha256", body, GITHUB_SECRET)}`;
    expect(verifyGithubSignature(body, sig, GITHUB_SECRET)).toBe(true);
  });

  it("rejects a signature without the sha256= prefix", () => {
    expect(verifyGithubSignature(body, sign("sha256", body, GITHUB_SECRET), GITHUB_SECRET)).toBe(false);
  });

  it("rejects a wrong-secret signature", () => {
    expect(verifyGithubSignature(body, `sha256=${sign("sha256", body, "wrong")}`, GITHUB_SECRET)).toBe(false);
  });
});

describe("normalizeVercelEvent", () => {
  it("maps deployment.succeeded → ready with repo + preview url", () => {
    const result = normalizeVercelEvent(
      JSON.stringify({
        id: "evt_1",
        type: "deployment.succeeded",
        createdAt: 1_700_000_000_000,
        payload: {
          target: "production",
          links: { deployment: "https://vercel.com/acme/x/abc" },
          deployment: {
            id: "dpl_1",
            url: "acme-site-abc.vercel.app",
            meta: {
              githubCommitOrg: "Acme",
              githubCommitRepo: "Site",
              githubCommitRef: "main",
              githubCommitAuthorName: "Ben",
            },
          },
        },
      }),
    );
    expect(result?.repo).toBe("acme/site");
    expect(result?.deployment.state).toBe("ready");
    expect(result?.deployment.url).toBe("https://acme-site-abc.vercel.app");
    expect(result?.pulse.dedupeKey).toBe("evt_1");
  });

  it("returns null for an event type we don't surface", () => {
    expect(normalizeVercelEvent(JSON.stringify({ type: "deployment.promoted" }))).toBeNull();
  });
});

describe("normalizeGithubEvent", () => {
  it("keeps human commits and drops bots + merge commits", () => {
    const { repo, events } = normalizeGithubEvent(
      "push",
      "delivery-1",
      JSON.stringify({
        ref: "refs/heads/main",
        repository: { full_name: "acme/site" },
        sender: { login: "ben", avatar_url: "https://a/x.png" },
        commits: [
          { id: "a1", message: "Add cookie banner", url: "u1", author: { name: "Ben" } },
          { id: "a2", message: "Merge pull request #4 from acme/x", url: "u2", author: { name: "Ben" } },
          { id: "a3", message: "Bump deps", url: "u3", author: { name: "dependabot[bot]" } },
        ],
      }),
    );
    expect(repo).toBe("acme/site");
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Add cookie banner");
    expect(events[0]?.dedupeKey).toBe("delivery-1-a1");
  });

  it("surfaces a merged pull_request as state=merged", () => {
    const { events } = normalizeGithubEvent(
      "pull_request",
      "delivery-2",
      JSON.stringify({
        action: "closed",
        repository: { full_name: "acme/site" },
        pull_request: {
          number: 7,
          title: "New player controls",
          html_url: "https://github.com/acme/site/pull/7",
          merged: true,
          head: { ref: "feature/player" },
          base: { ref: "main" },
          user: { login: "ben" },
        },
      }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.state).toBe("merged");
    expect(events[0]?.kind).toBe("pull-request");
  });

  it("ignores unhandled events", () => {
    expect(normalizeGithubEvent("issues", "d", "{}").events).toHaveLength(0);
  });

  it("handles a form-urlencoded (`payload=…`) body once unwrapped", () => {
    const json = JSON.stringify({
      ref: "refs/heads/main",
      repository: { full_name: "acme/site" },
      commits: [{ id: "z9", message: "Polish the footer", url: "u", author: { name: "Ben" } }],
    });
    const formBody = `payload=${encodeURIComponent(json)}`;
    const unwrapped = new URLSearchParams(formBody).get("payload") ?? "{}";
    const { events } = normalizeGithubEvent("push", "d-7", unwrapped);
    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("Polish the footer");
  });

  it("maps a deployment_status success → ready with the environment url", () => {
    const { events, deployment } = normalizeGithubEvent(
      "deployment_status",
      "d-3",
      JSON.stringify({
        deployment_status: {
          id: 99,
          state: "success",
          environment: "Preview",
          environment_url: "https://acme-site-git-main.vercel.app",
          created_at: "2026-02-01T00:00:00Z",
        },
        deployment: { id: 42, ref: "main" },
        repository: { full_name: "acme/site" },
      }),
    );
    expect(deployment?.state).toBe("ready");
    expect(deployment?.url).toBe("https://acme-site-git-main.vercel.app");
    expect(deployment?.branch).toBe("main");
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("deployment");
    expect(events[0]?.state).toBe("ready");
  });

  it("maps deployment_status pending → building and error → error", () => {
    const build = normalizeGithubEvent(
      "deployment_status",
      "d-4",
      JSON.stringify({ deployment_status: { state: "pending" }, deployment: { id: 1 } }),
    );
    expect(build.deployment?.state).toBe("building");

    const fail = normalizeGithubEvent(
      "deployment_status",
      "d-5",
      JSON.stringify({ deployment_status: { state: "failure" }, deployment: { id: 1 } }),
    );
    expect(fail.deployment?.state).toBe("error");
  });

  it("skips a deployment_status 'inactive' (superseded) event", () => {
    const { events, deployment } = normalizeGithubEvent(
      "deployment_status",
      "d-6",
      JSON.stringify({ deployment_status: { state: "inactive" }, deployment: { id: 1 } }),
    );
    expect(deployment).toBeNull();
    expect(events).toHaveLength(0);
  });
});
