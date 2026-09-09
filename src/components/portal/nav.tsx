import { FolderKanban, LayoutDashboard, UserRound } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Extra path prefixes that should also mark this item active. */
  match?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/projects", label: "Projects", Icon: FolderKanban, match: ["/projects"] },
  { href: "/account", label: "Account", Icon: UserRound },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return (item.match ?? []).some((prefix) => pathname.startsWith(`${prefix}/`) || pathname === prefix);
}
