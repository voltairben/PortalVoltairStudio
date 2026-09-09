import { NextResponse } from "next/server";
import { normalizeGithubEvent } from "@/lib/integrations/github";
import {
  findProjectByRepo,
  setProjectDeployment,
  writePulseEvents,
} from "@/lib/integrations/pulse-store";
import { verifyGithubSignature } from "@/lib/integrations/verify";

// Node runtime for `node:crypto`; the proxy matcher already excludes /api/webhooks.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  // GitHub signs the raw body — verify before touching the content.
  if (!verifyGithubSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // In `application/x-www-form-urlencoded` mode GitHub wraps the JSON as
  // `payload=<url-encoded>`; in `application/json` mode the body *is* the JSON.
  const contentType = request.headers.get("content-type") ?? "";
  const body = contentType.includes("application/x-www-form-urlencoded")
    ? (new URLSearchParams(raw).get("payload") ?? "{}")
    : raw;

  const eventName = request.headers.get("x-github-event");
  if (eventName === "ping") {
    return NextResponse.json({ ok: true, pong: true });
  }

  const { repo, events, deployment } = normalizeGithubEvent(
    eventName,
    request.headers.get("x-github-delivery"),
    body,
  );
  if (events.length === 0 && !deployment) {
    return NextResponse.json({ ok: true, skipped: "no surfaced activity" });
  }

  const project = await findProjectByRepo(repo);
  if (!project) {
    console.warn(`[webhook/github] ${eventName} for "${repo}" — no project matches`);
    return NextResponse.json({ ok: true, skipped: "no project matches this repo", repo });
  }

  // deployment_status events also carry Vercel's current build state.
  if (deployment) await setProjectDeployment(project.projectId, deployment);
  if (events.length > 0) await writePulseEvents(project, events);
  console.log(
    `[webhook/github] ${eventName} for "${repo}" → project ${project.projectId} ` +
      `(client ${project.clientId}): ${events.length} event(s), deployment=${deployment?.state ?? "—"}`,
  );

  return NextResponse.json({
    ok: true,
    projectId: project.projectId,
    written: events.length,
    deployment: deployment?.state ?? null,
  });
}
