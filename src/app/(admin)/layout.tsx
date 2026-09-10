import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/firebase/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // RBAC gate: requireAdmin() redirects a client to /dashboard and an
  // unprovisioned user to /login before any admin UI or data is touched.
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <AdminSidebar user={user} />
      <AdminMobileNav />
      <AdminBottomNav />
      <div className="lg:pl-[248px]">
        <main className="mx-auto min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:min-h-dvh lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
