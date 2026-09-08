/**
 * Seeds the local Auth emulator with test accounts + custom claims.
 * Run: npm run seed   (emulators must be running)
 *
 * admin@voltair.test  / voltair123   -> { role: "admin" }
 * client@acme.test    / voltair123   -> { role: "client", clientId: "acme" }
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "Refusing to run: FIREBASE_AUTH_EMULATOR_HOST is not set. This script only targets the emulator.",
  );
  process.exit(1);
}

const app = initializeApp({
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "voltairstudio-aa855",
});
const auth = getAuth(app);

const accounts = [
  { email: "admin@voltair.test", password: "voltair123", claims: { role: "admin" } },
  {
    email: "client@acme.test",
    password: "voltair123",
    claims: { role: "client", clientId: "acme" },
  },
];

for (const account of accounts) {
  let user;
  try {
    user = await auth.getUserByEmail(account.email);
  } catch {
    user = await auth.createUser({
      email: account.email,
      password: account.password,
      emailVerified: true,
    });
  }
  await auth.setCustomUserClaims(user.uid, account.claims);
  console.log(`✓ ${account.email}  ${JSON.stringify(account.claims)}`);
}

console.log("\nDone. Sign in at http://localhost:3000/login");
process.exit(0);
