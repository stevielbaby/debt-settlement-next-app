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
  "/auth/error",
  "/api/leads",
  "/api/bookings",
];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-based access control
  // @ts-ignore - Extended session properties from auth.d.ts
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
