/**
 * Server-side session access. Reads the verified __session cookie (no Admin SDK,
 * no network) and exposes role guards for Server Component layouts.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getTokens, type Tokens } from "next-firebase-auth-edge";
import type { Role } from "@/types/user";
import { authConfig } from "./auth-config";

export type { Role };

export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  emailVerified: boolean;
  role: Role | null;
  clientId: string | null;
}

function toSessionUser(tokens: Tokens): SessionUser {
  const t = tokens.decodedToken;
  return {
    uid: t.uid,
    email: t.email ?? null,
    name: (t.name as string | undefined) ?? null,
    picture: t.picture ?? null,
    emailVerified: t.email_verified ?? false,
    role: (t.role as Role | undefined) ?? null,
    clientId: (t.clientId as string | undefined) ?? null,
  };
}

/** The current user, or null. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const tokens = await getTokens(await cookies(), {
    apiKey: authConfig.apiKey,
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    serviceAccount: authConfig.serviceAccount,
  });
  return tokens ? toSessionUser(tokens) : null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireClient(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");
  if (user.role !== "client") redirect("/login?error=not-provisioned");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "client") redirect("/dashboard");
  if (user.role !== "admin") redirect("/login?error=not-provisioned");
  return user;
}
