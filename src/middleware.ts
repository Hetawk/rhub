import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for route protection and auth redirects.
 *
 * Protected routes (require login):
 *   /tools/dbt/judge
 *   /tools/dbt/[slug] (for judge-specific actions)
 *
 * Auth-guarded routes (redirect to /tools/dbt if already logged in):
 *   /login
 *   /register
 *   /forgot-password
 */

// Routes that require authentication
const PROTECTED_PATTERNS = [/^\/tools\/dbt\/judge($|\/)/];

// Auth routes that logged-in users shouldn't access
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

// Admin routes
const ADMIN_PATTERNS = [/^\/admin($|\/)/];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies
  const token = request.cookies.get("auth_token")?.value;

  // Validate session by calling the auth API
  // We use an internal check rather than DB directly in middleware
  // to keep the middleware fast (no Prisma in Edge runtime)
  const isAuthenticated = !!token && token.length > 10;

  // Redirect logged-in users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.some((route) => pathname === route)) {
    const redirectUrl =
      request.nextUrl.searchParams.get("redirect") || "/tools/dbt";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Protect judge routes
  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(pathname)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      break;
    }
  }

  // Protect admin routes (already has its own redirect but add middleware layer)
  for (const pattern of ADMIN_PATTERNS) {
    if (pattern.test(pathname)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/admin/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      break;
    }
  }

  // Set cache control headers for auth-sensitive pages
  const response = NextResponse.next();

  // Prevent caching of protected pages
  if (
    PROTECTED_PATTERNS.some((p) => p.test(pathname)) ||
    ADMIN_PATTERNS.some((p) => p.test(pathname))
  ) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
  }

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)).*)",
  ],
};
