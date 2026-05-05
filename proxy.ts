import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const rol   = request.cookies.get("rol")?.value;

  const isAuthPage    = request.nextUrl.pathname.startsWith("/login") ||
                        request.nextUrl.pathname.startsWith("/register");
  const isAdminOnly   = request.nextUrl.pathname.startsWith("/panel-admin/auditoria");

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/panel-admin", request.url));
  }

  // Bloquear auditoría si no es admin
  if (isAdminOnly && rol !== "admin") {
    return NextResponse.redirect(new URL("/panel-analista", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel-admin/:path*", "/panel-analista/:path*", "/login", "/register"],
};