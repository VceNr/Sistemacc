import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── AES-GCM helpers (duplicados de lib/sesion.ts — Edge runtime no puede importar "use server") ──
const SECRET = process.env.SESSION_SECRET ?? "";

function b64urlToUint8(b64: string): Uint8Array {
  const padded = b64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  const str = atob(padded);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf;
}

async function getKey(): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SECRET || "fallback-insecure-key-do-not-use"),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

// Descifra un blob AES-GCM (formato: base64url(IV || ciphertext+tag))
// Devuelve el texto en claro, o null si el blob es inválido o fue manipulado
async function decryptValue(encrypted: string): Promise<string | null> {
  try {
    const combined = b64urlToUint8(encrypted);
    if (combined.length < 13) return null;
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const key = await getKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ── Middleware de protección de rutas ───────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawToken = request.cookies.get("token")?.value;
  const rawRol   = request.cookies.get("rol")?.value;

  // Descifrar ambas cookies antes de confiar en los valores
  const token = rawToken ? await decryptValue(rawToken) : null;
  const rol   = rawRol   ? await decryptValue(rawRol)   : null;

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

  // Rutas admin-only: requieren rol descifrado correctamente
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
