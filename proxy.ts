import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── HMAC helpers (duplicados de lib/sesion.ts — Edge runtime no puede importar "use server") ──
const SECRET = process.env.SESSION_SECRET ?? "";

function b64urlToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  const str   = atob(padded);
  const buf   = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

// Verifica la firma HMAC-SHA256 y devuelve el valor limpio, o null si inválido/tamperado
async function verifyAndExtract(signed: string): Promise<string | null> {
  try {
    const i = signed.lastIndexOf(".");
    if (i === -1) return null;
    const value    = signed.slice(0, i);
    const sigBytes = b64urlToUint8(signed.slice(i + 1));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET || "fallback-insecure"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(value));
    return ok ? value : null;
  } catch {
    return null;
  }
}

// ── Middleware de protección de rutas ───────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawToken = request.cookies.get("token")?.value;
  const rawRol   = request.cookies.get("rol")?.value;

  // Verificar ambas firmas antes de confiar en los valores
  const token = rawToken ? await verifyAndExtract(rawToken) : null;
  const rol   = rawRol   ? await verifyAndExtract(rawRol)   : null;

  const isAuthPage  = pathname === "/login" || pathname === "/";
  const isAdminOnly =
    pathname.startsWith("/panel-admin/auditoria") ||
    pathname.startsWith("/panel-admin/usuarios")  ||
    pathname.startsWith("/panel-admin/register");

  // Sin sesión válida → login
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión válida en página de auth → panel principal
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/panel-admin", request.url));
  }

  // Rutas admin-only: requieren rol verificado criptográficamente
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
