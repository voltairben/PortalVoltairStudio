import Image from "next/image";
import { SignOutButton } from "@/components/sign-out-button";

/** Minimal mobile top bar — brand mark + label only. Navigation lives in <AdminBottomNav />. */
export function AdminMobileNav() {
  return (
    <header
      className="sticky top-0 z-30 flex h-[52px] items-center gap-2.5 border-b border-zinc-800 bg-brand-obsidian/90 px-4 backdrop-blur-md lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <Image src="/brand/voltair-logo.png" alt="" width={16} height={24} className="h-5 w-auto" />
      <span className="text-[13px] font-semibold tracking-tight text-ink">Voltair</span>
      <span className="rounded border border-brand-persimmon/40 bg-brand-persimmon/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-brand-persimmon">
        Admin
      </span>
      <div className="-mr-2 ml-auto">
        <SignOutButton compact />
      </div>
    </header>
  );
}
