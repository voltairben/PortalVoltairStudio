import { SignOutButton } from "@/components/sign-out-button";
import { initialsOf } from "@/lib/format";
import type { SessionUser } from "@/lib/firebase/session";

export function UserBlock({
  user,
  companyName,
}: {
  user: SessionUser;
  companyName: string | null;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 px-4 py-3.5">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-800 bg-surface-2 text-xs font-semibold text-ink"
      >
        {initialsOf(user.name ?? user.email)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{user.name ?? user.email}</p>
        <p className="truncate text-[11px] text-ink-subtle">{companyName ?? user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}
