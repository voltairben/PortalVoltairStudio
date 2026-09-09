import { NextResponse } from "next/server";
import { normalizeVercelEvent } from "@/lib/integrations/vercel";
import {
  findProjectByRepo,
  setProjectDeployment,
  writePulseEvents,
} from "@/lib/integrations/pulse-store";
import { verifyVercelSignature } from "@/lib/integrations/verify";

// Node runtime for `node:crypto`; the proxy matcher already excludes /api/webhooks.
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (!verifyVercelSignature(raw, request.headers.get("x-vercel-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const normalized = normalizeVercelEvent(raw);
  if (!normalized) {
    return NextResponse.json({ ok: true, skipped: "unhandled event" });
  }

  const project = await findProjectByRepo(normalized.repo);
  if (!project) {
    return NextResponse.json({ ok: true, skipped: "no project matches this repo" });
  }

  await setProjectDeployment(project.projectId, normalized.deployment);
  await writePulseEvents(project, [normalized.pulse]);

  return NextResponse.json({ ok: true, projectId: project.projectId });
}
