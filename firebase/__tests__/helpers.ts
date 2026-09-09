import type { RulesTestContext } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

export const CLIENT_A = "client-alpha";
export const CLIENT_B = "client-beta";
export const USER_A = "user-alpha";
export const USER_B = "user-beta";

export const adminCtx = () =>
  globalThis.testEnv.authenticatedContext("studio-admin", { role: "admin" });

export const clientCtx = (uid: string, clientId: string) =>
  globalThis.testEnv.authenticatedContext(uid, { role: "client", clientId });

export const anonCtx = () => globalThis.testEnv.unauthenticatedContext();

/**
 * `RulesTestContext.firestore()` / `.storage()` return compat-typed instances
 * that work fine with the modular SDK at runtime; cast for the type-checker.
 */
export const fs = (ctx: RulesTestContext): Firestore => ctx.firestore() as unknown as Firestore;
export const st = (ctx: RulesTestContext): FirebaseStorage =>
  ctx.storage() as unknown as FirebaseStorage;

/** Seed data with rules bypassed. */
export const seed = (fn: (db: Firestore) => Promise<void>) =>
  globalThis.testEnv.withSecurityRulesDisabled((ctx) =>
    fn(ctx.firestore() as unknown as Firestore),
  );

export const seedStorage = (fn: (storage: FirebaseStorage) => Promise<void>) =>
  globalThis.testEnv.withSecurityRulesDisabled((ctx) =>
    fn(ctx.storage() as unknown as FirebaseStorage),
  );

const iso = "2026-01-01T00:00:00.000Z";

export const projectDoc = (clientId: string) => ({
  clientId,
  name: `${clientId} project`,
  description: null,
  status: "active",
  timeline: { startDate: iso, endDate: null },
  createdAt: iso,
});

export const deliverableDoc = (clientId: string, projectId: string) => ({
  clientId,
  projectId,
  name: "cut-01.mp4",
  fileUrl: `deliverables/${clientId}/cut-01.mp4`,
  fileType: "video",
  version: 1,
  versionLabel: null,
  status: "pending",
  feedbackCount: 0,
  createdAt: iso,
});

export const commentDoc = (
  clientId: string,
  overrides: Record<string, unknown> = {},
) => ({
  clientId,
  deliverableId: "del-1",
  projectId: "proj-1",
  userId: USER_A,
  userName: "Alpha User",
  userRole: "client",
  text: "Looks great, ship it.",
  attachments: [],
  timestamp: iso,
  ...overrides,
});

export const clientCompanyDoc = (clientId: string) => ({
  clientId,
  name: `${clientId} Inc`,
  logoUrl: null,
  status: "active",
  createdAt: iso,
});

export const userProfileDoc = (uid: string, clientId: string | null, role = "client") => ({
  uid,
  email: `${uid}@example.test`,
  displayName: uid,
  role,
  clientId,
  avatarUrl: null,
  createdAt: iso,
});
