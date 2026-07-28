import { cache } from "react";
import { cookies } from "next/headers";

import { ANONYMOUS, levelFromRoles, type Viewer } from "@/lib/access";
import { getDb } from "@/lib/env";
import { newId } from "@/lib/id";

export const SESSION_COOKIE = "desa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 guidance for PBKDF2-SHA256

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = Uint8Array.from(
    saltHex.match(/.{2}/g) ?? [],
    (byte) => parseInt(byte, 16),
  );

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(bits);
}

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return { hash: await pbkdf2(password, salt), salt };
}

/** Constant-time comparison so a wrong password leaks no timing information. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  return timingSafeEqual(await pbkdf2(password, salt), hash);
}

/** Sessions are stored as a SHA-256 digest; the raw token only ever lives in
 *  the user's cookie, so a database leak cannot be replayed as a login. */
export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}

export async function createSession(params: {
  userId: string;
  villageId: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
}): Promise<{ token: string; expiresAt: string }> {
  const token = `${newId()}${newId()}`;
  const id = await hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000,
  ).toISOString();

  await getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, village_id, user_agent, ip_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.userId,
      params.villageId,
      params.userAgent ?? null,
      params.ipHash ?? null,
      expiresAt,
    )
    .run();

  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await getDb()
    .prepare("DELETE FROM sessions WHERE id = ?")
    .bind(await hashToken(token))
    .run();
}

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

interface SessionRow {
  user_id: string;
  village_id: string | null;
  expires_at: string;
  status: string;
  deleted_at: string | null;
}

/**
 * Resolves the current viewer from the session cookie.
 *
 * Returns `ANONYMOUS` for any failure - expired session, suspended or deleted
 * user, missing cookie - so callers never have to distinguish "logged out" from
 * "session no longer valid".
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return ANONYMOUS;

  const db = getDb();
  const session = await db
    .prepare(
      `SELECT s.user_id, s.village_id, s.expires_at, u.status, u.deleted_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? LIMIT 1`,
    )
    .bind(await hashToken(token))
    .first<SessionRow>();

  if (!session) return ANONYMOUS;
  if (session.deleted_at || session.status !== "active") return ANONYMOUS;
  if (session.expires_at <= new Date().toISOString()) return ANONYMOUS;

  const { results: roleRows } = await db
    .prepare(
      `SELECT r.slug FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?`,
    )
    .bind(session.user_id)
    .all<{ slug: string }>();

  const roleSlugs = roleRows.map((r) => r.slug);

  const { results: permRows } = await db
    .prepare(
      `SELECT DISTINCT p.slug FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ?`,
    )
    .bind(session.user_id)
    .all<{ slug: string }>();

  return {
    userId: session.user_id,
    villageId: session.village_id,
    level: levelFromRoles(roleSlugs),
    permissions: new Set(permRows.map((p) => p.slug)),
  };
});

/** Hashes a client IP for rate limiting without storing the address itself. */
export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  return (await hashToken(ip)).slice(0, 32);
}
