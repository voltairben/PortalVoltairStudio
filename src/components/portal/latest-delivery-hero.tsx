import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deliverable } from "@/types";

function Cover({ d, pending }: { d: Deliverable; pending: boolean }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[20/9] w-full items-center justify-center bg-surface-2",
        pending
          ? "bg-[radial-gradient(120%_100%_at_50%_0%,rgb(255_79_0/0.38),rgb(255_79_0/0.05)_55%,transparent_80%)]"
          : "brand-glow",
      )}
    >
      {/* Flame sits behind — visible when there's no cover yet, or if it fails to load. */}
      <Flame className={cn("size-8", pending ? "text-brand-persimmon" : "text-brand-persimmon/70")} />
      {d.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.coverUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
}

export function LatestDeliveryHero({
  pending,
  lastDecided,
}: {
  pending: Deliverable | null;
  lastDecided: Deliverable | null;
}) {
  const d = pending ?? lastDecided;
  if (!d) return null;
  const href = `/projects/${d.projectId}/deliverables/${d.deliverableId}`;

  return (
    <div className="hero-rise-in overflow-hidden rounded-xl border border-line-strong bg-surface-1">
      <Cover d={d} pending={!!pending} />
      <div className="p-4 sm:p-6">
        {pending ? (
          <span className="inline-flex items-center rounded-full bg-brand-persimmon px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.15em] text-brand-persimmon-fg">
            New from Voltair Studio
          </span>
        ) : (
          <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
            Latest delivery
          </p>
        )}
        <h2 className="mt-2 text-2xl leading-tight text-ink sm:text-3xl">{d.name}</h2>
        {pending ? (
          <Link
            href={href}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-persimmon px-5 text-sm font-semibold text-brand-persimmon-fg shadow-[0_10px_34px_-12px_rgb(255_79_0/0.65)] transition-transform hover:scale-[1.02] hover:opacity-95"
          >
            Open review
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[13px] text-ink-muted">
              {d.status === "approved" ? "Approved" : "Changes requested"}
              {d.decidedAt ? ` ${formatDate(d.decidedAt)}` : ""}
            </span>
            <Link href={href} className="text-[13px] text-ink-subtle transition-colors hover:text-ink">
              View
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
