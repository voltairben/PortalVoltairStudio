/**
 * Deletes a client company from the LIVE project: the Auth user, their user
 * profile, the client doc, and every project / deliverable / comment / activity
 * row denormalized with that clientId. Dev/test cleanup — there is no admin UI
 * for this by design.
 *
 *   node --env-file=.env.local scripts/delete-client.mjs <clientId | email>
 *
 * Emulator host vars are stripped so this always targets production.
 */
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node --env-file=.env.local scripts/delete-client.mjs <clientId | email>");
  process.exit(1);
}

const { cert, initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth(app);
const db = getFirestore(app);

// Resolve to a client doc — by id, or by primaryContactEmail.
let clientDoc;
if (arg.includes("@")) {
  const snap = await db.collection("clients").where("primaryContactEmail", "==", arg).limit(1).get();
  clientDoc = snap.docs[0];
} else {
  const d = await db.doc(`clients/${arg}`).get();
  if (d.exists) clientDoc = d;
}
if (!clientDoc) {
  console.error(`No client found for "${arg}".`);
  process.exit(1);
}

const clientId = clientDoc.id;
const { primaryContactUid, primaryContactEmail, name } = clientDoc.data();
console.log(`Deleting client "${name}" (${clientId})  contact ${primaryContactEmail}`);

// Tenant-scoped collections that carry a denormalized clientId.
for (const coll of ["projects", "deliverables", "comments", "activity"]) {
  const snap = await db.collection(coll).where("clientId", "==", clientId).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  console.log(`  ${coll}: ${snap.size} deleted`);
}

if (primaryContactUid) {
  await db.doc(`users/${primaryContactUid}`).delete().catch(() => {});
  await auth.deleteUser(primaryContactUid).catch((e) => console.log(`  auth user: ${e.message}`));
  console.log(`  user profile + auth account removed`);
}

await clientDoc.ref.delete();
console.log(`  clients/${clientId} deleted`);
console.log("Done.");
process.exit(0);
