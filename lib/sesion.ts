"use server";

import { cookies } from "next/headers";

// ── HMAC helpers (Web Crypto — funciona en Node 18+ y Edge) ────────
// SESSION_SECRET debe definirse en .env.local y en las variables del servidor.
// Si no está definido, las cookies se firman con clave vacía (inseguro en producción).
const SECRET = process.env.SESSION_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  // No lanzamos excepción para no romper el servidor, pero el log queda en los registros.
  console.error("[sesion] SESSION_SECRET no está configurado. Las cookies NO están protegidas.");
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  const str = atob(padded);
  const buf   = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function getKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET || "fallback-insecure"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

// Devuelve "value.HMAC_BASE64URL"
async function signValue(value: string): Promise<string> {
  const key = await getKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return `${value}.${bufToB64url(sig)}`;
}

// Verifica la firma y devuelve el valor limpio, o null si es inválido/tamperado
async function verifyAndExtract(signed: string): Promise<string | null> {
  try {
    const i = signed.lastIndexOf(".");
    if (i === -1) return null;
    const value   = signed.slice(0, i);
    const sigBytes = b64urlToUint8(signed.slice(i + 1));
    const key = await getKey("verify");
    const ok  = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(value));
    return ok ? value : null;
  } catch {
    return null;
  }
}

// ── Configuración de cookies ────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
  maxAge:   60 * 60, // 1 hora
};

const ALLOWED_ROLES = ["super-admin", "admin", "analista"];

// ── API pública ─────────────────────────────────────────────────────

// Lee el UID verificando la firma HMAC — null si la cookie fue tamperada
export async function getSession(): Promise<string | null> {
  const raw = (await cookies()).get("token")?.value;
  if (!raw) return null;
  return verifyAndExtract(raw);
}

// Lee el rol verificando la firma HMAC — null si la cookie fue tamperada
export async function getSessionRol(): Promise<string | null> {
  const raw = (await cookies()).get("rol")?.value;
  if (!raw) return null;
  return verifyAndExtract(raw);
}

// Establece las cookies firmadas con HMAC
export async function setSession(uid: string, rol: string): Promise<void> {
  if (!uid || typeof uid !== "string" || uid.trim() === "") {
    throw new Error("uid inválido");
  }
  if (!rol || !ALLOWED_ROLES.includes(rol)) {
    throw new Error("rol inválido");
  }

  const signedToken = await signValue(uid.trim());
  const signedRol   = await signValue(rol);

  const store = await cookies();
  store.set("token", signedToken, COOKIE_OPTS);
  store.set("rol",   signedRol,   COOKIE_OPTS);
}

// Elimina las cookies de sesión
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete("token");
  store.delete("rol");
}
