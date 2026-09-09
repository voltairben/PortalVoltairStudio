"use client";

import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const CHECKER =
  "bg-[conic-gradient(from_90deg,#141417_0_25%,#0e0e11_0_50%,#141417_0_75%,#0e0e11_0)] bg-[length:20px_20px]";

export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block w-full overflow-hidden rounded-xl border border-zinc-800",
          CHECKER,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="mx-auto max-h-[68vh] w-auto object-contain" />
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-zinc-700 bg-black/60 px-2 py-1 text-[11px] text-ink-muted opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <Maximize2 className="size-3" />
          Zoom
        </span>
      </button>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const clampZoom = useCallback((z: number) => Math.min(6, Math.max(1, Number(z.toFixed(2)))), []);

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={alt}
      className="fixed inset-0 z-[60] flex flex-col bg-black/92 backdrop-blur-sm"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div className="flex items-center justify-end gap-1 p-3">
        <ToolButton label="Zoom out" onClick={() => setZoom((z) => clampZoom(z - 0.4))}>
          <Minus className="size-4" />
        </ToolButton>
        <span className="tnum mx-1 min-w-12 text-center font-mono text-[12px] text-ink-muted">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton label="Zoom in" onClick={() => setZoom((z) => clampZoom(z + 0.4))}>
          <Plus className="size-4" />
        </ToolButton>
        <ToolButton label="Reset" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
          <span className="text-[11px]">1:1</span>
        </ToolButton>
        <ToolButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </ToolButton>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        onWheel={(e) => setZoom((z) => clampZoom(z + (e.deltaY < 0 ? 0.25 : -0.25)))}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={cn("max-h-full max-w-full object-contain transition-transform", zoom > 1 ? "cursor-grab" : "cursor-zoom-in")}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        />
      </div>
    </div>,
    document.body,
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 min-w-8 place-items-center rounded-md border border-zinc-800 bg-surface-1 px-2 text-ink-muted transition-colors hover:border-brand-persimmon hover:text-ink"
    >
      {children}
    </button>
  );
}
