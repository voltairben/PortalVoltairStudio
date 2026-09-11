import { ArrowUpRight, Globe } from "lucide-react";

/**
 * Website-kind review treatment: the studio's screenshot, a persimmon
 * "Open the live site" action, and the URL shown small underneath — no
 * gallery, no viewer chrome, per spec §4 "Website kind".
 */
export function WebsitePreview({
  coverUrl,
  siteUrl,
  name,
}: {
  coverUrl: string | null;
  siteUrl: string | null;
  name: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      <div className="relative flex min-h-[60vh] w-full items-center justify-center bg-surface-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${name} screenshot`}
            decoding="async"
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <Globe className="size-8 text-brand-persimmon/60" />
            <p className="text-[13px] text-ink-subtle">
              No screenshot yet — the studio will add one when the build is delivered.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="truncate text-[12px] text-ink-subtle">{siteUrl ?? "No live URL set yet."}</span>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand-persimmon px-4 text-[13px] font-semibold text-brand-persimmon-fg transition-opacity hover:opacity-90"
          >
            Open the live site
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
