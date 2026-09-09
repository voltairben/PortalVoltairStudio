import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification. Both providers sign the RAW request body — the
 * caller must pass the exact bytes read from `request.text()`, before any JSON
 * parse. Comparisons are constant-time.
 */

/** Vercel: HMAC-SHA1 of the raw body, hex, in the `x-vercel-signature` header. */
export function verifyVercelSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  return safeEqual(signature, expected);
}

/** GitHub: `sha256=<hex>` HMAC-SHA256 of the raw body, in `x-hub-signature-256`. */
export function verifyGithubSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return safeEqual(signature, expected);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
