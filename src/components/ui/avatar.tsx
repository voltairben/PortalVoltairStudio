import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: { border: "border-zinc-800", bg: "bg-surface-2", text: "text-ink-muted" },
  persimmon: {
    border: "border-brand-persimmon/40",
    bg: "bg-brand-persimmon/10",
    text: "text-brand-persimmon",
  },
} as const;

/**
 * A profile picture when one exists, otherwise the initials circle.
 * `tone` only affects the initials fallback's palette (e.g. flagging the
 * studio's own comments) — a real photo always renders as-is.
 */
export function Avatar({
  src,
  name,
  tone = "neutral",
  className,
}: {
  src?: string | null;
  name: string | null | undefined;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const t = TONES[tone];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn("shrink-0 rounded-full border object-cover", t.border, className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-semibold",
        t.border,
        t.bg,
        t.text,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
