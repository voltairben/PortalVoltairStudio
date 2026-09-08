"use server";

import { sendOnboardingEmail } from "@/lib/email/send";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/session";
import {
  OnboardError,
  type OnboardResult,
  onboardClient,
} from "@/lib/onboarding/onboard-client";
import { createClientInputSchema } from "@/lib/validation/schemas";

export interface CreateClientResult {
  ok: boolean;
  data?: OnboardResult;
  error?: string;
}

/**
 * Admin-only: create a client company + its first user account, attach
 * { role: 'client', clientId } custom claims, write the Firestore docs, and
 * send the branded onboarding email.
 */
export async function createClientCompany(input: unknown): Promise<CreateClientResult> {
  const actor = await getCurrentUser();
  if (actor?.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = createClientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }

  try {
    const data = await onboardClient(parsed.data, {
      auth: adminAuth,
      db: adminDb,
      sendOnboardingEmail,
    });
    return { ok: true, data };
  } catch (error) {
    console.error("[createClientCompany]", error);
    const message =
      error instanceof OnboardError ? error.message : "Onboarding failed — check the server logs.";
    return { ok: false, error: message };
  }
}
