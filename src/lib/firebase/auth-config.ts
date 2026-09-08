/**
 * Shared next-firebase-auth-edge configuration.
 * Used by src/proxy.ts (session cookie management) and src/lib/firebase/session.ts
 * (reading the verified user in Server Components).
 */
import "server-only";
import { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH, SESSION_COOKIE_NAME } from "./auth-paths";

export { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH, SESSION_COOKIE_NAME };

const signatureKeys = (process.env.COOKIE_SECRET_KEY ?? "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

if (signatureKeys.length === 0) {
  throw new Error("Missing COOKIE_SECRET_KEY. Add a 32+ byte secret to .env.local.");
}

export const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? "",
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "",
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
};

/** Options common to the middleware and to getTokens(). */
export const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  cookieName: SESSION_COOKIE_NAME,
  cookieSignatureKeys: signatureKeys,
  cookieSerializeOptions: {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 12, // 12 days; the ID token inside is auto-refreshed
  },
  serviceAccount,
};

/** Paths reachable without a valid session. */
export const PUBLIC_PATHS = ["/login", LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH];
