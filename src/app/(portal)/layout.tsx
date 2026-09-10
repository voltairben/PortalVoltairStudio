import Image from "next/image";
import { BottomNav } from "@/components/portal/bottom-nav";
import { ConnectionBanner } from "@/components/portal/connection-banner";
import { Sidebar } from "@/components/portal/sidebar";
import { getClientCompany } from "@/lib/data/portal";
import { requireClient } from "@/lib/firebase/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const company = user.clientId ? await getClientCompany(user.clientId) : null;

  return (
    <div className="min-h-dvh">
      <Sidebar user={user} companyName={company?.name ?? null} />
      <BottomNav />
      <ConnectionBanner />

      <div className="lg:pl-[248px]">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-800 bg-brand-obsidian/90 px-4 backdrop-blur-md lg:hidden"
          style={{
            // 56px of bar, always below the status bar — not squeezed into it on
            // notched phones (Capacitor overlays the WebView under the status bar).
            height: "calc(3.5rem + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <Image
            src="/brand/voltair-logo.png"
            alt=""
            width={22}
            height={33}
            className="h-[22px] w-auto"
          />
          <span className="text-sm font-semibold tracking-tight text-ink">Voltair Studio</span>
        </header>

        <main className="mx-auto min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-full max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:min-h-dvh lg:px-10 lg:pb-16 lg:pt-11">
          {children}
        </main>
      </div>
    </div>
  );
}
