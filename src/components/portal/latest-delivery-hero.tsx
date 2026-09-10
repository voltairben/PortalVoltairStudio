import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Deliverable } from "@/types";

function Cover({ d }: { d: Deliverable }) {
  return (
    <div className="brand-glow relative flex aspect-[20/9] w-full items-center justify-center bg-surface-2">
      {/* Flame sits behind — visible for non-image kinds and if the image fails. */}
      <Flame className="size-8 text-brand-persimmon/70" />
      {d.fileType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.fileUrl}
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
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface-1">
      <Cover d={d} />
      <div className="p-4 sm:p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          {pending ? "New from Voltair Studio" : "Latest delivery"}
        </p>
        <h2 className="mt-1.5 text-lg text-ink">{d.name}</h2>
        {pending ? (
          <Link
            href={href}
            className="mt-3.5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-persimmon px-4 text-[13px] font-semibold text-brand-persimmon-fg transition-opacity hover:opacity-90"
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
