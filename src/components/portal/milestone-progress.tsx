import type { Milestone } from "@/types";
import { cn } from "@/lib/utils";

export function milestoneStats(milestones: Milestone[]) {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "complete").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

/**
 * Thin persimmon completion bar. `size="lg"` is the dashboard hero treatment;
 * `size="sm"` sits inside project cards.
 */
export function MilestoneProgress({
  milestones,
  size = "sm",
  className,
}: {
  milestones: Milestone[];
  size?: "sm" | "lg";
  className?: string;
}) {
  const { total, done, pct } = milestoneStats(milestones);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            "text-ink-muted",
            size === "lg" ? "text-sm" : "text-[11px]",
          )}
        >
          Milestones
        </span>
        <span
          className={cn(
            "tnum font-mono text-brand-persimmon",
            size === "lg" ? "text-sm" : "text-[11px]",
          )}
        >
          {done} / {total}
        </span>
      </div>
      <div
        className={cn(
          "mt-2 overflow-hidden rounded-full bg-surface-3",
          size === "lg" ? "h-2" : "h-1",
        )}
      >
        <div
          className="h-full rounded-full bg-brand-persimmon transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
