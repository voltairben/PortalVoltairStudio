import { TopBar } from "@/components/top-bar";
import { requireClient } from "@/lib/firebase/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  return (
    <div className="min-h-dvh">
      <TopBar user={user} area="portal" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
