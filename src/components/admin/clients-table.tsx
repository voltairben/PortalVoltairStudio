"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate, initialsOf } from "@/lib/format";
import type { ClientRow } from "@/lib/data/admin";
import type { ClientStatus } from "@/types";

const STATUS_TONE: Record<ClientStatus, BadgeTone> = {
  active: "positive",
  onboarding: "caution",
  archived: "neutral",
};

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) =>
      [c.name, c.primaryContactName, c.primaryContactEmail]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term)),
    );
  }, [clients, q]);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clients"
          className="h-9 w-full rounded-lg border border-zinc-800 bg-surface-1 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-subtle focus:border-brand-persimmon focus:outline-none focus:ring-2 focus:ring-brand-persimmon/25"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-surface-1 text-[11px] uppercase tracking-wide text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Primary contact</th>
              <th className="px-4 py-2.5 font-medium">Projects</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Onboarded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-subtle">
                  No clients match “{q}”.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.clientId} className="bg-surface-1/40 hover:bg-surface-1">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-zinc-800 bg-surface-2 text-[10px] font-semibold text-ink-muted">
                        {initialsOf(c.name)}
                      </span>
                      <span className="font-medium text-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{c.primaryContactName ?? "—"}</div>
                    <div className="text-[11px] text-ink-subtle">{c.primaryContactEmail ?? "—"}</div>
                  </td>
                  <td className="tnum px-4 py-3 font-mono text-ink-muted">{c.projectCount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </td>
                  <td className="tnum px-4 py-3 text-ink-subtle">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
