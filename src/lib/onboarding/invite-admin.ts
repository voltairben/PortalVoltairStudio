/**
 * Core "invite a studio admin" flow. Framework-agnostic and dependency-
 * injected, same pattern as onboard-client.ts. The server action in
 * src/lib/actions/admin.ts wires in the real Admin SDK + Resend.
 */
import { randomBytes } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { UserProfile } from "@/types";
import { COLLECTIONS } from "@/types";
import type { AdminInviteEmailArgs } from "@/lib/email/admin-invite-template";
import { type InviteAdminInput, inviteAdminInputSchema } from "@/lib/validation/schemas";

export interface InviteAdminDeps {
  auth: Auth;
  db: Firestore;
  sendAdminInviteEmail: (args: AdminInviteEmailArgs) => Promise<{ id: string | null }>;
  /** Overridable for deterministic tests. */
  now?: () => Date;
  generatePassword?: () => string;
  loginUrl?: string;
}

export interface InviteAdminResult {
  uid: string;
  tempPassword: string;
  emailSent: boolean;
  emailId: string | null;
}

export class InviteAdminError extends Error {}

export async function inviteAdmin(
  rawInput: InviteAdminInput,
  deps: InviteAdminDeps,
): Promise<InviteAdminResult> {
  const input = inviteAdminInputSchema.parse(rawInput);
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const tempPassword = (deps.generatePassword ?? defaultPassword)();

  const existing = await deps.auth.getUserByEmail(input.email).catch(() => null);
  if (existing) {
    throw new InviteAdminError(`An account already exists for ${input.email}.`);
  }

  const user = await deps.auth.createUser({
    email: input.email,
    password: tempPassword,
    displayName: input.displayName,
    emailVerified: false,
  });

  try {
    await deps.auth.setCustomUserClaims(user.uid, { role: "admin" });

    const profileDoc: UserProfile = {
      uid: user.uid,
      email: input.email,
      displayName: input.displayName,
      role: "admin",
      clientId: null,
      avatarUrl: null,
      phone: null,
      jobTitle: null,
      createdAt: now,
    };
    await deps.db.collection(COLLECTIONS.users).doc(user.uid).set(profileDoc);
  } catch (error) {
    await deps.auth.deleteUser(user.uid).catch(() => {});
    throw error;
  }

  let emailSent = false;
  let emailId: string | null = null;
  try {
    const result = await deps.sendAdminInviteEmail({
      email: input.email,
      displayName: input.displayName,
      tempPassword,
      loginUrl: deps.loginUrl,
    });
    emailSent = true;
    emailId = result.id;
  } catch (error) {
    emailSent = false;
    console.error(`[inviteAdmin] invite email to ${input.email} failed:`, error);
  }

  return { uid: user.uid, tempPassword, emailSent, emailId };
}

function defaultPassword(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) raw += charset[bytes[i] % charset.length];
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
