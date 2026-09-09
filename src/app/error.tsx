"use client";

import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-64" />
      <div className="relative">
        <p className="tnum font-mono text-xs uppercase tracking-[0.3em] text-critical">Error</p>
        <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Something broke</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
          The portal hit an unexpected error. Try again — if it keeps happening, let Voltair Studio
          know{error.digest ? ` (ref ${error.digest})` : ""}.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-5 text-sm font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
