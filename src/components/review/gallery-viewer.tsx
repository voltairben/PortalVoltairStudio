"use client";

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DeliverableAsset } from "@/types";

export function GalleryViewer({ assets, name }: { assets: DeliverableAsset[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = assets[index];
  const canPrev = index > 0;
  const canNext = index < assets.length - 1;

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && canPrev) setIndex((i) => i - 1);
        if (e.key === "ArrowRight" && canNext) setIndex((i) => i + 1);
      }}
      className="outline-none"
    >
      <div className="relative min-h-[60vh] overflow-hidden rounded-xl border border-zinc-800 bg-surface-1">
        {current.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.label ?? `${name}, page ${index + 1}`}
            decoding="async"
            className="mx-auto max-h-[68vh] w-auto object-contain"
          />
        ) : (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[60vh] items-center justify-center gap-2 text-[13px] text-ink-muted hover:text-ink"
          >
            <Download className="size-4" />
            Open {current.label ?? name}
          </a>
        )}

        {canPrev && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-black/60 text-ink backdrop-blur transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        {canNext && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-black/60 text-ink backdrop-blur transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
        <span className="tnum absolute bottom-3 right-3 rounded-md border border-zinc-700 bg-black/60 px-2 py-1 text-[11px] text-ink-muted backdrop-blur">
          {index + 1} / {assets.length}
        </span>
      </div>

      {assets.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
          {assets.map((a, i) => (
            <button
              key={a.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${a.label ?? `page ${i + 1}`}`}
              aria-current={i === index}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-md border object-cover transition-opacity",
                i === index ? "border-brand-persimmon" : "border-zinc-800 opacity-60 hover:opacity-100",
              )}
            >
              {a.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-surface-2 text-[10px] text-ink-subtle">
                  file
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
