/**
 * Next.js 16 Proxy (formerly Middleware).
 * Manages the __session cookie via next-firebase-auth-edge:
 *  - intercepts /api/login and /api/logout to mint / clear the cookie
 *  - verifies the session JWT with jose (stateless, no Admin SDK)
 *  - auto-refreshes the ID token before expiry
 *  - redirects unauthenticated traffic on protected routes to /login
 *
 * The matcher deliberately skips PWA assets (sw.js, manifest, icons, ~offline)
 * and webhooks so the app installs and boots offline for logged-out visitors.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authMiddleware, redirectToLogin } from "next-firebase-auth-edge";
import { getAuthConfig, LOGIN_PATH, LOGOUT_PATH, PUBLIC_PATHS } from "@/lib/firebase/auth-config";

export async function proxy(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|serwist|icons|~offline|api/webhooks).*)",
  ],
};
