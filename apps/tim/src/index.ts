import {
  audit,
  createSession,
  destroySession,
  getSession,
  hashIp,
  hashPassword,
  pruneSessions,
  recordAttempt,
  safeEqual,
  sessionCookie,
  tooManyAttempts,
  type Session,
} from "./auth";
import {
  createMember,
  deleteMember,
  integrityReport,
  listMembers,
  parseMember,
  revealNik,
  summarise,
  updateMember,
} from "./members";
import {
  listArchive,
  readArchive,
  snapshotAll,
  writeExport,
  writeSnapshot,
} from "./archive";
import { renderApp, renderLogin } from "./ui";

interface Env {
  DB: D1Database;
  ARCHIVE: R2Bucket;
  APP_NAME: string;
}

/**
 * Roster application.
 *
 * There is no anonymous surface. Every route other than the login page and its
 * POST requires a session, and the application is never linked from - and never
 * links to - the village CMS. The two are separate Workers on separate
 * databases by design, not by convention.
 */

const SECURITY_HEADERS: Record<string, string> = {
  // The UI is served as one self-contained document with an inline script and
  // inline styles, so those two are allowed and nothing else is. No external
  // origin can be reached, and the page cannot be framed.
  "content-security-policy": [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  // A roster is never something a search engine should hold.
  "x-robots-tag": "noindex, nofollow, noarchive",
  "permissions-policy": "geolocation=(), camera=(), microphone=()",
  "cache-control": "no-store",
};

function html(body: string, status = 200, extra: HeadersInit = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...SECURITY_HEADERS,
      ...extra,
    },
  });
}

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
      ...extra,
    },
  });
}

function canWrite(session: Session): boolean {
  return session.role === "admin" || session.role === "petugas";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const ipHash = await hashIp(request.headers.get("cf-connecting-ip"));

    /* ---------------------------------------------------------------- */
    /* Login                                                             */
    /* ---------------------------------------------------------------- */

    if (path === "/masuk" && request.method === "GET") {
      const existing = await getSession(env.DB, request);
      if (existing) return Response.redirect(`${url.origin}/`, 302);
      return html(renderLogin(url.searchParams.get("e")));
    }

    if (path === "/masuk" && request.method === "POST") {
      const form = await request.formData();
      const email = String(form.get("email") ?? "").trim().toLowerCase();
      const password = String(form.get("password") ?? "");

      if (!email || !password) {
        return Response.redirect(`${url.origin}/masuk?e=kosong`, 302);
      }

      if (await tooManyAttempts(env.DB, ipHash, email)) {
        await audit(env.DB, {
          orgId: "-",
          action: "login.throttled",
          summary: email,
          ipHash,
        });
        return Response.redirect(`${url.origin}/masuk?e=throttle`, 302);
      }

      const user = await env.DB.prepare(
        `SELECT id, org_id, email, full_name, role, password_hash, password_salt
         FROM users WHERE email = ? AND status = 'active' LIMIT 1`,
      )
        .bind(email)
        .first<{
          id: string;
          org_id: string;
          email: string;
          full_name: string;
          role: string;
          password_hash: string;
          password_salt: string;
        }>();

      // Hash regardless of whether the user exists, so a missing account and a
      // wrong password take the same time to answer.
      const candidate = await hashPassword(
        password,
        user?.password_salt ?? "no-such-user",
      );
      const ok = Boolean(user) && safeEqual(candidate, user!.password_hash);

      await recordAttempt(env.DB, ipHash, email, ok);

      if (!ok) {
        await audit(env.DB, {
          orgId: user?.org_id ?? "-",
          action: "login.failed",
          summary: email,
          ipHash,
        });
        return Response.redirect(`${url.origin}/masuk?e=salah`, 302);
      }

      const token = await createSession(env.DB, user!.id, user!.org_id, ipHash);
      await env.DB.prepare(
        "UPDATE users SET last_login_at = datetime('now') WHERE id = ?",
      )
        .bind(user!.id)
        .run();

      await audit(env.DB, {
        orgId: user!.org_id,
        actorId: user!.id,
        actorEmail: user!.email,
        action: "login.ok",
        ipHash,
      });
      await pruneSessions(env.DB);

      return new Response(null, {
        status: 302,
        headers: {
          location: `${url.origin}/`,
          "set-cookie": sessionCookie(token, 12 * 3600),
        },
      });
    }

    if (path === "/keluar") {
      await destroySession(env.DB, request);
      return new Response(null, {
        status: 302,
        headers: {
          location: `${url.origin}/masuk`,
          "set-cookie": sessionCookie("", 0),
        },
      });
    }

    /* ---------------------------------------------------------------- */
    /* Everything past here needs a session                              */
    /* ---------------------------------------------------------------- */

    const session = await getSession(env.DB, request);
    if (!session) {
      if (path.startsWith("/api/")) {
        return json({ error: "Sesi berakhir. Masuk kembali." }, 401);
      }
      return Response.redirect(`${url.origin}/masuk`, 302);
    }

    if (path === "/" && request.method === "GET") {
      const org = await env.DB.prepare(
        "SELECT name, region, motto FROM orgs WHERE id = ?",
      )
        .bind(session.orgId)
        .first<{ name: string; region: string | null; motto: string | null }>();

      return html(renderApp(session, org?.name ?? "Tim", org?.region ?? null));
    }

    /* ---------------------------------------------------------------- */
    /* API                                                               */
    /* ---------------------------------------------------------------- */

    if (path === "/api/ringkasan" && request.method === "GET") {
      return json({
        summary: await summarise(env.DB, session.orgId),
        integrity: await integrityReport(env.DB, session.orgId),
      });
    }

    if (path === "/api/anggota" && request.method === "GET") {
      const p = url.searchParams;
      const result = await listMembers(env.DB, session.orgId, {
        q: p.get("q") ?? undefined,
        kadus: p.get("kadus") ?? undefined,
        rt: p.get("rt") ?? undefined,
        tps: p.get("tps") ?? undefined,
        jabatan: p.get("jabatan") ?? undefined,
        status: p.get("status") ?? undefined,
        page: Number(p.get("page") ?? 1),
        perPage: Number(p.get("perPage") ?? 25),
      });
      return json(result);
    }

    if (path === "/api/anggota" && request.method === "POST") {
      if (!canWrite(session)) return json({ error: "Tidak diizinkan." }, 403);

      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const result = await createMember(
        env.DB,
        session,
        parseMember(body),
        ipHash,
      );

      return result.ok
        ? json({ id: result.id }, 201)
        : json({ issues: result.issues }, 422);
    }

    const memberMatch = path.match(/^\/api\/anggota\/([A-Za-z0-9_]+)$/);
    if (memberMatch) {
      const id = memberMatch[1];

      if (request.method === "PUT") {
        if (!canWrite(session)) return json({ error: "Tidak diizinkan." }, 403);
        const body = (await request.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const result = await updateMember(
          env.DB,
          session,
          id,
          parseMember(body),
          ipHash,
        );
        return result.ok ? json({ ok: true }) : json({ issues: result.issues }, 422);
      }

      if (request.method === "DELETE") {
        // Deleting is an admin decision, not a data-entry one.
        if (session.role !== "admin") {
          return json({ error: "Hanya admin yang dapat menghapus." }, 403);
        }
        await deleteMember(env.DB, session, id, ipHash);
        return json({ ok: true });
      }
    }

    const revealMatch = path.match(/^\/api\/anggota\/([A-Za-z0-9_]+)\/nik$/);
    if (revealMatch && request.method === "POST") {
      const nik = await revealNik(env.DB, session, revealMatch[1], ipHash);
      if (nik === null) {
        return json({ error: "Tidak diizinkan atau data tidak ada." }, 403);
      }
      return json({ nik });
    }

    /* ---------------------------------------------------------------- */
    /* Archive                                                           */
    /* ---------------------------------------------------------------- */

    if (path === "/api/arsip" && request.method === "GET") {
      return json({ items: await listArchive(env, session.orgId) });
    }

    if (path === "/api/arsip/cadangkan" && request.method === "POST") {
      if (session.role !== "admin") return json({ error: "Hanya admin." }, 403);
      const result = await writeSnapshot(env, session.orgId);
      await audit(env.DB, {
        orgId: session.orgId,
        actorId: session.userId,
        actorEmail: session.email,
        action: "snapshot.manual",
        summary: `${result.rows} baris → ${result.key}`,
        ipHash,
      });
      return json(result, 201);
    }

    if (path === "/api/arsip/ekspor" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        includeNik?: boolean;
      };
      const result = await writeExport(
        env,
        session,
        body.includeNik === true,
        ipHash,
      );
      return json(result, 201);
    }

    if (path === "/api/arsip/unduh" && request.method === "GET") {
      const key = url.searchParams.get("key") ?? "";
      const object = await readArchive(env, session, key);
      if (!object) return json({ error: "Berkas tidak ditemukan." }, 404);

      await audit(env.DB, {
        orgId: session.orgId,
        actorId: session.userId,
        actorEmail: session.email,
        action: "archive.download",
        summary: key,
        ipHash,
      });

      return new Response(object.body, {
        headers: {
          "content-type":
            object.httpMetadata?.contentType ?? "application/octet-stream",
          "content-disposition": `attachment; filename="${key.split("/").pop()}"`,
          ...SECURITY_HEADERS,
        },
      });
    }

    if (path === "/api/audit" && request.method === "GET") {
      if (session.role !== "admin") return json({ error: "Hanya admin." }, 403);
      const { results } = await env.DB.prepare(
        `SELECT actor_email, action, summary, created_at
         FROM audit_log WHERE org_id = ?
         ORDER BY created_at DESC LIMIT 200`,
      )
        .bind(session.orgId)
        .all();
      return json({ items: results });
    }

    return json({ error: "Rute tidak ditemukan." }, 404);
  },

  /** Nightly snapshot to R2, so a restorable copy exists without anyone asking. */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await snapshotAll(env);
    await pruneSessions(env.DB);
  },
};
