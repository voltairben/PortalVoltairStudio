import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

/**
 * Content Security Policy — tuned for Firebase Auth / Firestore / Storage, the
 * Serwist service worker, and the Vercel toolbar. `script-src`/`style-src` keep
 * `'unsafe-inline'` (Next.js injects inline bootstrap scripts + Tailwind styles
 * with no nonce pipeline); the high-value directives are locked hard:
 * `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`.
 */
// `next dev` needs eval (React Refresh) + localhost (Firebase emulators, HMR
// socket); `next build` runs with NODE_ENV=production and gets the strict policy.
const isDev = process.env.NODE_ENV !== "production";
const devScript = isDev ? " 'unsafe-eval'" : "";
// The Storage emulator serves over plain http on 127.0.0.1:9199 — deliverable
// previews and avatars uploaded in local dev need img/media-src to allow it too.
const devLocal = isDev ? " http://127.0.0.1:* http://localhost:*" : "";
const devConnect = isDev ? `${devLocal} ws://127.0.0.1:* ws://localhost:*` : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devScript} https://apis.google.com https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${devLocal}`,
  `media-src 'self' blob: https:${devLocal}`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebasestorage.app wss://*.firestore.googleapis.com https://apis.google.com https://vercel.live https://*.ingest.vercel.com${devConnect}`,
  "frame-src 'self' https://*.firebaseapp.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://storage.googleapis.com https://accounts.google.com https://vercel.live",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), " +
      "magnetometer=(), gyroscope=(), accelerometer=(), fullscreen=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  // Tree-shake icon imports so only the glyphs actually used ship.
  experimental: { optimizePackageImports: ["lucide-react"] },
  async rewrites() {
    // Conventional /sw.js path -> Serwist's route-handler-served worker.
    return [{ source: "/sw.js", destination: "/serwist/sw.js" }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSerwist(nextConfig);
