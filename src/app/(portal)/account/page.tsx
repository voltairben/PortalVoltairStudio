import type { Metadata } from "next";
import { SignOutButton } from "@/components/sign-out-button";
import { initialsOf } from "@/lib/format";
import { getClientCompany } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireClient();
  const company = user.clientId ? await getClientCompany(user.clientId) : null;

  return (
    <div className="max-w-lg space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Account</h1>
        <p className="mt-1 text-sm text-ink-muted">Your portal profile and workspace.</p>
      </header>

      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full border border-zinc-800 bg-surface-2 text-sm font-semibold text-ink"
          >
            {initialsOf(user.name ?? user.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ink">{user.name ?? "—"}</p>
            <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-zinc-800 pt-4 text-[13px]">
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

      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-surface-1 px-5 py-4">
        <div>
          <p className="text-[13px] font-medium text-ink">Sign out</p>
          <p className="text-[12px] text-ink-subtle">End your session on this device.</p>
        </div>
        <SignOutButton />
      </div>

      <p className="text-[12px] leading-5 text-ink-subtle">
        Need a change to your account or team access? Reply to any Voltair Studio email
        and we&rsquo;ll take care of it.
      </p>
    </div>
  );
}
