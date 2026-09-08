import type { Metadata } from "next";
import { requireAdmin } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Studio" };

export default async function AdminHomePage() {
  const user = await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Studio</h1>
        <p className="mt-1 text-sm text-ink-muted">Signed in as {user.email}.</p>
      </div>
      <div className="rounded-xl border border-line bg-surface-1 p-5">
        <p className="text-sm text-ink-muted">
          Client accounts, projects, deliverable uploads, and the Developer Pulse
          panel are built in Phase 2 onward.
        </p>
      </div>
    </div>
  );
}
