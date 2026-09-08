import type { Metadata } from "next";
import { requireClient } from "@/lib/firebase/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireClient();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Welcome{user.name ? `, ${user.name}` : ""}.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface-1 p-5">
        <p className="text-sm text-ink-muted">
          Projects, deliverables, and approvals land here in Phase 3–5. You&rsquo;re
          authenticated as{" "}
          <span className="font-mono text-brand-persimmon">{user.email}</span>{" "}
          (client&nbsp;<span className="font-mono">{user.clientId}</span>).
        </p>
      </div>
    </div>
  );
}
