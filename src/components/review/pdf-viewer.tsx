import { ExternalLink } from "lucide-react";

export function PdfViewer({ src, name }: { src: string; name: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2.5">
        <span className="truncate text-[12px] text-ink-muted">{name}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-subtle transition-colors hover:text-brand-persimmon"
        >
          <ExternalLink className="size-3.5" />
          Open
        </a>
      </div>
      <iframe
        src={`${src}#view=FitH`}
        title={name}
        className="h-[70vh] w-full bg-white"
      />
    </div>
  );
}
