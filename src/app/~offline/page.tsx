import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-64" />
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-persimmon">
          Voltair Studio
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">
          You&rsquo;re offline
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
          The portal can&rsquo;t reach the network right now. Anything you&rsquo;ve already
          opened stays available — reconnect to load the rest.
        </p>
        <a
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-5 text-sm font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
