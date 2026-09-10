"use client";
/**
 * Client-side sign-in helpers. Each one authenticates with the Firebase Web SDK,
 * then exchanges the resulting ID token for the httpOnly __session cookie so the
 * server (proxy + Server Components) sees the same session.
 */
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./client";
import { LOGIN_PATH, LOGOUT_PATH, REFRESH_TOKEN_PATH } from "./auth-paths";

async function exchangeIdTokenForSession(idToken: string): Promise<void> {
  const res = await fetch(LOGIN_PATH, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    throw new Error(`Could not create session (HTTP ${res.status}).`);
  }
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await exchangeIdTokenForSession(await cred.user.getIdToken());
}

/**
 * Send a Firebase password-reset email. Firebase's own mail service delivers it
 * (not Resend), so it works for any address today. `auth/user-not-found` is
 * swallowed — the caller shows the same "if an account exists…" message either
 * way so the form never reveals whether an email is registered.
 */
export async function sendResetEmail(email: string): Promise<boolean> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "auth/user-not-found") return true;
    return false;
  }
}

/**
 * Force the browser's Firebase token to pick up freshly-changed custom claims
 * (e.g. right after an admin provisions this account), then sync the server
 * __session cookie — no logout/login needed.
 */
export async function refreshClaims(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken(true);
  await fetch(REFRESH_TOKEN_PATH, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

export async function signOutEverywhere(): Promise<void> {
  try {
    await fetch(LOGOUT_PATH, { method: "POST" });
  } finally {
    await signOut(auth);
  }
}

/** Map Firebase auth error codes to copy a client should see. */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact Voltair Studio.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}
