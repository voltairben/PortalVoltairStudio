"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV, isAdminActive } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-[52px] items-center gap-2.5 border-b border-zinc-800 bg-brand-obsidian/90 px-4 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="-ml-1 flex size-11 items-center justify-center rounded-md text-ink-muted hover:text-ink"
        >
          <Menu className="size-5" />
        </button>
        <Image src="/brand/voltair-logo.png" alt="" width={16} height={24} className="h-5 w-auto" />
        <span className="text-[13px] font-semibold tracking-tight text-ink">Voltair</span>
        <span className="rounded border border-brand-persimmon/40 bg-brand-persimmon/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-brand-persimmon">
          Admin
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-zinc-800 bg-brand-obsidian">
            <div className="flex h-[52px] items-center justify-between border-b border-zinc-800 px-4">
              <span className="text-[13px] font-semibold text-ink">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="-mr-1.5 flex size-11 items-center justify-center rounded-md text-ink-muted hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-3">
              {ADMIN_NAV.map((item) => {
                const active = isAdminActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active ? "bg-surface-1 text-brand-persimmon" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <item.Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-zinc-800 p-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
