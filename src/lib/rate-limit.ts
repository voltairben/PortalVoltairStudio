/**
 * In-memory sliding-window rate limiter.
 *
 * Scoped to one serverless instance. Vercel Fluid Compute reuses instances, so
 * this reliably throttles a sustained burst from one IP; it is not a distributed
 * limiter and resets on a cold start.
 * ponytail: move the Map to Upstash Redis / Vercel KV for cross-instance
 * accuracy if auth abuse becomes a real problem.
 */
const buckets = new Map<string, number[]>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, hits] of buckets) {
      if (hits.length === 0 || hits[hits.length - 1]! < now - 600_000) buckets.delete(k);
    }
  }

  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfter = Math.ceil((hits[0]! + windowMs - now) / 1000);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(retryAfter, 1) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client IP from Vercel's proxy headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
