import type { ComponentType } from "react";

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
  return (
    <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-muted">{label}</span>
        <Icon className={accent ? "size-4 text-brand-persimmon" : "size-4 text-ink-subtle"} />
      </div>
      <p className="tnum mt-3 font-mono text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
