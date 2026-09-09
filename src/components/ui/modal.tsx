"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-800 bg-surface-1 p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-1 flex size-11 items-center justify-center rounded-md text-ink-subtle transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
