/** Summarize client actions that are currently waiting for attention. */
export function AttentionPanel({
  pendingCount,
  recent,
}: {
  pendingCount: number;
  recent: { label: string; when: string }[];
}) {
  return (
    <div className="rounded-xl border border-line-strong bg-surface-1 p-4 sm:p-5">
      <h3 className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
        Needs your attention
      </h3>
      <p className="mt-2 text-sm font-medium text-ink">
        {pendingCount === 0 ? (
          "You're all caught up"
        ) : (
          <>
            <span className="text-xl font-display text-brand-persimmon">{pendingCount}</span>{" "}
            deliverable{pendingCount === 1 ? "" : "s"} to review
          </>
        )}
      </p>
      {recent.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
          {recent.slice(0, 4).map((r, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-3 text-xs text-ink-muted"
            >
              <span className="truncate">{r.label}</span>
              <span className="tnum shrink-0 text-ink-subtle">{r.when}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
