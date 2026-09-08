import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, afterEach, beforeAll } from "vitest";

// Make FIREBASE_ADMIN_* / RESEND_* available to the onboarding test.
// (firebase emulators:exec already injects the *_EMULATOR_HOST vars.)
try {
  process.loadEnvFile(fileURLToPath(new URL("../../.env.local", import.meta.url)));
} catch {
  // fine — vars may already be present (CI)
}

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "voltairstudio-aa855";

const rulesPath = (name: string) => fileURLToPath(new URL(`../${name}`, import.meta.url));

declare global {
  var testEnv: RulesTestEnvironment;
}

beforeAll(async () => {
  globalThis.testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(rulesPath("firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync(rulesPath("storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterEach(async () => {
  await globalThis.testEnv?.clearFirestore();
  await globalThis.testEnv?.clearStorage();
});

afterAll(async () => {
  await globalThis.testEnv?.cleanup();
});
