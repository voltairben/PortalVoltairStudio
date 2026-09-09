/**
 * Core "onboard a new client company" flow. Framework-agnostic and dependency-
 * injected so it can be exercised against the emulator in tests. The server
 * action in src/lib/actions/admin.ts wires in the real Admin SDK + Resend.
 */
import { randomBytes } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Activity, ClientCompany, Project, UserProfile } from "@/types";
import { COLLECTIONS } from "@/types";
import type { OnboardingEmailArgs } from "@/lib/email/onboarding-template";
import { type CreateClientInput, createClientInputSchema } from "@/lib/validation/schemas";

export interface OnboardDeps {
  auth: Auth;
  db: Firestore;
  sendOnboardingEmail: (args: OnboardingEmailArgs) => Promise<{ id: string | null }>;
  /** Name of the studio admin performing the onboarding (for the activity feed). */
  actorName?: string;
  /** Overridable for deterministic tests. */
  now?: () => Date;
  generatePassword?: () => string;
  loginUrl?: string;
}

export interface OnboardResult {
  clientId: string;
  uid: string;
  tempPassword: string;
  projectId: string | null;
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
  const actorName = deps.actorName ?? "Voltair Studio";

  const existing = await deps.auth.getUserByEmail(input.email).catch(() => null);
  if (existing) {
    throw new OnboardError(`An account already exists for ${input.email}.`);
  }

  const user = await deps.auth.createUser({
    email: input.email,
    password: tempPassword,
    displayName: input.displayName,
    emailVerified: false,
  });

  let projectId: string | null = null;

  try {
    await deps.auth.setCustomUserClaims(user.uid, { role: "client", clientId });

    const clientDoc: ClientCompany = {
      clientId,
      name: input.companyName,
      logoUrl: null,
      status: "active",
      primaryContactUid: user.uid,
      primaryContactName: input.displayName,
      primaryContactEmail: input.email,
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

    if (input.initialProjectName) {
      const projectRef = deps.db.collection(COLLECTIONS.projects).doc();
      projectId = projectRef.id;
      const projectDoc: Project = {
        projectId,
        clientId,
        name: input.initialProjectName,
        description: null,
        status: "active",
        stage: "onboarding",
        vercelPreviewUrl: null,
        githubRepo: null,
        deployment: null,
        milestones: [],
        timeline: { startDate: now, endDate: null },
        createdAt: now,
      };
      batch.set(projectRef, projectDoc);
    }

    const activityRef = deps.db.collection(COLLECTIONS.activity).doc();
    const activityDoc: Activity = {
      id: activityRef.id,
      type: "client-onboarded",
      clientId,
      clientName: input.companyName,
      projectId,
      projectName: input.initialProjectName ?? null,
      deliverableId: null,
      deliverableName: null,
      actorName,
      actorRole: "admin",
      summary: `${actorName} onboarded ${input.companyName}`,
      createdAt: now,
    };
    batch.set(activityRef, activityDoc);

    await batch.commit();
  } catch (error) {
    await deps.auth.deleteUser(user.uid).catch(() => {});
    throw error;
  }

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
  } catch (error) {
    emailSent = false;
    console.error(`[onboardClient] onboarding email to ${input.email} failed:`, error);
  }

  return { clientId, uid: user.uid, tempPassword, projectId, emailSent, emailId };
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
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) raw += charset[bytes[i] % charset.length];
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
}
