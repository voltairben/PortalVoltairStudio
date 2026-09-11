import { Flame } from "lucide-react";
import Link from "next/link";
import { DeliverableStatusBadge } from "@/components/portal/deliverable-status";
import type { DeliverableRow } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";

/**
 * Studio-wide "see the real work" moment for the overview — same principle
 * as the client dashboard's LatestDeliveryHero (a real cover image, not a
 * metric), across every client/project instead of just one. Informational,
 * not a bold-persimmon moment: there's no approve/reject action for admin to
 * take here, so it stays quiet — the "Pending client reviews" metric card is
 * this page's one bold signal.
 */
export function AdminLatestDeliveryHero({ d }: { d: DeliverableRow }) {
  const href = `/admin/projects/${d.projectId}/deliverables/${d.deliverableId}`;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-zinc-800 bg-surface-1 transition-colors hover:border-brand-persimmon/40"
    >
      <div className="relative flex aspect-[20/9] w-full items-center justify-center bg-surface-2">
        <Flame className="size-8 text-brand-persimmon/70" />
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
      <div className="p-4 sm:p-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          Latest delivery
        </p>
        <h2 className="mt-2 text-2xl leading-tight text-ink transition-colors sm:text-3xl group-hover:text-brand-persimmon">
          {d.name}
        </h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <DeliverableStatusBadge status={d.status} />
          <span className="text-[13px] text-ink-subtle">
            {d.clientName} · {d.projectName} · {formatDate(d.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
