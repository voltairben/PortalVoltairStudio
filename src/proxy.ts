/**
 * Next.js 16 Proxy (formerly Middleware).
 * Manages the __session cookie via next-firebase-auth-edge:
 *  - intercepts /api/login and /api/logout to mint / clear the cookie
 *  - verifies the session JWT with jose (stateless, no Admin SDK)
 *  - auto-refreshes the ID token before expiry
 *  - redirects unauthenticated traffic on protected routes to /login
 *
 * The matcher deliberately skips static assets (sw.js, manifest, icons, brand,
 * ~offline) and webhooks so the app installs and boots offline for logged-out
 * visitors — and so the login screen's own logo isn't auth-gated.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authMiddleware, redirectToLogin } from "next-firebase-auth-edge";
import { getAuthConfig, LOGIN_PATH, LOGOUT_PATH, PUBLIC_PATHS } from "@/lib/firebase/auth-config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
  // Throttle sign-in attempts per IP before the auth middleware verifies anything.
  if (request.method === "POST" && request.nextUrl.pathname === LOGIN_PATH) {
    const limit = rateLimit(`login:${clientIp(request.headers)}`, {
      limit: 10,
      windowMs: 5 * 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Wait a moment and try again." },
        { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
      );
    }
  }

  return authMiddleware(request, {
    loginPath: LOGIN_PATH,
    logoutPath: LOGOUT_PATH,
    // /api/refresh-token is handled by its own Route Handler (forced refresh
    // from a client Bearer token), not by the middleware's cookie-only path.
    ...getAuthConfig(),
    handleValidToken: async (_tokens, headers) => {
      return NextResponse.next({ request: { headers } });
    },
    handleInvalidToken: async () => {
      return redirectToLogin(request, { path: "/login", publicPaths: PUBLIC_PATHS });
    },
    handleError: async (error) => {
      console.error("[proxy] auth error", error);
      return redirectToLogin(request, { path: "/login", publicPaths: PUBLIC_PATHS });
    },
  });
}

export const config = {
  matcher: [
    "/api/login",
    "/api/logout",
    "/api/refresh-token",
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|serwist|icons|brand|~offline|api/webhooks).*)",
  ],
};
