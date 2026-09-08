/**
 * Firebase Web SDK singleton. Safe to import from client components and (defensively)
 * from the server — Firestore gets an offline-persistent cache in the browser only.
 */
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { EMULATORS, firebaseConfig, useEmulators } from "./config";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

function createDb(): Firestore {
  if (typeof window === "undefined") {
    // SSR / RSC: plain instance, no IndexedDB.
    return getFirestore(app);
  }
  try {
    // Browser: offline-persistent cache for the PWA / Capacitor shell.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });
  } catch {
    // Already initialized (HMR) — reuse it.
    return getFirestore(app);
  }
}

export const db = createDb();
export const storage = getStorage(app);

// Connect emulators exactly once per runtime (survives HMR via globalThis).
declare global {
  var __voltairEmulatorsWired: boolean | undefined;
}

if (useEmulators && !globalThis.__voltairEmulatorsWired) {
  globalThis.__voltairEmulatorsWired = true;
  connectAuthEmulator(auth, EMULATORS.authUrl, { disableWarnings: true });
  connectFirestoreEmulator(db, EMULATORS.firestore.host, EMULATORS.firestore.port);
  connectStorageEmulator(storage, EMULATORS.storage.host, EMULATORS.storage.port);
}

export { app };
