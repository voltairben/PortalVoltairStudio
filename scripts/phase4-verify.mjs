/**
 * Phase 4 admin-suite verification. Needs emulators + `npm run dev` + `npm run seed`.
 *   node --env-file=.env.local scripts/phase4-verify.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
const fbApp = initializeApp({ projectId: "voltairstudio-aa855" });
const adminDb = getFirestore(fbApp);
const fbAuth = getAuth(fbApp);

const BASE = "http://localhost:3000";
const OUT = "scratch-shots";
mkdirSync(OUT, { recursive: true });

const results = [];
const record = (label, pass) => {
  console.log(`  ${pass ? "✓" : "✗"} ${label}`);
  results.push(pass);
};

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "voltair123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

const browser = await chromium.launch();

// --- RBAC: client is locked out of /admin/* -----------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  try {
    await login(p, "client@acme.test");
    const routes = ["/admin", "/admin/clients", "/admin/projects", "/admin/deliverables", "/admin/inbox"];
    let allRedirected = true;
    let leaked = false;
    for (const route of routes) {
      await p.goto(`${BASE}${route}`);
      await p.waitForLoadState("networkidle").catch(() => {});
      if (!p.url().includes("/dashboard")) allRedirected = false;
      if (await p.isVisible('[data-testid="admin-sidebar"]').catch(() => false)) leaked = true;
    }
    record("client → every /admin/* route redirects to /dashboard", allRedirected);
    record("no admin shell rendered for a client", !leaked);
  } catch (err) {
    record(`RBAC(client): ${err.message.split("\n")[0]}`, false);
  }
  await ctx.close();
}

// --- Admin can reach every admin route ---------------------------------
const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const a = await adminCtx.newPage();
try {
  await login(a, "admin@voltair.test");
  await a.waitForURL("**/admin");
  await a.waitForSelector('[data-testid="admin-sidebar"]');
  record("admin lands on /admin with the admin shell", true);
  await a.screenshot({ path: `${OUT}/p4-01-overview.png`, fullPage: true });

  for (const [route, marker] of [
    ["/admin/clients", "text=Onboard client"],
    ["/admin/projects", "text=New project"],
    ["/admin/deliverables", "text=Upload deliverable"],
    ["/admin/inbox", "text=Studio inbox"],
  ]) {
    await a.goto(`${BASE}${route}`);
    await a.waitForSelector(marker, { timeout: 10000 });
  }
  record("admin can open clients / projects / deliverables / inbox", true);

  // --- Client onboarding ------------------------------------------------
  const stamp = Date.now();
  await a.goto(`${BASE}/admin/clients`);
  await a.click('button:has-text("Onboard client")');
  await a.fill('input[name="companyName"]', `Test Co ${stamp}`);
  await a.fill('input[name="displayName"]', "Pat Vega");
  await a.fill('input[name="email"]', `pat+${stamp}@testco.dev`);
  await a.fill('input[name="initialProjectName"]', "Kickoff Project");
  await a.click('button:has-text("Create client")');
  await a.waitForSelector("text=Temporary password", { timeout: 15000 });
  record("onboarding modal reports success + temp password", true);
  await a.screenshot({ path: `${OUT}/p4-02-onboard.png` });

  const clientSnap = await adminDb
    .collection("clients")
    .where("name", "==", `Test Co ${stamp}`)
    .get();
  const newClient = clientSnap.docs[0]?.data();
  const projSnap = newClient
    ? await adminDb.collection("projects").where("clientId", "==", newClient.clientId).get()
    : { size: 0 };
  const usersSnap = newClient
    ? await adminDb.collection("users").where("clientId", "==", newClient.clientId).get()
    : { size: 0 };
  record(
    "onboarding wrote company + user + initial project + activity",
    !!newClient &&
      newClient.primaryContactEmail === `pat+${stamp}@testco.dev` &&
      usersSnap.size === 1 &&
      projSnap.size === 1,
  );

  // --- Direct browser → Storage upload --------------------------------
  await a.goto(`${BASE}/admin/deliverables/upload`);
  await a.waitForSelector("select");
  await a.selectOption("select", "acme-brand-film");
  await a.fill('input[placeholder="Homepage Design"]', `PW Upload ${stamp}`);
  await a.fill('input[placeholder="v2.1"]', "v9.9");
  await a.setInputFiles('input[type="file"]', {
    name: `pw-upload-${stamp}.png`,
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  await a.click('button:has-text("Start upload")');
  await a.waitForSelector("text=Deliverable published", { timeout: 30000 });
  record("upload streams to Storage + creates the deliverable record", true);
  await a.screenshot({ path: `${OUT}/p4-03-upload.png` });

  const delSnap = await adminDb
    .collection("deliverables")
    .where("name", "==", `PW Upload ${stamp}`)
    .get();
  const del = delSnap.docs[0]?.data();
  record(
    "deliverable doc: pending status, tenant path, version label",
    !!del &&
      del.status === "pending" &&
      del.clientId === "acme" &&
      typeof del.assets?.[0]?.storagePath === "string" &&
      del.assets[0].storagePath.startsWith("deliverables/acme/") &&
      del.versionLabel === "v9.9",
  );

  // --- Multi-image upload → "designs" set -----------------------------
  await a.goto(`${BASE}/admin/deliverables/upload`);
  await a.waitForSelector("select");
  await a.selectOption("select", "acme-brand-film");
  await a.fill('input[placeholder="Homepage Design"]', `PW MultiImage ${stamp}`);
  await a.fill('input[placeholder="v2.1"]', "v1.0");
  await a.setInputFiles("input[type=\"file\"]", [
    { name: `pw-multi-${stamp}-a.png`, mimeType: "image/png", buffer: PNG_1x1 },
    { name: `pw-multi-${stamp}-b.png`, mimeType: "image/png", buffer: PNG_1x1 },
  ]);
  record("multi-image drop shows a 2-image summary", await a.isVisible("text=2 images selected"));
  await a.click('button:has-text("Start upload")');
  await a.waitForSelector("text=Deliverable published", { timeout: 30000 });
  await a.screenshot({ path: `${OUT}/p4-05-multi-upload.png` });

  const multiSnap = await adminDb
    .collection("deliverables")
    .where("name", "==", `PW MultiImage ${stamp}`)
    .get();
  const multi = multiSnap.docs[0]?.data();
  record(
    "multi-image deliverable: kind=designs, 2 assets, coverUrl = first asset",
    !!multi &&
      multi.kind === "designs" &&
      Array.isArray(multi.assets) &&
      multi.assets.length === 2 &&
      multi.coverUrl === multi.assets[0]?.url,
  );

  // --- Deliver a build (website deliverable) --------------------------
  await a.goto(`${BASE}/admin/deliverables/deliver-build`);
  await a.waitForSelector("select");
  await a.selectOption("select", "acme-brand-film");
  await a.fill('input[placeholder="Live build"]', `PW Build ${stamp}`);
  await a.fill('input[placeholder="https://acme.com"]', `https://pw-build-${stamp}.example.com`);
  await a.setInputFiles('input[type="file"]', {
    name: `pw-build-${stamp}.png`,
    mimeType: "image/png",
    buffer: PNG_1x1,
  });
  await a.click('button:has-text("Deliver build")');
  await a.waitForSelector("text=Build delivered", { timeout: 30000 });
  record("Deliver a build streams a screenshot + creates the deliverable", true);
  await a.screenshot({ path: `${OUT}/p4-06-deliver-build.png` });

  const buildSnap = await adminDb
    .collection("deliverables")
    .where("name", "==", `PW Build ${stamp}`)
    .get();
  const build = buildSnap.docs[0]?.data();
  record(
    "website deliverable: kind=website, 1 asset, coverUrl = asset url, siteUrl set",
    !!build &&
      build.kind === "website" &&
      Array.isArray(build.assets) &&
      build.assets.length === 1 &&
      build.coverUrl === build.assets[0]?.url &&
      build.siteUrl === `https://pw-build-${stamp}.example.com`,
  );

  // --- Invite a studio admin ------------------------------------------
  await a.goto(`${BASE}/admin/account`);
  await a.waitForSelector("text=Studio team");
  await a.click('button:has-text("Invite admin")');
  const inviteDialog = a.locator("dialog[open]");
  await inviteDialog.locator('input[name="displayName"]').fill(`PW Admin ${stamp}`);
  const adminEmail = `pw-admin-${stamp}@voltairstudio.dev`;
  await inviteDialog.locator('input[name="email"]').fill(adminEmail);
  await inviteDialog.locator('button:has-text("Send invite")').click();
  await a.waitForSelector("text=Admin invited", { timeout: 15000 });
  record("inviting a studio admin succeeds and shows a temp password", true);
  await a.screenshot({ path: `${OUT}/p4-07-invite-admin.png` });
  await inviteDialog.locator('button:has-text("Done")').click();
  await a.waitForSelector(`text=PW Admin ${stamp}`, { timeout: 10000 });
  record("the new admin appears in the studio team list", true);

  const newAdmin = await fbAuth.getUserByEmail(adminEmail);
  record(
    "invited account carries role: admin custom claim",
    newAdmin.customClaims?.role === "admin",
  );

  // --- Unified inbox real-time ---------------------------------------
  const client2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const c = await client2.newPage();
  await login(c, "client@acme.test");
  await c.goto(`${BASE}/projects/acme-brand-film/deliverables/film-cut-v3`);
  await c.waitForSelector("textarea");
  const marker = `inbox realtime ${stamp}`;

  await a.goto(`${BASE}/admin/inbox`);
  await a.waitForSelector("text=Studio inbox");
  await c.fill("textarea", marker);
  await c.click('button:has-text("Post")');
  await a.waitForSelector(`text=${marker}`, { timeout: 15000 });
  record("client comment appears in the Studio Inbox in real time", true);
  await a.screenshot({ path: `${OUT}/p4-04-inbox.png`, fullPage: true });

  // --- Studio-side deliverable review + reply -----------------------
  await a.locator('a:has-text("Open review")').first().click();
  await a.waitForURL("**/admin/projects/**/deliverables/**", { timeout: 10000 });
  await a.waitForSelector("text=Upload new version");
  record("Studio Inbox 'Open review' opens the studio review screen (no bounce)", true);

  const studioReply = `studio reply ${stamp}`;
  await a.waitForSelector("textarea:not([disabled])", { timeout: 10000 });
  await a.fill("textarea", studioReply);
  await a.click('button:has-text("Post")');
  await c.waitForSelector(`text=${studioReply}`, { timeout: 15000 });
  record("studio reply from the review screen reaches the client thread", true);
  await client2.close();

  // --- Delete a deliverable -------------------------------------------
  await a.goto(`${BASE}/admin/projects/${del.projectId}/deliverables/${del.deliverableId}`);
  await a.click('button:has-text("Delete deliverable")');
  const deleteDialog = a.locator("dialog[open]");
  await deleteDialog.waitFor({ state: "visible" });
  await deleteDialog.locator("input").fill(del.name);
  await deleteDialog.locator('button:has-text("Delete deliverable")').click();
  await a.waitForURL(`**/admin/projects/${del.projectId}`, { timeout: 15000 });
  record("deleting a deliverable redirects back to the project page", true);

  const deletedSnap = await adminDb.collection("deliverables").doc(del.deliverableId).get();
  record("deleted deliverable doc no longer exists", !deletedSnap.exists);
} catch (err) {
  record(`admin flow: ${err.message.split("\n")[0]}`, false);
  await a.screenshot({ path: `${OUT}/p4-error.png` }).catch(() => {});
}
await adminCtx.close();
await browser.close();

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
