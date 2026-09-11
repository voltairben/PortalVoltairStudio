import type { Metadata } from "next";
import { AdminInviteModal } from "@/components/admin/admin-invite-modal";
import { AdminTeamList } from "@/components/admin/admin-team-list";
import { AccountForm } from "@/components/portal/account-form";
import { SignOutButton } from "@/components/sign-out-button";
import { getAllAdmins } from "@/lib/data/admin";
import { getUserProfile } from "@/lib/data/portal";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Account" };

export default async function AdminAccountPage() {
  const user = await requireAdmin();
  const [profile, admins] = await Promise.all([getUserProfile(user.uid), getAllAdmins()]);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl text-ink">Account</h1>
        <p className="mt-1 text-sm text-ink-muted">Your studio profile.</p>
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
            <dt className="text-ink-subtle">Access</dt>
            <dd className="text-ink">Studio admin</dd>
          </div>
        </dl>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Studio team{" "}
            <span className="ml-1 font-mono normal-case tracking-normal text-ink-subtle">
              {admins.length}
            </span>
          </h2>
          <AdminInviteModal />
        </div>
        <AdminTeamList admins={admins} currentUid={user.uid} />
      </section>

      <div className="flex items-center justify-between rounded-xl border border-line-strong bg-surface-1 px-6 py-4">
        <div>
          <p className="text-[13px] font-medium text-ink">Sign out</p>
          <p className="text-[12px] text-ink-subtle">End your session on this device.</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
