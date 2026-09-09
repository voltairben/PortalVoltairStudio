import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-64" />
      <div className="relative">
        <p className="tnum font-mono text-xs uppercase tracking-[0.3em] text-brand-persimmon">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">Page not found</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">
          That link is broken, or the item was moved — or you don&rsquo;t have access to it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-5 text-sm font-medium text-ink transition-colors hover:border-brand-persimmon hover:text-brand-persimmon"
        >
          Back to the portal
        </Link>
      </div>
    </main>
  );
}
