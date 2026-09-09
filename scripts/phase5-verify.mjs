/**
 * Phase 5 — Developer Pulse + webhook verification.
 * Needs emulators + `npm run seed` + `npm run dev` running.
 *   node --env-file=.env.local scripts/phase5-verify.mjs
 */
import { createHmac } from "node:crypto";
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const V_SECRET = process.env.VERCEL_WEBHOOK_SECRET;
const G_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const results = [];
const record = (label, pass) => {
  console.log(`  ${pass ? "✓" : "✗"} ${label}`);
  results.push(pass);
};

const sign = (algo, body, secret) => createHmac(algo, secret).update(body).digest("hex");

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "voltair123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

// --- webhook signature enforcement -------------------------------------
{
  const body = JSON.stringify({ type: "deployment.succeeded" });
  const bad = await fetch(`${BASE}/api/webhooks/vercel`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vercel-signature": "deadbeef" },
    body,
  });
  record("vercel webhook rejects a bad signature (401)", bad.status === 401);

  const ping = await fetch(`${BASE}/api/webhooks/github`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "ping",
      "x-github-delivery": "d-ping",
      "x-hub-signature-256": `sha256=${sign("sha256", "{}", G_SECRET)}`,
    },
    body: "{}",
  });
  record("github webhook accepts a correctly-signed ping (200)", ping.status === 200);

  const noSig = await fetch(`${BASE}/api/webhooks/github`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-github-event": "push" },
    body: "{}",
  });
  record("github webhook rejects a missing signature (401)", noSig.status === 401);
}

const browser = await chromium.launch();

// --- desktop: Developer Pulse renders on the project page --------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await login(page, "client@acme.test");
  await page.goto(`${BASE}/projects/acme-brand-film`);

  const pulse = page.locator("section", { has: page.getByRole("heading", { name: "Developer Pulse" }) });
  await pulse.waitFor({ timeout: 10000 });
  record("Developer Pulse section renders (desktop)", await pulse.isVisible());
  record(
    "deployment status card shows the live staging state",
    await pulse.getByText("Live staging preview").isVisible(),
  );
  record(
    "velocity stream shows a seeded event",
    await pulse.getByText("Grade the final montage sequence").isVisible(),
  );
  const openPreview = pulse.getByRole("link", { name: /open preview/i });
  record("deployment card has an external 'Open preview' link", await openPreview.isVisible());

  // --- real-time: a signed webhook lands in the open page without reload
  const commitTitle = `Ship the teaser trailer ${Date.now()}`;
  const ghBody = JSON.stringify({
    ref: "refs/heads/main",
    repository: { full_name: "voltairben/acme-brand-film" },
    sender: { login: "voltairben", avatar_url: "https://example.test/a.png" },
    commits: [{ id: `c${Date.now()}`, message: commitTitle, url: "https://example.test/c", author: { name: "Ben" } }],
  });
  const res = await fetch(`${BASE}/api/webhooks/github`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "push",
      "x-github-delivery": `d-${Date.now()}`,
      "x-hub-signature-256": `sha256=${sign("sha256", ghBody, G_SECRET)}`,
    },
    body: ghBody,
  });
  record("signed github push webhook accepted (200)", res.status === 200);

  let appeared = false;
  try {
    await pulse.getByText(commitTitle).waitFor({ timeout: 10000 });
    appeared = true;
  } catch {
    appeared = false;
  }
  record("new commit appears in the client's Pulse in real time (no reload)", appeared);

  // --- signed vercel error event flips the deployment badge
  const vBody = JSON.stringify({
    id: `evt-${Date.now()}`,
    type: "deployment.error",
    createdAt: Date.now(),
    payload: {
      deployment: {
        id: "dpl_err",
        url: "acme-brand-film-err.vercel.app",
        meta: { githubCommitOrg: "voltairben", githubCommitRepo: "acme-brand-film", githubCommitRef: "main" },
      },
    },
  });
  await fetch(`${BASE}/api/webhooks/vercel`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-vercel-signature": sign("sha1", vBody, V_SECRET) },
    body: vBody,
  });
  let flipped = false;
  try {
    await pulse.getByText("Deployment issue").waitFor({ timeout: 10000 });
    flipped = true;
  } catch {
    flipped = false;
  }
  record("vercel error webhook flips the deployment badge live", flipped);

  // --- GitHub deployment_status (no Pro plan needed) drives the badge too
  const dsBody = JSON.stringify({
    deployment_status: {
      id: Date.now(),
      state: "success",
      environment: "Preview",
      environment_url: "https://acme-brand-film-recovered.vercel.app",
      created_at: new Date().toISOString(),
    },
    deployment: { id: Date.now(), ref: "main" },
    repository: { full_name: "voltairben/acme-brand-film" },
  });
  const dsRes = await fetch(`${BASE}/api/webhooks/github`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "deployment_status",
      "x-github-delivery": `d-ds-${Date.now()}`,
      "x-hub-signature-256": `sha256=${sign("sha256", dsBody, G_SECRET)}`,
    },
    body: dsBody,
  });
  record("signed github deployment_status accepted (200)", dsRes.status === 200);
  let recovered = false;
  try {
    await pulse.getByText("Live staging preview").waitFor({ timeout: 10000 });
    recovered = true;
  } catch {
    recovered = false;
  }
  record("github deployment_status=success restores the live badge", recovered);

  await ctx.close();
}

// --- mobile 375: renders, no horizontal overflow ----------------------
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 780 } });
  const page = await ctx.newPage();
  await login(page, "client@acme.test");
  await page.goto(`${BASE}/projects/acme-brand-film`);
  const heading = page.getByRole("heading", { name: "Developer Pulse" });
  await heading.waitFor({ timeout: 10000 });
  record("Developer Pulse renders at 375px", await heading.isVisible());
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record(`no horizontal overflow at 375px (${overflow}px)`, overflow <= 1);
  await ctx.close();
}

// --- tenant isolation: another project's pulse does not bleed in ------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, "client@acme.test");
  await page.goto(`${BASE}/projects/acme-brand-film`);
  await page.getByRole("heading", { name: "Developer Pulse" }).waitFor({ timeout: 10000 });
  const leaked = await page.getByText("Pricing page layout").isVisible().catch(() => false);
  record("acme-website's pulse events do NOT show on acme-brand-film", !leaked);
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
