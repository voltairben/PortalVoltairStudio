/**
 * Core "onboard a new client company" flow. Framework-agnostic and dependency-
 * injected so it can be exercised against the emulator in tests. The server
 * action in src/lib/actions/admin.ts wires in the real Admin SDK + Resend.
 */
import { randomBytes } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { ClientCompany, UserProfile } from "@/types";
import { COLLECTIONS } from "@/types";
import type { OnboardingEmailArgs } from "@/lib/email/onboarding-template";
import { type CreateClientInput, createClientInputSchema } from "@/lib/validation/schemas";

export interface OnboardDeps {
  auth: Auth;
  db: Firestore;
  sendOnboardingEmail: (args: OnboardingEmailArgs) => Promise<{ id: string | null }>;
  /** Overridable for deterministic tests. */
  now?: () => Date;
  generatePassword?: () => string;
  loginUrl?: string;
}

export interface OnboardResult {
  clientId: string;
  uid: string;
  tempPassword: string;
  emailSent: boolean;
  emailId: string | null;
}

export class OnboardError extends Error {}

export async function onboardClient(
  rawInput: CreateClientInput,
  deps: OnboardDeps,
): Promise<OnboardResult> {
  const input = createClientInputSchema.parse(rawInput);
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const tempPassword = (deps.generatePassword ?? defaultPassword)();
  const clientId = input.clientId ?? `${slugify(input.companyName)}-${randomBytes(3).toString("hex")}`;

  // Guard: email must be free.
  const existing = await deps.auth.getUserByEmail(input.email).catch(() => null);
  if (existing) {
    throw new OnboardError(`An account already exists for ${input.email}.`);
  }

  // 1. Auth account
  const user = await deps.auth.createUser({
    email: input.email,
    password: tempPassword,
    displayName: input.displayName,
    emailVerified: false,
  });

  try {
    // 2. Custom JWT claims — the basis of every security rule
    await deps.auth.setCustomUserClaims(user.uid, { role: "client", clientId });

    // 3. Atomic Firestore batch: company doc + user profile doc
    const clientDoc: ClientCompany = {
      clientId,
      name: input.companyName,
      logoUrl: null,
      status: "active",
      createdAt: now,
    };
    const profileDoc: UserProfile = {
      uid: user.uid,
      email: input.email,
      displayName: input.displayName,
      role: "client",
      clientId,
      avatarUrl: null,
      createdAt: now,
    };
    const batch = deps.db.batch();
    batch.set(deps.db.collection(COLLECTIONS.clients).doc(clientId), clientDoc);
    batch.set(deps.db.collection(COLLECTIONS.users).doc(user.uid), profileDoc);
    await batch.commit();
  } catch (error) {
    // Roll back the orphaned auth account so a retry is clean.
    await deps.auth.deleteUser(user.uid).catch(() => {});
    throw error;
  }

  // 4. Branded onboarding email — non-fatal if it fails (the account is valid).
  let emailSent = false;
  let emailId: string | null = null;
  try {
    const result = await deps.sendOnboardingEmail({
      email: input.email,
      displayName: input.displayName,
      companyName: input.companyName,
      tempPassword,
      loginUrl: deps.loginUrl,
    });
    emailSent = true;
    emailId = result.id;
  } catch {
    emailSent = false;
  }

  return { clientId, uid: user.uid, tempPassword, emailSent, emailId };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "client"
  );
}

function defaultPassword(): string {
  // Ambiguity-free charset; grouped for readability when shared with a client.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) raw += charset[bytes[i] % charset.length];
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
