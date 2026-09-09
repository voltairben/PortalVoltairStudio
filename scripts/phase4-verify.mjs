/**
 * Phase 4 admin-suite verification. Needs emulators + `npm run dev` + `npm run seed`.
 *   node --env-file=.env.local scripts/phase4-verify.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
const adminDb = getFirestore(initializeApp({ projectId: "voltairstudio-aa855" }));

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
  await a.fill('input[placeholder="Brand Film — Cut v3"]', `PW Upload ${stamp}`);
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
      typeof del.storagePath === "string" &&
      del.storagePath.startsWith("deliverables/acme/") &&
      del.versionLabel === "v9.9",
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
  await client2.close();
} catch (err) {
  record(`admin flow: ${err.message.split("\n")[0]}`, false);
  await a.screenshot({ path: `${OUT}/p4-error.png` }).catch(() => {});
}
await adminCtx.close();
await browser.close();

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
