/**
 * Firebase Admin SDK singleton. Server-only.
 * Auto-targets the emulators when FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
 * are set (see .env.local) — no extra wiring needed.
 */
import "server-only";
import { type App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local (see .env.example) before using the Admin SDK.`,
    );
  }
  return value;
}

function loadServiceAccount() {
  return {
    projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
    clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
    // .env files keep the PEM on one line with literal \n — restore real newlines.
    privateKey: requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(loadServiceAccount()),
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

export { adminApp };
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
