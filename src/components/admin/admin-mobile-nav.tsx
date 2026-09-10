import Image from "next/image";
import { SignOutButton } from "@/components/sign-out-button";

/** Minimal mobile top bar — brand mark + label only. Navigation lives in <AdminBottomNav />. */
export function AdminMobileNav() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-800 bg-brand-obsidian/90 px-4 backdrop-blur-md lg:hidden"
      style={{
        // 56px of bar, always below the status bar — not squeezed into it on
        // notched phones (Capacitor overlays the WebView under the status bar).
        height: "calc(3.5rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Image src="/brand/voltair-logo.png" alt="" width={22} height={33} className="h-[22px] w-auto" />
      <span className="text-sm font-semibold tracking-tight text-ink">Voltair</span>
      <span className="rounded border border-brand-persimmon/40 bg-brand-persimmon/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-persimmon">
        Admin
      </span>
      <div className="-mr-2 ml-auto">
        <SignOutButton compact />
      </div>
    </header>
  );
}
