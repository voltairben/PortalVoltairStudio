import type { Metadata } from "next";
import { AccountForm } from "@/components/portal/account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getClientCompany, getUserProfile } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireClient();
  const [company, profile] = await Promise.all([
    user.clientId ? getClientCompany(user.clientId) : null,
    getUserProfile(user.uid),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl text-ink">Account</h1>
        <p className="mt-1 text-sm text-ink-muted">Your portal profile and workspace.</p>
      </header>

      <AccountForm
        uid={user.uid}
        name={user.name}
        email={user.email}
        picture={user.picture}
        phone={profile?.phone ?? null}
        jobTitle={profile?.jobTitle ?? null}
      />

      <div className="rounded-xl border border-line-strong bg-surface-1 p-6">
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Company</dt>
            <dd className="text-ink">{company?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Access</dt>
            <dd className="text-ink">Invite-only client</dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-line-strong bg-surface-1 px-6 py-4">
        <div>
          <p className="text-[13px] font-medium text-ink">Sign out</p>
          <p className="text-[12px] text-ink-subtle">End your session on this device.</p>
        </div>
        <SignOutButton />
      </div>

      <p className="text-[12px] leading-5 text-ink-subtle">
        Need a change to your company or team access? Reply to any Voltair Studio email
        and we&rsquo;ll take care of it.
      </p>
    </div>
  );
}
