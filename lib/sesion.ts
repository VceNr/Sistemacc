"use server";

import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET ?? "";

if (!SECRET && process.env.NODE_ENV === "production") {
  console.error("[sesion] SESSION_SECRET no está configurado. Las cookies NO están protegidas.");
}

async function getKey(): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(SECRET || "fallback-insecure-key-do-not-use"),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

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

async function encryptValue(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const ct  = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), 12);
  return bufToB64url(combined.buffer);
}

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

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
  maxAge:   60 * 60,
};

const ALLOWED_ROLES = ["super-admin", "admin", "analista"];

export async function getSession(): Promise<string | null> {
  const raw = (await cookies()).get("token")?.value;
  if (!raw) return null;
  return decryptValue(raw);
}

export async function getSessionRol(): Promise<string | null> {
  const raw = (await cookies()).get("rol")?.value;
  if (!raw) return null;
  return decryptValue(raw);
}

export async function setSession(uid: string, rol: string): Promise<void> {
  if (!uid || typeof uid !== "string" || uid.trim() === "") {
    throw new Error("uid inválido");
  }
  if (!rol || !ALLOWED_ROLES.includes(rol)) {
    throw new Error("rol inválido");
  }

  const encToken = await encryptValue(uid.trim());
  const encRol   = await encryptValue(rol);

  const store = await cookies();
  store.set("token", encToken, COOKIE_OPTS);
  store.set("rol",   encRol,   COOKIE_OPTS);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete("token");
  store.delete("rol");
}
