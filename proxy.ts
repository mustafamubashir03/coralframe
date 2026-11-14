import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Regular expressions for path inspection and access control
 */
// Static assets, Next.js internals, and public media files
const STATIC_ASSET_REGEX =
    /^\/(?:_next(?:\/.*)?|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|map))$/i;

// Authentication routes (e.g., /sign-in, /sign-up)
const AUTH_ROUTE_REGEX = /^\/(?:sign-in|sign-up|forgot-password|reset-password)(?:\/.*)?$/i;

// Publicly accessible API or documentation routes
const PUBLIC_API_ROUTE_REGEX = /^\/api\/auth(?:\/.*)?$/i;

// Protected routes requiring an active session
// Matches root ("/"), dashboard, settings, profile, and non-auth API routes
const PROTECTED_ROUTE_REGEX = /^\/(?:$|dashboard|settings|profile|admin|api\/(?!auth))(?:$|\/.*)/i;

/**
 * Next.js 16 Proxy layer for session validation and route protection
 */
export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // 1. Bypass static assets and public Next.js files
    if (STATIC_ASSET_REGEX.test(pathname)) {
        return NextResponse.next();
    }

    // 2. Extract and inspect user session token
    const sessionCookie =
        getSessionCookie(request) ||
        request.cookies.get("better-auth.session_token")?.value ||
        request.cookies.get("__Secure-better-auth.session_token")?.value;

    const hasValidSession = Boolean(sessionCookie && sessionCookie.trim().length > 0);

    // 3. Prevent authenticated users from accessing auth pages (/sign-in)
    if (AUTH_ROUTE_REGEX.test(pathname)) {
        if (hasValidSession) {
            const callbackURL = request.nextUrl.searchParams.get("callbackURL") || "/";
            const redirectUrl = new URL(callbackURL, request.url);
            return NextResponse.redirect(redirectUrl);
        }
        // Proceed to auth page if unauthenticated
        return applySecurityHeaders(NextResponse.next());
    }

    // 4. Always permit Better Auth API routes
    if (PUBLIC_API_ROUTE_REGEX.test(pathname)) {
        return applySecurityHeaders(NextResponse.next());
    }

    // 5. Enforce authentication on protected routes
    if (PROTECTED_ROUTE_REGEX.test(pathname)) {
        if (!hasValidSession) {
            const signInUrl = new URL("/sign-in", request.url);
            const targetDestination = `${pathname}${search}`;
            if (targetDestination !== "/") {
                signInUrl.searchParams.set("callbackURL", targetDestination);
            }
            return NextResponse.redirect(signInUrl);
        }
    }

    // 6. Proceed with applied security headers
    return applySecurityHeaders(NextResponse.next());
}

/**
 * Helper to add standard enterprise security headers
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-DNS-Prefetch-Control", "on");
    return response;
}

// Support both named and default export for Next.js 16 Proxy conventions
export default proxy;

/**
 * Next.js proxy matcher configuration
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, images, and fonts
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
    ],
};
