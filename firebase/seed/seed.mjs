/**
 * Seeds the local emulators with test accounts + portal content.
 * Run: npm run seed   (emulators must be running)
 *
 *   admin@voltair.test  / voltair123   -> { role: "admin" }
 *   client@acme.test    / voltair123   -> { role: "client", clientId: "acme" }
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Refusing to run: emulator host env vars are not set. This script only targets the emulators.");
  process.exit(1);
}

const app = initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "voltairstudio-aa855" });
const auth = getAuth(app);
const db = getFirestore(app);

const iso = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};

// --- accounts --------------------------------------------------------------
const accounts = [
  { email: "admin@voltair.test", password: "voltair123", claims: { role: "admin" }, name: "Studio Admin" },
  { email: "client@acme.test", password: "voltair123", claims: { role: "client", clientId: "acme" }, name: "Ada Mercer" },
];

const uids = {};
for (const account of accounts) {
  let user;
  try {
    user = await auth.getUserByEmail(account.email);
  } catch {
    user = await auth.createUser({ email: account.email, password: account.password, emailVerified: true });
  }
  await auth.updateUser(user.uid, { displayName: account.name });
  await auth.setCustomUserClaims(user.uid, account.claims);
  uids[account.email] = user.uid;
  console.log(`✓ auth  ${account.email}  ${JSON.stringify(account.claims)}`);
}

const clientUid = uids["client@acme.test"];

// --- client company + profile --------------------------------------------
await db.doc("clients/acme").set({
  clientId: "acme",
  name: "Acme Corp",
  logoUrl: null,
  status: "active",
  createdAt: iso(-90),
});

await db.doc(`users/${clientUid}`).set({
  uid: clientUid,
  email: "client@acme.test",
  displayName: "Ada Mercer",
  role: "client",
  clientId: "acme",
  avatarUrl: null,
  createdAt: iso(-90),
});

// --- projects -----------------------------------------------------------
const milestone = (id, title, status, order, target, done) => ({
  id,
  title,
  status,
  order,
  targetDate: target ?? null,
  completedAt: done ?? null,
});

const projects = [
  {
    projectId: "acme-brand-film",
    clientId: "acme",
    name: "Brand Film 2026",
    description: "A 90-second hero film for the spring product launch.",
    status: "active",
    stage: "qa",
    stagingUrl: "https://acme-brand-film.vercel.app",
    createdAt: iso(-42),
    timeline: { startDate: iso(-42), endDate: iso(12) },
    milestones: [
      milestone("m1", "Creative direction & moodboard", "complete", 0, iso(-38), iso(-36)),
      milestone("m2", "Script & storyboard", "complete", 1, iso(-30), iso(-29)),
      milestone("m3", "Production shoot", "complete", 2, iso(-18), iso(-16)),
      milestone("m4", "First cut & color", "complete", 3, iso(-8), iso(-6)),
      milestone("m5", "Client review & revisions", "active", 4, iso(4), null),
      milestone("m6", "Final delivery & master files", "pending", 5, iso(12), null),
    ],
  },
  {
    projectId: "acme-website",
    clientId: "acme",
    name: "Marketing Website",
    description: "Full redesign and rebuild of acmecorp.com.",
    status: "active",
    stage: "development",
    stagingUrl: "https://acme-web-staging.vercel.app",
    createdAt: iso(-25),
    timeline: { startDate: iso(-25), endDate: iso(30) },
    milestones: [
      milestone("w1", "Discovery & sitemap", "complete", 0, iso(-22), iso(-21)),
      milestone("w2", "Design system", "complete", 1, iso(-14), iso(-12)),
      milestone("w3", "Page design", "active", 2, iso(6), null),
      milestone("w4", "Build & CMS", "pending", 3, iso(20), null),
      milestone("w5", "Launch", "pending", 4, iso(30), null),
    ],
  },
  {
    projectId: "acme-2025-campaign",
    clientId: "acme",
    name: "Q4 Social Campaign",
    description: "A six-week paid social campaign across three channels.",
    status: "completed",
    stage: "launched",
    stagingUrl: null,
    createdAt: iso(-160),
    timeline: { startDate: iso(-160), endDate: iso(-90) },
    milestones: [
      milestone("c1", "Concept", "complete", 0, iso(-155), iso(-153)),
      milestone("c2", "Asset production", "complete", 1, iso(-140), iso(-136)),
      milestone("c3", "Launch", "complete", 2, iso(-120), iso(-120)),
      milestone("c4", "Wrap report", "complete", 3, iso(-92), iso(-91)),
    ],
  },
];

for (const project of projects) {
  await db.doc(`projects/${project.projectId}`).set(project);
  console.log(`✓ project  ${project.name}`);
}

// --- deliverables -----------------------------------------------------
const deliverables = [
  {
    deliverableId: "film-cut-v3",
    projectId: "acme-brand-film",
    clientId: "acme",
    name: "Brand Film — Cut v3",
    fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    fileType: "video",
    version: 3,
    status: "pending",
    feedbackCount: 2,
    decidedAt: null,
    createdAt: iso(-6),
  },
  {
    deliverableId: "film-keyframe-01",
    projectId: "acme-brand-film",
    clientId: "acme",
    name: "Hero keyframe — 01",
    fileUrl: "https://picsum.photos/id/1067/1600/1000",
    fileType: "image",
    version: 2,
    status: "approved",
    feedbackCount: 0,
    decidedAt: iso(-4),
    createdAt: iso(-9),
  },
  {
    deliverableId: "film-brief",
    projectId: "acme-brand-film",
    clientId: "acme",
    name: "Creative brief",
    fileUrl: "https://pdfobject.com/pdf/sample.pdf",
    fileType: "document",
    version: 1,
    status: "approved",
    feedbackCount: 0,
    decidedAt: iso(-35),
    createdAt: iso(-38),
  },
  {
    deliverableId: "web-design-review",
    projectId: "acme-website",
    clientId: "acme",
    name: "Homepage design — round 1",
    fileUrl: "https://picsum.photos/id/180/1600/2400",
    fileType: "image",
    version: 1,
    status: "changes-requested",
    feedbackCount: 1,
    decidedAt: iso(-2),
    createdAt: iso(-5),
  },
];

for (const deliverable of deliverables) {
  await db.doc(`deliverables/${deliverable.deliverableId}`).set(deliverable);
  console.log(`✓ deliverable  ${deliverable.name}`);
}

// --- comments (flat root collection, denormalized clientId) --------------
const comments = [
  {
    commentId: "c1",
    deliverableId: "film-cut-v3",
    projectId: "acme-brand-film",
    clientId: "acme",
    userId: uids["admin@voltair.test"],
    userName: "Voltair Studio",
    userRole: "admin",
    text: "Latest cut is up — we tightened the opening and swapped the track. Let us know how it lands.",
    attachments: [],
    timestamp: iso(-6),
  },
  {
    commentId: "c2",
    deliverableId: "film-cut-v3",
    projectId: "acme-brand-film",
    clientId: "acme",
    userId: clientUid,
    userName: "Ada Mercer",
    userRole: "client",
    text: "Really strong. One note: the logo reveal at 0:12 feels a touch fast — can we hold it a beat longer?",
    attachments: [],
    timestamp: iso(-5),
  },
];

for (const comment of comments) {
  await db.doc(`comments/${comment.commentId}`).set(comment);
}
console.log(`✓ comments  ${comments.length}`);

console.log("\nSeed complete. Sign in at http://localhost:3000/login as client@acme.test / voltair123");
process.exit(0);
