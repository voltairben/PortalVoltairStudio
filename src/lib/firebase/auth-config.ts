/**
 * Shared next-firebase-auth-edge configuration.
 * Used by src/proxy.ts (session cookie management) and src/lib/firebase/session.ts
 * (reading the verified user in Server Components).
 *
 * Env is read at call time via getAuthConfig() so a missing value fails the
 * request — not `next build` (page-data collection runs with no env on Vercel).
 */
import "server-only";
import { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH, SESSION_COOKIE_NAME } from "./auth-paths";

export { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH, SESSION_COOKIE_NAME };

/** Paths reachable without a valid session. */
export const PUBLIC_PATHS = ["/login", "/privacy", LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH];

function cookieSignatureKeys(): string[] {
  const keys = (process.env.COOKIE_SECRET_KEY ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error(
      "Missing COOKIE_SECRET_KEY — set it in .env.local (dev) or the Vercel project environment (deploy).",
    );
  }
  return keys;
}

export interface AuthConfig {
  apiKey: string;
  cookieName: string;
  cookieSignatureKeys: string[];
  cookieSerializeOptions: {
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    maxAge: number;
  };
  serviceAccount: { projectId: string; clientEmail: string; privateKey: string };
}

/** Options common to the middleware and to getTokens(). */
export function getAuthConfig(): AuthConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    cookieName: SESSION_COOKIE_NAME,
    cookieSignatureKeys: cookieSignatureKeys(),
    cookieSerializeOptions: {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 12, // 12 days; the ID token inside is auto-refreshed
    },
    serviceAccount: {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "",
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    },
  };
}
