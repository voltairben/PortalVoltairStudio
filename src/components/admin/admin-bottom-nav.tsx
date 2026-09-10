"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isAdminActive } from "@/components/admin/admin-nav";
import { cn } from "@/lib/utils";

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="admin-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-brand-obsidian/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {ADMIN_NAV.map((item) => {
          const active = isAdminActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-brand-persimmon" : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-brand-persimmon"
                  />
                )}
                <item.Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {item.short ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
