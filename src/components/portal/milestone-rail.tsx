import { Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/types";

export function MilestoneRail({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <p className="text-[13px] text-ink-subtle">
        Milestones will appear here once the project plan is confirmed.
      </p>
    );
  }

  return (
    <ol className="relative">
      {milestones.map((m, i) => {
        const complete = m.status === "complete";
        const active = m.status === "active";
        const last = i === milestones.length - 1;

        return (
          <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-3 top-7 -ml-px h-[calc(100%-1rem)] w-px",
                  complete ? "bg-brand-persimmon/35" : "bg-zinc-800",
                )}
              />
            )}

            <span
              aria-hidden
              className={cn(
                "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border",
                complete && "border-brand-persimmon bg-brand-persimmon text-brand-persimmon-fg",
                active && "pulse-persimmon border-brand-persimmon bg-brand-obsidian",
                !complete && !active && "border-zinc-700 bg-brand-obsidian",
              )}
            >
              {complete ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : active ? (
                <span className="size-2 rounded-full bg-brand-persimmon" />
              ) : (
                <span className="size-1.5 rounded-full bg-zinc-600" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[14px] font-medium",
                  complete ? "text-ink-subtle" : "text-ink",
                )}
              >
                {m.title}
              </p>
              <p className="tnum mt-0.5 text-[11px] text-ink-subtle">
                {complete
                  ? `Completed ${formatDate(m.completedAt)}`
                  : active
                    ? m.targetDate
                      ? `Target ${formatDate(m.targetDate)}`
                      : "In progress"
                    : m.targetDate
                      ? `Planned for ${formatDate(m.targetDate)}`
                      : "Upcoming"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
