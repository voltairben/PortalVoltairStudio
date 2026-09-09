import { type NextRequest, NextResponse } from "next/server";
import { refreshNextResponseCookiesWithToken } from "next-firebase-auth-edge/next/cookies";
import { getAuthConfig } from "@/lib/firebase/auth-config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Forces the __session cookie to be re-minted from a fresh client ID token.
 *
 * Needed right after an admin sets custom claims on a user (new client, role
 * change): the browser calls `auth.currentUser.getIdToken(true)` to pull the
 * new claims, POSTs that token here, and the server session picks them up
 * without a logout/login round-trip.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const limit = rateLimit(`refresh:${clientIp(request.headers)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many token refreshes." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const header = request.headers.get("Authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 400 });
  }

  try {
    const response = NextResponse.json({ refreshed: true });
    return await refreshNextResponseCookiesWithToken(idToken, request, response, getAuthConfig());
  } catch (error) {
    console.error("[refresh-token]", error);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
  }
}
