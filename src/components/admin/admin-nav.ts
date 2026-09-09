import {
  FolderKanban,
  Inbox,
  LayoutDashboard,
  UploadCloud,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

export interface AdminNavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", Icon: Users },
  { href: "/admin/projects", label: "Projects", Icon: FolderKanban },
  { href: "/admin/deliverables", label: "Deliverables", Icon: UploadCloud },
  { href: "/admin/inbox", label: "Studio Inbox", Icon: Inbox },
];

export function isAdminActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
