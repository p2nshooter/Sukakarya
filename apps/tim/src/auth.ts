/**
 * Authentication for the roster app.
 *
 * Same construction as the village CMS: PBKDF2-SHA256 with a per-user salt for
 * passwords, and sessions persisted as a SHA-256 digest of the cookie token so
 * that a dump of the sessions table cannot be replayed as a login.
 *
 * There is no anonymous surface in this application, so every request that is
 * not the login endpoint goes through `requireSession`.
 */

const PBKDF2_ITERATIONS = 210_000;
const SESSION_TTL_HOURS = 12;
export const SESSION_COOKIE = "tim_session";

export type Role = "admin" | "petugas" | "baca";

export interface Session {
  userId: string;
  orgId: string;
  email: string;
  fullName: string;
  role: Role;
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomToken(9)}`;
}

export async function sha256(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
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
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(bits);
}

/** Constant-time comparison; a length-dependent early return leaks. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hashes the client IP before it is stored.
 *
 * Throttling and audit both need to distinguish clients, neither needs to know
 * who they are, so the address is never written down in the clear.
 */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  return (await sha256(`tim:${ip}`)).slice(0, 32);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  // HttpOnly so script cannot read it, SameSite=Strict because this app is
  // never legitimately embedded or linked into from elsewhere, Secure because
  // it only ever runs over TLS.
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export async function createSession(
  db: D1Database,
  userId: string,
  orgId: string,
  ipHash: string | null,
): Promise<string> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, org_id, ip_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(await sha256(token), userId, orgId, ipHash, expires.toISOString())
    .run();

  return token;
}

export async function getSession(
  db: D1Database,
  request: Request,
): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const row = await db
    .prepare(
      `SELECT u.id, u.org_id, u.email, u.full_name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.expires_at > datetime('now')
         AND u.status = 'active'`,
    )
    .bind(await sha256(token))
    .first<{
      id: string;
      org_id: string;
      email: string;
      full_name: string;
      role: Role;
    }>();

  if (!row) return null;

  return {
    userId: row.id,
    orgId: row.org_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

export async function destroySession(
  db: D1Database,
  request: Request,
): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}

/** Best-effort cleanup; expired rows are useless and accumulate. */
export async function pruneSessions(db: D1Database): Promise<void> {
  try {
    await db
      .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
      .run();
  } catch {
    // A failed prune must never fail the request that triggered it.
  }
}

/* -------------------------------------------------------------------------- */
/* Login throttling                                                            */
/* -------------------------------------------------------------------------- */

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export async function tooManyAttempts(
  db: D1Database,
  ipHash: string | null,
  email: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT attempts FROM login_attempts
       WHERE ip_hash = ? AND email = ?
         AND window_start > datetime('now', ?)`,
    )
    .bind(ipHash ?? "anon", email, `-${WINDOW_MINUTES} minutes`)
    .first<{ attempts: number }>();

  return (row?.attempts ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(
  db: D1Database,
  ipHash: string | null,
  email: string,
  success: boolean,
): Promise<void> {
  const key = ipHash ?? "anon";

  if (success) {
    await db
      .prepare("DELETE FROM login_attempts WHERE ip_hash = ? AND email = ?")
      .bind(key, email)
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO login_attempts (ip_hash, email, attempts, window_start)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT (ip_hash, email) DO UPDATE SET
         attempts = CASE
           WHEN window_start > datetime('now', ?) THEN attempts + 1
           ELSE 1 END,
         window_start = CASE
           WHEN window_start > datetime('now', ?) THEN window_start
           ELSE datetime('now') END`,
    )
    .bind(key, email, `-${WINDOW_MINUTES} minutes`, `-${WINDOW_MINUTES} minutes`)
    .run();
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                       */
/* -------------------------------------------------------------------------- */

export async function audit(
  db: D1Database,
  entry: {
    orgId: string;
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    targetId?: string | null;
    summary?: string | null;
    ipHash?: string | null;
  },
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log
           (id, org_id, actor_id, actor_email, action, target_id, summary, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("aud"),
        entry.orgId,
        entry.actorId ?? null,
        entry.actorEmail ?? null,
        entry.action,
        entry.targetId ?? null,
        entry.summary ?? null,
        entry.ipHash ?? null,
      )
      .run();
  } catch {
    // The audit write must never take down the operation it describes.
  }
}
