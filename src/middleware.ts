import { NextResponse, type NextRequest } from "next/server";

// Simple admin protection via ADMIN_SECRET cookie/header
// In production, replace with Supabase Auth session check
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes require auth
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminToken =
      request.cookies.get("admin_token")?.value ??
      request.headers.get("x-admin-secret");

    if (adminToken !== process.env.ADMIN_SECRET) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Overlay and delivery pages are public — no auth needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Exclude static files and API routes from middleware
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
