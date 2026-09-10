import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the Voltair Studio client portal handles your data.",
};

// ─────────────────────────────────────────────────────────────────────────────
// BEFORE PUBLISHING TO THE APP STORES, replace every [BRACKETED] value below with
// your real details, set EFFECTIVE_DATE, and have the result reviewed. This copy
// is accurate to what the software does; it is not legal advice.
// ─────────────────────────────────────────────────────────────────────────────
const OPERATOR = "[Voltair Studio — legal entity name]";
const OPERATOR_ADDRESS = "[street, postal code, city, Netherlands]";
const KVK = "[KVK number]";
const CONTACT_EMAIL = "[privacy@voltairstudio.com]";
const EFFECTIVE_DATE = "[10 September 2026]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-6 text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-16">
      <Link
        href="/login"
        className="text-[12px] text-ink-subtle transition-colors hover:text-brand-persimmon"
      >
        ← Voltair Studio Portal
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-[13px] text-ink-subtle">Effective {EFFECTIVE_DATE}</p>

      <div className="mt-6 space-y-3 text-[14px] leading-6 text-ink-muted">
        <p>
          This policy explains how {OPERATOR} (&ldquo;Voltair Studio&rdquo;, &ldquo;we&rdquo;)
          handles personal data in the Voltair Studio client portal — the web app at{" "}
          <span className="text-ink">portalvoltairstudio.vercel.app</span> and its iOS and
          Android apps, which load that same site.
        </p>
        <p>
          The portal is invite-only. We create every account for a specific studio client;
          there is no public sign-up. We are the data controller for the personal data
          described here.
        </p>
      </div>

      <Section title="Data we collect">
        <p>
          <span className="text-ink">Account &amp; contact.</span> Your name, email address,
          and the password you set (stored only as a secure hash by our authentication
          provider). For a client company: the company name and its primary contact name and
          email.
        </p>
        <p>
          <span className="text-ink">Content you and we put in the portal.</span> Project
          names and descriptions, milestones, deliverable files (video, image, PDF), version
          labels, review comments, approval and change-request decisions, and any files you
          attach to feedback.
        </p>
        <p>
          <span className="text-ink">Session &amp; security data.</span> A strictly-necessary
          authentication cookie (<span className="text-ink">__session</span>), your IP address
          (used to rate-limit sign-in attempts and recorded briefly in server logs), and
          basic request information (browser type, timestamps) in our hosting provider&rsquo;s
          logs.
        </p>
        <p>
          The portal contains a &ldquo;Developer Pulse&rdquo; panel showing our own build and
          deployment activity (commit messages, branch names, deploy status). This is our
          engineering metadata, not your personal data.
        </p>
        <p>We do not use analytics, advertising, or third-party tracking.</p>
      </Section>

      <Section title="Why we use it, and our legal basis">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            To provide the portal to you as part of our engagement with your company —
            <span className="text-ink"> performance of a contract</span> (GDPR Art. 6(1)(b)).
          </li>
          <li>
            To keep the service secure and prevent abuse (rate limiting, logging) —
            <span className="text-ink"> our legitimate interests</span> (Art. 6(1)(f)).
          </li>
          <li>
            To send you transactional email (account setup, &ldquo;deliverable ready&rdquo;,
            decision notifications) — <span className="text-ink">contract performance</span>.
          </li>
        </ul>
        <p>We do not sell personal data and we do not use it for automated decision-making.</p>
      </Section>

      <Section title="Who processes data on our behalf">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-ink">Google Firebase</span> (Google Ireland Ltd. / Google
            LLC) — authentication, database, and file storage. Account data and portal content
            are stored in the <span className="text-ink">European Union</span> (multi-region
            &ldquo;eur3&rdquo;).
          </li>
          <li>
            <span className="text-ink">Vercel Inc.</span> (USA) — application hosting and
            serverless functions. Requests are processed in a United States region and
            appear in Vercel&rsquo;s short-lived logs.
          </li>
          <li>
            <span className="text-ink">Resend</span> — delivery of the transactional emails
            listed above (the recipient address and message content), once an email sending
            domain is configured.
          </li>
          <li>
            <span className="text-ink">GitHub</span> and <span className="text-ink">Vercel</span>{" "}
            webhooks — deliver our deployment metadata to the Developer Pulse panel; no
            personal data of yours is sent.
          </li>
        </ul>
        <p>
          Each provider acts under a data processing agreement and may only use the data to
          provide its service to us.
        </p>
      </Section>

      <Section title="International transfers">
        <p>
          Portal content and accounts are stored in the EU. Because our hosting provider
          (Vercel) is based in the United States and processes requests there, some data is
          transferred outside the EEA. These transfers rely on the European Commission&rsquo;s
          Standard Contractual Clauses and the providers&rsquo; supplementary safeguards.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account and portal content for as long as your company&rsquo;s
          engagement with Voltair Studio is active. When an engagement ends, or on your
          request, we delete the client account — which removes the login and every
          associated project, deliverable, comment, and activity record. Backups and provider
          logs roll off on their own short schedules.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under the GDPR you can ask us to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>give you a copy of the personal data we hold about you (access);</li>
          <li>correct data that is wrong or incomplete (rectification);</li>
          <li>delete your data (erasure);</li>
          <li>restrict or object to certain processing;</li>
          <li>receive your data in a portable format.</li>
        </ul>
        <p>
          Email <span className="text-ink">{CONTACT_EMAIL}</span> and we will respond within
          one month. You may also complain to the Dutch Data Protection Authority
          (Autoriteit Persoonsgegevens, <span className="text-ink">autoriteitpersoonsgegevens.nl</span>).
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          The portal sets one cookie: <span className="text-ink">__session</span>, which keeps
          you signed in. It is httpOnly, Secure, and SameSite=Lax, and is required for the app
          to work — so we do not show a cookie banner for it. There are no analytics or
          advertising cookies.
        </p>
      </Section>

      <Section title="Security">
        <p>
          All traffic is encrypted with TLS. Database and storage rules enforce that each
          client can only ever read or write their own company&rsquo;s data. Sign-in is
          rate-limited, and the app runs under a strict Content Security Policy. No system is
          perfectly secure, but we take reasonable measures appropriate to the data involved.
        </p>
      </Section>

      <Section title="Children">
        <p>The portal is a business tool and is not directed to anyone under 16.</p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy we will update the effective date above and, for material
          changes, notify the affected clients by email.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {OPERATOR}
          <br />
          {OPERATOR_ADDRESS}
          <br />
          KVK {KVK}
          <br />
          <span className="text-ink">{CONTACT_EMAIL}</span>
        </p>
      </Section>
    </main>
  );
}
