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
  if (!verifyGithubSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventName = request.headers.get("x-github-event");
  if (eventName === "ping") {
    return NextResponse.json({ ok: true, pong: true });
  }

  const { repo, events, deployment } = normalizeGithubEvent(
    eventName,
    request.headers.get("x-github-delivery"),
    raw,
  );
  if (events.length === 0 && !deployment) {
    return NextResponse.json({ ok: true, skipped: "no surfaced activity" });
  }

  const project = await findProjectByRepo(repo);
  if (!project) {
    return NextResponse.json({ ok: true, skipped: "no project matches this repo" });
  }

  // deployment_status events also carry Vercel's current build state.
  if (deployment) await setProjectDeployment(project.projectId, deployment);
  if (events.length > 0) await writePulseEvents(project, events);

  return NextResponse.json({
    ok: true,
    projectId: project.projectId,
    written: events.length,
    deployment: deployment?.state ?? null,
  });
}
