import type { AdminRow } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

/** Full-width divided rows, same visual pattern as ActivityStream/AdminProjectList. */
export function AdminTeamList({ admins, currentUid }: { admins: AdminRow[]; currentUid: string }) {
  return (
    <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      {admins.map((a) => (
        <li key={a.uid} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">
              {a.displayName || a.email || "Unnamed admin"}
              {a.uid === currentUid && <span className="ml-1.5 text-ink-subtle">(you)</span>}
            </p>
            {a.displayName && a.email && (
              <p className="truncate text-[11px] text-ink-subtle">{a.email}</p>
            )}
          </div>
          <span className="tnum shrink-0 text-[11px] text-ink-subtle">
            Joined {formatDate(a.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
