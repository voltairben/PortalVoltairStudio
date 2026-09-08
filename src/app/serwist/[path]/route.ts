import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Serves the compiled service worker (and its sourcemap) as a Route Handler,
 * so Turbopack never has to bundle it. Reachable at /serwist/sw.js and,
 * via the rewrite in next.config.ts, at /sw.js.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    additionalPrecacheEntries: [{ url: "/~offline", revision: null }],
  });
