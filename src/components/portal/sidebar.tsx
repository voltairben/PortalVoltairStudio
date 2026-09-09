"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserBlock } from "@/components/portal/user-block";
import { NAV_ITEMS, isActive } from "@/components/portal/nav";
import type { SessionUser } from "@/lib/firebase/session";
import { cn } from "@/lib/utils";

export function Sidebar({
  user,
  companyName,
}: {
  user: SessionUser;
  companyName: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside
      data-testid="sidebar"
      className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-zinc-800 bg-brand-obsidian lg:flex"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)" }}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-5">
        <Image src="/brand/voltair-logo.png" alt="" width={22} height={33} className="h-7 w-auto" />
        <span className="text-[13px] font-semibold tracking-tight text-ink">Voltair Studio</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-surface-1 text-ink"
                  : "text-ink-muted hover:bg-surface-1/60 hover:text-ink",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-brand-persimmon"
                />
              )}
              <item.Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <UserBlock user={user} companyName={companyName} />
    </aside>
  );
}
