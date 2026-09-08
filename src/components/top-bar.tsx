import Image from "next/image";
import { SignOutButton } from "@/components/sign-out-button";
import type { SessionUser } from "@/lib/firebase/session";

export function TopBar({ user, area }: { user: SessionUser; area: "portal" | "admin" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-brand-obsidian/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/voltair-logo.png"
            alt="Voltair Studio"
            width={20}
            height={30}
            className="h-6 w-auto"
          />
          <span className="text-sm font-medium text-ink">Voltair Portal</span>
          {area === "admin" && (
            <span className="rounded-md border border-brand-persimmon/40 bg-brand-persimmon/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-persimmon">
              Studio
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-subtle sm:inline">{user.email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
