"use client";

import { SerwistProvider } from "@serwist/turbopack/react";

/**
 * Registers the Serwist service worker (served from /serwist/sw.js with
 * Service-Worker-Allowed: /). Disabled during `next dev` to keep HMR clean.
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
