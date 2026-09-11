import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "positive" | "caution" | "critical" | "persimmon" | "persimmon-solid";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-zinc-700 bg-surface-2 text-ink-muted",
  positive: "border-positive/30 bg-positive/10 text-positive",
  caution: "border-caution/30 bg-caution/10 text-caution",
  critical: "border-critical/30 bg-critical/10 text-critical",
  persimmon: "border-brand-persimmon/40 bg-brand-persimmon/10 text-brand-persimmon",
  // Solid fill — reserved for the one thing on a screen that's actively
  // waiting on the client (e.g. their-turn project row). Not for general use.
  "persimmon-solid": "border-transparent bg-brand-persimmon text-brand-persimmon-fg",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
