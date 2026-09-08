import "server-only";
import { Resend } from "resend";
import { type OnboardingEmailArgs, renderOnboardingEmail } from "./onboarding-template";

let client: Resend | null = null;

function resend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set — cannot send email.");
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export interface SendResult {
  id: string | null;
}

/** Sends the branded client onboarding email. Throws on Resend error. */
export async function sendOnboardingEmail(args: OnboardingEmailArgs): Promise<SendResult> {
  const from = process.env.EMAIL_FROM ?? "Voltair Studio <onboarding@resend.dev>";
  const { subject, html, text } = renderOnboardingEmail(args);
  const { data, error } = await resend().emails.send({
    from,
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
