"use client";
/**
 * Client-side sign-in helpers. Each one authenticates with the Firebase Web SDK,
 * then exchanges the resulting ID token for the httpOnly __session cookie so the
 * server (proxy + Server Components) sees the same session.
 */
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./client";
import { LOGIN_PATH, LOGOUT_PATH } from "./auth-paths";

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

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  await exchangeIdTokenForSession(await cred.user.getIdToken());
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
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong signing you in. Please try again.";
  }
}
