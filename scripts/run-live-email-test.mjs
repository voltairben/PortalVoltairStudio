/**
 * Runs the Vitest `firebase` project with ONBOARD_LIVE=1 so the gated
 * "live (real Resend)" tests execute — sending one real branded onboarding
 * email to STUDIO_NOTIFY_EMAIL. Emulators are booted for the shared setup.
 *   npm run test:email
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  'firebase emulators:exec --only auth,firestore,storage "vitest run --project firebase"',
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ONBOARD_LIVE: "1" },
  },
);

process.exit(result.status ?? 1);
