import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";
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
      <Avatar src={user.picture} name={user.name ?? user.email} className="size-9 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{user.name ?? user.email}</p>
        <p className="truncate text-[11px] text-ink-subtle">{companyName ?? user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}
