"use server";

import { headers } from "next/headers";

const _store = new Map<string, { count: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 10;
const LOCKOUT_MS   = 60 * 60 * 1000;

async function _key(emailHash: string): Promise<string> {
  const hdrs = await headers();
  const ip   =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    "unknown";
  return `${ip}|${emailHash}`;
}

export async function checkRateLimit(
  emailHash: string,
): Promise<{ blocked: boolean; lockedUntil?: number }> {
  const key = await _key(emailHash);
  const now = Date.now();
  const rec = _store.get(key);
  if (!rec) return { blocked: false };
  if (rec.lockedUntil > now) return { blocked: true, lockedUntil: rec.lockedUntil };
  _store.delete(key);
  return { blocked: false };
}

export async function recordFailure(
  emailHash: string,
): Promise<{ lockedUntil?: number; attemptsLeft: number }> {
  const key      = await _key(emailHash);
  const now      = Date.now();
  const rec      = _store.get(key) ?? { count: 0, lockedUntil: 0 };
  const newCount = rec.count + 1;
  const locked   = newCount >= MAX_ATTEMPTS;

  _store.set(key, {
    count:       newCount,
    lockedUntil: locked ? now + LOCKOUT_MS : 0,
  });

  return {
    lockedUntil:  locked ? now + LOCKOUT_MS : undefined,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - newCount),
  };
}

export async function clearRateLimit(emailHash: string): Promise<void> {
  const key = await _key(emailHash);
  _store.delete(key);
}
