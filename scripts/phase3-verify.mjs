/**
 * Phase 3 smoke test + screenshots. Requires emulators + `npm run dev` running,
 * and `npm run seed` already applied.
 *   node scripts/phase3-verify.mjs
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
const adminDb = getFirestore(initializeApp({ projectId: "voltairstudio-aa855" }));

// Reset the deliverable under test so the run is repeatable without a reseed.
await adminDb.doc("deliverables/film-cut-v3").update({ status: "pending", decidedAt: null });

const BASE = "http://localhost:3000";
const OUT = "scratch-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
const record = (label, pass) => {
  console.log(`  ${pass ? "✓" : "✗"} ${label}`);
  results.push(pass);
};

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', "client@acme.test");
  await page.fill('input[name="password"]', "voltair123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
}

// --- desktop 1440 --------------------------------------------------------
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const d = await desktop.newPage();
try {
  await login(d);
  await d.waitForSelector("text=Client Project — Video");
  record("login → dashboard (no flicker redirect)", true);
  record("sidebar visible at 1440", await d.isVisible('[data-testid="sidebar"]'));

  record(
    "dashboard hero shows the latest deliverable",
    (await d.isVisible("text=New from Voltair Studio")) ||
      (await d.isVisible("text=Latest delivery")),
  );
  record("attention panel renders", await d.isVisible("text=Needs your attention"));
  const barColors = await d.$$eval("[data-fill]", (els) =>
    els.map((e) => getComputedStyle(e).backgroundColor),
  );
  const isPersimmon = (c) => /rgba?\(\s*255,\s*79,\s*0/.test(c);
  record(
    "at most one project bar is persimmon (the client's turn)",
    barColors.filter(isPersimmon).length <= 1 && barColors.length >= 2,
  );
  await d.screenshot({ path: `${OUT}/01-dashboard-1440.png`, fullPage: true });

  await d.click("text=Client Project — Video");
  await d.waitForURL("**/projects/acme-brand-film");
  await d.waitForSelector("text=Milestones");
  record("project detail + milestone rail", await d.isVisible("text=Client review & revisions"));
  await d.screenshot({ path: `${OUT}/02-project-1440.png`, fullPage: true });

  await d.click("text=Video Cut — v3");
  await d.waitForURL("**/deliverables/film-cut-v3");
  await d.waitForSelector("video");
  record("deliverable review + custom video player", await d.isVisible("video"));
  record("seeded studio comment visible", await d.isVisible("text=tightened the opening"));
  await d.screenshot({ path: `${OUT}/03-deliverable-1440.png`, fullPage: true });

  const stamp = `pw check ${Date.now()}`;
  await d.fill("textarea", stamp);
  await d.click('button:has-text("Post")');
  await d.waitForSelector(`text=${stamp}`, { timeout: 10000 });
  record("comment posts and appears optimistically", true);
  await d.screenshot({ path: `${OUT}/04-comment-1440.png`, fullPage: true });

  await d.click('button:has-text("Request changes")');
  await d.waitForTimeout(500);
  const draft = await d.inputValue("textarea");
  record("request-changes prefills composer", draft.includes("[Changes Requested]"));

  // The listener query filters by clientId — if it did not, Firestore rules
  // would reject it and no comments would render. They do, and the thread
  // reaches "Live", which only happens on a rules-compliant server sync.
  await d.waitForSelector('text="Live"', { timeout: 15000 });
  record("comment listener reaches Live (rules-compliant tenant query)", true);

  // Approve flow
  await d.reload();
  await d.waitForSelector('button:has-text("Approve deliverable")');
  await d.click('button:has-text("Approve deliverable")');
  await d.waitForSelector('dialog[open] button:has-text("Approve")');
  await d.click('dialog[open] button:has-text("Approve")');
  await d.waitForSelector("text=Approved", { timeout: 15000 });
  record("approve → status becomes Approved + confetti", true);
  await d.screenshot({ path: `${OUT}/08-approved-1440.png`, fullPage: true });

  // Verify the posted comment landed in Firestore with the tenant keys.
  const snap = await adminDb.collection("comments").where("text", "==", stamp).get();
  const c = snap.docs[0]?.data() ?? {};
  record(
    "posted comment carries clientId / projectId / deliverableId + userRole",
    c.clientId === "acme" &&
      c.projectId === "acme-brand-film" &&
      c.deliverableId === "film-cut-v3" &&
      c.userRole === "client",
  );

  // --- Phase B: multi-image gallery -------------------------------------
  await d.goto(`${BASE}/projects/acme-website/deliverables/web-design-review`);
  await d.waitForSelector("text=1 / 3", { timeout: 10000 });
  record("gallery viewer shows a 3-image counter", true);
  await d.click('button[aria-label="Next"]');
  await d.waitForSelector("text=2 / 3", { timeout: 5000 });
  record("gallery next arrow advances", true);
  await d.screenshot({ path: `${OUT}/09-gallery-1440.png`, fullPage: true });
} catch (err) {
  record(`desktop flow: ${err.message.split("\n")[0]}`, false);
  await d.screenshot({ path: `${OUT}/desktop-error.png` }).catch(() => {});
}
await desktop.close();

// --- mobile 375 ---------------------------------------------------------
const mobile = await browser.newContext({
  viewport: { width: 375, height: 780 },
  isMobile: true,
  hasTouch: true,
});
const m = await mobile.newPage();
try {
  await login(m);
  await m.waitForSelector("text=Client Project — Video");
  record("bottom nav visible at 375", await m.isVisible('[data-testid="bottom-nav"]'));
  record("sidebar hidden at 375", !(await m.isVisible('[data-testid="sidebar"]')));
  await m.screenshot({ path: `${OUT}/05-dashboard-375.png`, fullPage: true });

  await m.click('[data-testid="bottom-nav"] a:has-text("Projects")');
  await m.waitForURL("**/projects");
  record("bottom-nav navigation works", true);
  await m.screenshot({ path: `${OUT}/06-projects-375.png`, fullPage: true });

  await m.goto(`${BASE}/projects/acme-brand-film/deliverables/film-cut-v3`);
  await m.waitForSelector("video");
  await m.screenshot({ path: `${OUT}/07-deliverable-375.png`, fullPage: true });
} catch (err) {
  record(`mobile flow: ${err.message.split("\n")[0]}`, false);
  await m.screenshot({ path: `${OUT}/mobile-error.png` }).catch(() => {});
}
await mobile.close();
await browser.close();

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
