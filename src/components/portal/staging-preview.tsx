import { ArrowUpRight, Globe } from "lucide-react";

export function StagingPreview({ url }: { url: string | null }) {
  if (!url) return null;

  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // keep the raw string
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-zinc-800 bg-surface-1 transition-[border-color,box-shadow] duration-200 hover:glow-persimmon"
    >
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3.5 py-2.5">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-zinc-700" />
          <span className="size-2 rounded-full bg-zinc-700" />
          <span className="size-2 rounded-full bg-zinc-700" />
        </span>
        <span className="tnum ml-1 truncate font-mono text-[11px] text-ink-muted">{host}</span>
        <ArrowUpRight className="ml-auto size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-brand-persimmon" />
      </div>
      <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_50%_25%,rgba(255,79,0,0.09),transparent_62%)]">
        <div className="text-center">
          <Globe className="mx-auto size-7 text-ink-subtle transition-colors group-hover:text-brand-persimmon" />
          <p className="mt-2.5 text-[13px] font-medium text-ink">Open the live staging preview</p>
          <p className="mt-1 text-[11px] text-ink-subtle">Latest build, in a new tab</p>
        </div>
      </div>
    </a>
  );
}
