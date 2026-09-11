"use client";

import { CloudOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

/** Display a persistent notice while the browser is offline. */
export function ConnectionBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:bottom-6 lg:left-[248px]">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-zinc-700 bg-surface-2/95 px-3.5 py-2 text-xs font-medium text-ink-muted shadow-[0_8px_30px_-8px_rgba(0,0,0,0.7)] backdrop-blur-md"
      >
        <CloudOff className="size-3.5" />
        You&rsquo;re offline. Changes will sync automatically when reconnected.
      </div>
    </div>
  );
}
