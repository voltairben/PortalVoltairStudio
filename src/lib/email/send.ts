import "server-only";
import { Resend } from "resend";
import { type AdminInviteEmailArgs, renderAdminInviteEmail } from "./admin-invite-template";
import { type DecisionEmailArgs, renderDecisionEmail } from "./decision-template";
import {
  type DeliverableReadyEmailArgs,
  renderDeliverableReadyEmail,
} from "./deliverable-ready-template";
import { type OnboardingEmailArgs, renderOnboardingEmail } from "./onboarding-template";

let client: Resend | null = null;

function resend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set — cannot send email.");
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Voltair Studio <onboarding@resend.dev>";
}

export interface SendResult {
  id: string | null;
}

/** Sends the branded client onboarding email. Throws on Resend error. */
export async function sendOnboardingEmail(args: OnboardingEmailArgs): Promise<SendResult> {
  const { subject, html, text } = renderOnboardingEmail(args);
  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to: args.email,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend failed: ${error.name} — ${error.message}`);
  }
  return { id: data?.id ?? null };
}

/** Sends the branded studio-admin invite email. Throws on Resend error. */
export async function sendAdminInviteEmail(args: AdminInviteEmailArgs): Promise<SendResult> {
  const { subject, html, text } = renderAdminInviteEmail(args);
  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to: args.email,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend failed: ${error.name} — ${error.message}`);
  }
  return { id: data?.id ?? null };
}

/** Notifies the studio when a client approves / requests changes. Throws on Resend error. */
export async function sendStudioDecisionEmail(args: DecisionEmailArgs): Promise<SendResult> {
  const to = process.env.STUDIO_NOTIFY_EMAIL;
  if (!to) throw new Error("STUDIO_NOTIFY_EMAIL is not set.");
  const { subject, html, text } = renderDecisionEmail(args);
  const { data, error } = await resend().emails.send({ from: fromAddress(), to, subject, html, text });
  if (error) {
    throw new Error(`Resend failed: ${error.name} — ${error.message}`);
  }
  return { id: data?.id ?? null };
}

/** Notifies a client that a new deliverable is ready for review. Throws on Resend error. */
export async function sendDeliverableReadyEmail(
  args: DeliverableReadyEmailArgs,
): Promise<SendResult> {
  const { subject, html, text } = renderDeliverableReadyEmail(args);
  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to: args.to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend failed: ${error.name} — ${error.message}`);
  }
  return { id: data?.id ?? null };
}
