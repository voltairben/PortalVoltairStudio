/**
 * Firebase Admin SDK, server-only, lazily initialized.
 *
 * The app is created on first use — not at import — so `next build` (which
 * evaluates route modules with no env on Vercel) doesn't crash on missing
 * FIREBASE_ADMIN_* vars. Auto-targets the emulators when FIRESTORE_EMULATOR_HOST
 * / FIREBASE_AUTH_EMULATOR_HOST are set.
 */
import "server-only";
import { type App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local (dev) or the Vercel project environment (deploy).`,
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

let appInstance: App | undefined;

function adminApp(): App {
  appInstance ??= getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(loadServiceAccount()),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
  return appInstance;
}

/**
 * ponytail: a lazy proxy keeps the `adminAuth.getUser(...)` call style while
 * deferring app init to first use. Swap for explicit `getAdminAuth()` calls if
 * this ever gets in the way.
 */
function lazy<T extends object>(factory: () => T): T {
  let cached: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      cached ??= factory();
      const value = Reflect.get(cached as object, prop, receiver);
      return typeof value === "function" ? value.bind(cached) : value;
    },
  });
}

export const adminAuth: Auth = lazy(() => getAuth(adminApp()));
export const adminDb: Firestore = lazy(() => getFirestore(adminApp()));
export const adminStorage: Storage = lazy(() => getStorage(adminApp()));
