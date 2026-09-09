"use client";

import { Archive, ArchiveRestore, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteClientCompany, setClientArchived } from "@/lib/actions/admin";
import { formatDate, initialsOf } from "@/lib/format";
import type { ClientRow } from "@/lib/data/admin";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/types";

const STATUS_TONE: Record<ClientStatus, BadgeTone> = {
  active: "positive",
  onboarding: "caution",
  archived: "neutral",
};

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const matched = !term
      ? clients
      : clients.filter((c) =>
          [c.name, c.primaryContactName, c.primaryContactEmail]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(term)),
        );
    // Active clients first, archived sink to the bottom (sort is stable).
    return [...matched].sort(
      (a, b) => (a.status === "archived" ? 1 : 0) - (b.status === "archived" ? 1 : 0),
    );
  }, [clients, q]);

  function toggleArchive(c: ClientRow) {
    setRowError(null);
    startTransition(async () => {
      const res = await setClientArchived(c.clientId, c.status !== "archived");
      if (res.ok) router.refresh();
      else setRowError(res.error);
    });
  }

  function closeDelete() {
    setDeleteTarget(null);
    setConfirmText("");
    setDeleteError(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteClientCompany(deleteTarget.clientId, confirmText);
      if (res.ok) {
        closeDelete();
        router.refresh();
      } else {
        setDeleteError(res.error);
      }
    });
  }

  return (
    <>
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

        {rowError && (
          <p className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-[12px] text-critical">
            {rowError}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[780px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-surface-1 text-[11px] uppercase tracking-wide text-ink-subtle">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Primary contact</th>
                <th className="px-4 py-2.5 font-medium">Projects</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Onboarded</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-subtle">
                    No clients match “{q}”.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.clientId}
                    className={cn(
                      "bg-surface-1/40 hover:bg-surface-1",
                      c.status === "archived" && "opacity-55",
                    )}
                  >
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
                      <div className="text-[11px] text-ink-subtle">
                        {c.primaryContactEmail ?? "—"}
                      </div>
                    </td>
                    <td className="tnum px-4 py-3 font-mono text-ink-muted">{c.projectCount}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="tnum px-4 py-3 text-ink-subtle">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleArchive(c)}
                          disabled={pending}
                          title={c.status === "archived" ? "Restore to active" : "Archive"}
                          aria-label={c.status === "archived" ? "Restore client" : "Archive client"}
                          className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                        >
                          {c.status === "archived" ? (
                            <ArchiveRestore className="size-4" />
                          ) : (
                            <Archive className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          disabled={pending}
                          title="Delete permanently"
                          aria-label="Delete client"
                          className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-critical/10 hover:text-critical disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={deleteTarget !== null} onClose={closeDelete} title="Delete client">
        {deleteTarget && (
          <div className="space-y-4 text-[13px]">
            <p className="leading-6 text-ink-muted">
              This permanently removes{" "}
              <strong className="text-ink">{deleteTarget.name}</strong>’s login and every project,
              deliverable, comment and activity record for them. It cannot be undone.
            </p>
            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase tracking-wide text-ink-subtle">
                Type <span className="font-medium text-ink">{deleteTarget.name}</span> to confirm
              </span>
              <input
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-800 bg-surface-1 px-3 text-[13px] text-ink focus:border-critical focus:outline-none focus:ring-2 focus:ring-critical/25"
              />
            </label>
            {deleteError && <p className="text-[12px] text-critical">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDelete} disabled={pending}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending || confirmText.trim() !== deleteTarget.name}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-critical px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete client"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
