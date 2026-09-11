import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * `accent` marks the one metric that means "this needs the studio's attention"
 * (pending client reviews). It only goes bold once there's actually something
 * to act on — an accent metric sitting at 0 is good news, not urgent.
 */
export function MetricCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  const bold = accent && value > 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-colors",
        bold ? "border-brand-persimmon/40 bg-brand-persimmon/[0.06]" : "border-zinc-800 bg-surface-1",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-[12px]", bold ? "text-brand-persimmon" : "text-ink-muted")}>
          {label}
        </span>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full",
            bold ? "bg-brand-persimmon text-brand-persimmon-fg" : "text-ink-subtle",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p
        className={cn(
          "tnum mt-3 font-mono text-3xl font-semibold",
          bold ? "text-brand-persimmon" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
