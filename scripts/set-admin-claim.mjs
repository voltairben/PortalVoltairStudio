/**
 * Grants { role: "admin" } to a Firebase Auth user in the LIVE project.
 * This is the one-time bootstrap for the first studio admin — after that,
 * admins onboard clients through /admin/clients.
 *
 *   node --env-file=.env.local scripts/set-admin-claim.mjs you@voltairstudio.com
 *
 * The emulator host vars from .env.local are stripped below so this always
 * targets production. The user must already exist (create them in the Firebase
 * console: Authentication → Add user).
 */
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

const email = process.argv[2];
if (!email) {
  console.error("usage: node --env-file=.env.local scripts/set-admin-claim.mjs <email>");
  process.exit(1);
}

const { cert, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});

const auth = getAuth(app);
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { role: "admin" });

console.log(`✓ ${email} (${user.uid}) is now role: admin`);
console.log("  Sign out and back in for the claim to take effect.");
process.exit(0);
