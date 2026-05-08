import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const rol   = request.cookies.get("rol")?.value;

  const isAuthPage  = pathname === "/login" || pathname === "/";
  const isAdminOnly =
    pathname.startsWith("/panel-admin/auditoria") ||
    pathname.startsWith("/panel-admin/usuarios") ||
    pathname.startsWith("/panel-admin/register");

  // Sin sesión → login
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión en página de auth → panel principal
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/panel-admin", request.url));
  }

  // Rutas admin-only: accesibles para admin y super-admin
  if (isAdminOnly && rol !== "admin" && rol !== "super-admin") {
    return NextResponse.redirect(new URL("/panel-admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/panel-admin",
    "/panel-admin/:path*",
  ],
};
