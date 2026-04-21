import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/delete-account",
  "/forgot-password",
  "/manifest.webmanifest",
  "/privacy",
  "/reset-password",
  "/sign-in",
  "/sign-up",
  "/terms"
]);
const PUBLIC_PAGE_PREFIXES = ["/invite/"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/demo/seed", "/api/health", "/api/test/reset-demo"];

function isPublicPage(pathname: string) {
  return PUBLIC_PAGE_PATHS.has(pathname) || PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://services.arcgisonline.com https://api.dicebear.com https://picsum.photos https://fastly.picsum.photos",
    "media-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.maptiler.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://nominatim.openstreetmap.org https://services.arcgisonline.com https://*.supabase.co https://api.dicebear.com https://picsum.photos https://fastly.picsum.photos https://interactive-examples.mdn.mozilla.net",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    // Skip upgrade-insecure-requests in dev mode so local Capacitor/simulator
    // loads on http://127.0.0.1 are not upgraded to https:// (which the local
    // Next dev server does not serve).
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"])
  ].join("; ");
}

export default async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const requiresAuth = isApiRoute ? !isPublicApi(pathname) : !isPublicPage(pathname);
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production"
  });
  const userId =
    typeof token?.id === "string" ? token.id : typeof token?.sub === "string" ? token.sub : null;

  if (requiresAuth && !userId) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        { status: 401 }
      );
    }

    const signInUrl = new URL("/sign-in", nextUrl);
    const callbackUrl = `${pathname}${nextUrl.search}`;
    signInUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  const nonce = btoa(crypto.randomUUID()).replace(/=+$/g, "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production"));
  response.headers.set("x-csp-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:css|gif|ico|jpeg|jpg|js|map|png|svg|txt|webp|xml)$).*)"
  ]
};
