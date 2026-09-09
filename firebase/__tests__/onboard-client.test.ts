import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { renderOnboardingEmail } from "@/lib/email/onboarding-template";
import { onboardClient } from "@/lib/onboarding/onboard-client";

const createdUids: string[] = [];

afterEach(async () => {
  for (const uid of createdUids.splice(0)) {
    await adminAuth.deleteUser(uid).catch(() => {});
  }
});

describe("onboardClient", () => {
  it("creates an auth account, sets claims, writes Firestore docs, sends email", async () => {
    const sendOnboardingEmail = vi.fn().mockResolvedValue({ id: "email_mock_1" });

    const result = await onboardClient(
      { companyName: "Acme Films", email: "founder@acmefilms.test", displayName: "Dana Reyes" },
      { auth: adminAuth, db: adminDb, sendOnboardingEmail },
    );
    createdUids.push(result.uid);

    const user = await adminAuth.getUser(result.uid);
    expect(user.email).toBe("founder@acmefilms.test");
    expect(user.customClaims).toEqual({ role: "client", clientId: result.clientId });

    const companySnap = await adminDb.doc(`clients/${result.clientId}`).get();
    expect(companySnap.data()).toMatchObject({
      clientId: result.clientId,
      name: "Acme Films",
      status: "active",
      primaryContactUid: result.uid,
      primaryContactEmail: "founder@acmefilms.test",
    });

    const activitySnap = await adminDb
      .collection("activity")
      .where("clientId", "==", result.clientId)
      .get();
    expect(activitySnap.docs.map((d) => d.data().type)).toContain("client-onboarded");

    const profileSnap = await adminDb.doc(`users/${result.uid}`).get();
    expect(profileSnap.data()).toMatchObject({
      uid: result.uid,
      role: "client",
      clientId: result.clientId,
      email: "founder@acmefilms.test",
    });

    expect(sendOnboardingEmail).toHaveBeenCalledOnce();
    expect(sendOnboardingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "founder@acmefilms.test",
        companyName: "Acme Films",
        tempPassword: result.tempPassword,
      }),
    );
    expect(result.emailSent).toBe(true);
  });

  it("honours an explicit clientId", async () => {
    const result = await onboardClient(
      {
        companyName: "Northwind Studios",
        email: "ops@northwind.test",
        displayName: "Kai Ndlovu",
        clientId: "northwind",
      },
      { auth: adminAuth, db: adminDb, sendOnboardingEmail: vi.fn().mockResolvedValue({ id: null }) },
    );
    createdUids.push(result.uid);
    expect(result.clientId).toBe("northwind");
  });

  it("creates an initial project when initialProjectName is given", async () => {
    const result = await onboardClient(
      {
        companyName: "Kickoff Co",
        email: "hi@kickoff.test",
        displayName: "Robin Vega",
        initialProjectName: "Rebrand 2026",
      },
      { auth: adminAuth, db: adminDb, sendOnboardingEmail: vi.fn().mockResolvedValue({ id: null }) },
    );
    createdUids.push(result.uid);
    expect(result.projectId).toBeTruthy();

    const projectSnap = await adminDb.doc(`projects/${result.projectId}`).get();
    expect(projectSnap.data()).toMatchObject({
      clientId: result.clientId,
      name: "Rebrand 2026",
      stage: "onboarding",
      status: "active",
    });
  });

  it("rejects a duplicate email without creating an orphan account", async () => {
    const send = vi.fn().mockResolvedValue({ id: null });
    const first = await onboardClient(
      { companyName: "Beta Co", email: "dup@beta.test", displayName: "Sam Okafor" },
      { auth: adminAuth, db: adminDb, sendOnboardingEmail: send },
    );
    createdUids.push(first.uid);

    await expect(
      onboardClient(
        { companyName: "Beta Two", email: "dup@beta.test", displayName: "Sam Two" },
        { auth: adminAuth, db: adminDb, sendOnboardingEmail: send },
      ),
    ).rejects.toThrow(/already exists/i);
  });

  it("renders a persimmon-branded onboarding email", () => {
    const { subject, html, text } = renderOnboardingEmail({
      email: "x@y.test",
      displayName: "Jamie Lin",
      companyName: "Lin Media",
      tempPassword: "ABCDE-FGHIJ-KLMNO-PQRST",
    });
    expect(subject).toMatch(/voltair/i);
    expect(html).toContain("#FF4F00");
    expect(html).toContain("#0A0A0A");
    expect(html).toContain("ABCDE-FGHIJ-KLMNO-PQRST");
    expect(html).toContain("https://portal.voltairstudio.com/login");
    expect(text).toContain("ABCDE-FGHIJ-KLMNO-PQRST");
  });
});

describe.runIf(process.env.ONBOARD_LIVE === "1")("onboardClient — live (real Resend)", () => {
  beforeAll(() => {
    // voltairstudio.com isn't verified in Resend yet (DNS is a later step), so
    // send from Resend's shared testing sender to the account owner's inbox.
    if (/voltairstudio\.com/.test(process.env.EMAIL_FROM ?? "")) {
      vi.stubEnv("EMAIL_FROM", "Voltair Studio <onboarding@resend.dev>");
    }
  });

  it("sends a real branded email via Resend", async () => {
    const { sendOnboardingEmail } = await import("@/lib/email/send");
    const to = process.env.STUDIO_NOTIFY_EMAIL || "delivered@resend.dev";
    const res = await sendOnboardingEmail({
      email: to,
      displayName: "Live Test",
      companyName: "Voltair QA",
      tempPassword: "LIVE1-TEST2-EMAIL3-CHECK4",
    });
    expect(res.id).toBeTruthy();
    console.log(`\n  ↳ Resend accepted onboarding email ${res.id} → ${to}\n`);
  }, 30_000);

  it("onboards a full mock client company end-to-end", async () => {
    const { sendOnboardingEmail } = await import("@/lib/email/send");
    const stamp = Date.now();
    const to = process.env.STUDIO_NOTIFY_EMAIL || "delivered@resend.dev";
    const result = await onboardClient(
      {
        companyName: `Mock Client ${stamp}`,
        email: to,
        displayName: "Mock Client Contact",
        clientId: `mock-client-${stamp}`,
      },
      { auth: adminAuth, db: adminDb, sendOnboardingEmail },
    );
    createdUids.push(result.uid);

    const user = await adminAuth.getUser(result.uid);
    console.log("\n  ── Mock client onboarded ──");
    console.log(`  clientId     : ${result.clientId}`);
    console.log(`  auth uid     : ${result.uid}`);
    console.log(`  claims       : ${JSON.stringify(user.customClaims)}`);
    console.log(`  temp password: ${result.tempPassword}`);
    console.log(`  email sent   : ${result.emailSent}  (id ${result.emailId})`);
    console.log(`  clients/${result.clientId} + users/${result.uid} written\n`);

    expect(user.customClaims).toEqual({ role: "client", clientId: result.clientId });
    expect(result.emailSent).toBe(true);
  }, 30_000);
});
