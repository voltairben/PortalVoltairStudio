import type { Milestone } from "@/types";
import { cn } from "@/lib/utils";

export function milestoneStats(milestones: Milestone[]) {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "complete").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

/**
 * Milestone completion bar. Neutral by default; `tone="active"` (persimmon) is
 * for the one project on a screen that is currently waiting on the client.
 */
export function MilestoneProgress({
  milestones,
  size = "sm",
  tone = "neutral",
  className,
}: {
  milestones: Milestone[];
  size?: "sm" | "lg";
  tone?: "neutral" | "active";
  className?: string;
}) {
  const { total, done, pct } = milestoneStats(milestones);
  const persimmon = tone === "active";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-ink-muted", size === "lg" ? "text-sm" : "text-2xs")}>
          Milestones
        </span>
        <span
          className={cn(
            "tnum font-mono",
            persimmon ? "text-brand-persimmon" : "text-ink-subtle",
            size === "lg" ? "text-sm" : "text-2xs",
          )}
        >
          {done} / {total}
        </span>
      </div>
      <div
        className={cn(
          "mt-2 overflow-hidden rounded-full bg-surface-3",
          size === "lg" ? "h-1.5" : "h-1",
        )}
      >
        <div
          data-fill
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            persimmon ? "bg-brand-persimmon" : "bg-line-strong",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
