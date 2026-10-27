import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/refund-expectations",
  "/bankruptcy-myths",
  "/case-review",
  "/dashboard", // Temporarily public for existing flow
  "/auth/signin",
  "/auth/join",
  "/auth/error",
  "/api/auth",
  "/api/leads",
  "/api/bookings",
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Next.js assets, image optimizer, and public files must not require a session.
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-based access control
  const { role } = session.user;

  // Webmaster routes
  if (pathname.startsWith("/webmaster")) {
    if (role !== "webmaster") {
      return NextResponse.redirect(new URL("/auth/error", request.url));
    }
  }

  // Operator routes
  if (pathname.startsWith("/operator")) {
    if (role !== "operator" && role !== "webmaster") {
      return NextResponse.redirect(new URL("/auth/error", request.url));
    }
  }

  // Client routes
  if (pathname.startsWith("/client")) {
    if (role !== "client" && role !== "webmaster") {
      return NextResponse.redirect(new URL("/auth/error", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
