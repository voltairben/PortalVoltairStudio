import { type NextRequest, NextResponse } from "next/server";
import { refreshNextResponseCookiesWithToken } from "next-firebase-auth-edge/next/cookies";
import { authConfig } from "@/lib/firebase/auth-config";

/**
 * Forces the __session cookie to be re-minted from a fresh client ID token.
 *
 * Needed right after an admin sets custom claims on a user (new client, role
 * change): the browser calls `auth.currentUser.getIdToken(true)` to pull the
 * new claims, POSTs that token here, and the server session picks them up
 * without a logout/login round-trip.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const header = request.headers.get("Authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 400 });
  }

  try {
    const response = NextResponse.json({ refreshed: true });
    return await refreshNextResponseCookiesWithToken(idToken, request, response, authConfig);
  } catch (error) {
    console.error("[refresh-token]", error);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
  }
}
