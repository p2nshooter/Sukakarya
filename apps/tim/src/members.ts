import { audit, newId, type Role, type Session } from "./auth";

/**
 * Member records: validation, masking and persistence.
 *
 * The masking rule is the important part of this file. A national ID number
 * identifies exactly one person, so the listing never selects the column at
 * all - it reads a stored four-digit tail instead. The full value is only ever
 * returned by a single endpoint, only to an admin, and every one of those reads
 * is written to the audit log.
 */

export const MEMBER_FIELDS = [
  "nama",
  "nik",
  "jk",
  "tgl_lahir",
  "kadus",
  "rt",
  "tps",
  "alamat",
  "jabatan",
  "hp",
  "status",
  "tgl_gabung",
  "perekrut",
  "catatan",
] as const;

export type MemberField = (typeof MEMBER_FIELDS)[number];

const STATUSES = ["aktif", "nonaktif", "calon"];

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface MemberInput {
  values: Record<string, string | null>;
  issues: ValidationIssue[];
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Parses and validates a submitted member.
 *
 * The ID number is checked for shape only - sixteen digits - and never against
 * an external register. The application has no business confirming whether a
 * number is real, only that it was typed correctly.
 */
export function parseMember(body: Record<string, unknown>): MemberInput {
  const issues: ValidationIssue[] = [];
  const values: Record<string, string | null> = {};

  const nama = text(body.nama, 120);
  if (!nama) issues.push({ field: "nama", message: "Nama wajib diisi." });
  values.nama = nama;

  const nik = text(body.nik, 24).replace(/\s/g, "");
  if (nik && !/^\d{16}$/.test(nik)) {
    issues.push({ field: "nik", message: "NIK harus 16 digit angka." });
  }
  values.nik = nik || null;
  values.nik_last4 = nik ? nik.slice(-4) : null;

  const jk = text(body.jk, 1).toUpperCase();
  if (jk && !["L", "P"].includes(jk)) {
    issues.push({ field: "jk", message: "Jenis kelamin harus L atau P." });
  }
  values.jk = jk || "";

  for (const [field, max] of [
    ["kadus", 80],
    ["rt", 8],
    ["tps", 8],
    ["alamat", 240],
    ["jabatan", 80],
    ["perekrut", 120],
    ["catatan", 600],
  ] as const) {
    values[field] = text(body[field], max) || null;
  }

  const hp = text(body.hp, 24);
  if (hp && !/^[0-9+()\-.\s]{6,24}$/.test(hp)) {
    issues.push({ field: "hp", message: "Nomor HP tidak valid." });
  }
  values.hp = hp || null;

  for (const field of ["tgl_lahir", "tgl_gabung"] as const) {
    const value = text(body[field], 10);
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      issues.push({ field, message: "Tanggal harus format YYYY-MM-DD." });
    }
    values[field] = value || null;
  }

  const status = text(body.status, 12) || "aktif";
  if (!STATUSES.includes(status)) {
    issues.push({ field: "status", message: "Status tidak dikenal." });
  }
  values.status = status;

  return { values, issues };
}

/** Columns safe to return in a listing. `nik` is deliberately absent. */
const LIST_COLUMNS = `id, nama, nik_last4, jk, kadus, rt, tps, jabatan, hp,
  status, tgl_gabung, perekrut, updated_at`;

export interface ListQuery {
  q?: string;
  kadus?: string;
  rt?: string;
  tps?: string;
  jabatan?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export async function listMembers(
  db: D1Database,
  orgId: string,
  query: ListQuery,
): Promise<{ rows: unknown[]; total: number; page: number; perPage: number }> {
  const conditions = ["org_id = ?", "deleted_at IS NULL"];
  const binds: unknown[] = [orgId];

  // Search covers name and area, never the ID number: allowing a lookup by
  // NIK would turn the search box into a way to confirm whether a given
  // person is on the roster.
  if (query.q) {
    conditions.push("(nama LIKE ? OR kadus LIKE ? OR jabatan LIKE ?)");
    const like = `%${query.q.slice(0, 60)}%`;
    binds.push(like, like, like);
  }

  for (const field of ["kadus", "rt", "tps", "jabatan", "status"] as const) {
    const value = query[field];
    if (value) {
      conditions.push(`${field} = ?`);
      binds.push(value.slice(0, 80));
    }
  }

  const where = conditions.join(" AND ");
  const perPage = Math.min(Math.max(query.perPage ?? 25, 1), 200);
  const page = Math.max(query.page ?? 1, 1);

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM members WHERE ${where}`)
    .bind(...binds)
    .first<{ n: number }>();

  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM members WHERE ${where}
       ORDER BY nama LIMIT ? OFFSET ?`,
    )
    .bind(...binds, perPage, (page - 1) * perPage)
    .all();

  return { rows: results, total: countRow?.n ?? 0, page, perPage };
}

export async function createMember(
  db: D1Database,
  session: Session,
  input: MemberInput,
  ipHash: string | null,
): Promise<{ ok: true; id: string } | { ok: false; issues: ValidationIssue[] }> {
  if (input.issues.length > 0) return { ok: false, issues: input.issues };

  const id = newId("mbr");
  const columns = ["id", "org_id", "created_by", ...Object.keys(input.values)];
  const placeholders = columns.map(() => "?").join(", ");

  try {
    await db
      .prepare(
        `INSERT INTO members (${columns.join(", ")}) VALUES (${placeholders})`,
      )
      .bind(id, session.orgId, session.userId, ...Object.values(input.values))
      .run();
  } catch (error) {
    return { ok: false, issues: [describe(error)] };
  }

  // The summary names the member but never their ID number: the audit log has
  // a longer life than the record it describes.
  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "member.create",
    targetId: id,
    summary: String(input.values.nama ?? ""),
    ipHash,
  });

  return { ok: true, id };
}

export async function updateMember(
  db: D1Database,
  session: Session,
  id: string,
  input: MemberInput,
  ipHash: string | null,
): Promise<{ ok: true } | { ok: false; issues: ValidationIssue[] }> {
  if (input.issues.length > 0) return { ok: false, issues: input.issues };

  const assignments = Object.keys(input.values)
    .map((column) => `${column} = ?`)
    .join(", ");

  try {
    await db
      .prepare(
        `UPDATE members SET ${assignments}, updated_at = datetime('now')
         WHERE id = ? AND org_id = ? AND deleted_at IS NULL`,
      )
      .bind(...Object.values(input.values), id, session.orgId)
      .run();
  } catch (error) {
    return { ok: false, issues: [describe(error)] };
  }

  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "member.update",
    targetId: id,
    summary: String(input.values.nama ?? ""),
    ipHash,
  });

  return { ok: true };
}

export async function deleteMember(
  db: D1Database,
  session: Session,
  id: string,
  ipHash: string | null,
): Promise<void> {
  // Soft delete: a mistaken click on a roster of thousands should be
  // recoverable, and the row is still needed to explain the audit trail.
  await db
    .prepare(
      `UPDATE members SET deleted_at = datetime('now')
       WHERE id = ? AND org_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, session.orgId)
    .run();

  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "member.delete",
    targetId: id,
    ipHash,
  });
}

/**
 * Returns the full ID number for one member.
 *
 * The only path in the application that reads the column, restricted to admins
 * and audited on every call. If this endpoint is ever busy, that is worth
 * someone asking about, which is the point of logging it.
 */
export async function revealNik(
  db: D1Database,
  session: Session,
  id: string,
  ipHash: string | null,
): Promise<string | null> {
  if (session.role !== "admin") return null;

  const row = await db
    .prepare(
      `SELECT nama, nik FROM members
       WHERE id = ? AND org_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, session.orgId)
    .first<{ nama: string; nik: string | null }>();

  if (!row) return null;

  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "member.reveal_nik",
    targetId: id,
    summary: `NIK ${row.nama} dibuka`,
    ipHash,
  });

  return row.nik;
}

/** Aggregate counts for the dashboard. No row-level data leaves this query. */
export async function summarise(
  db: D1Database,
  orgId: string,
): Promise<Record<string, unknown>> {
  const totals = await db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'aktif' THEN 1 ELSE 0 END) AS aktif,
         SUM(CASE WHEN status = 'calon' THEN 1 ELSE 0 END) AS calon,
         SUM(CASE WHEN jk = 'L' THEN 1 ELSE 0 END) AS laki,
         SUM(CASE WHEN jk = 'P' THEN 1 ELSE 0 END) AS perempuan,
         COUNT(DISTINCT tps) AS tps,
         COUNT(DISTINCT kadus) AS kadus
       FROM members WHERE org_id = ? AND deleted_at IS NULL`,
    )
    .bind(orgId)
    .first<Record<string, number>>();

  const byArea = await db
    .prepare(
      `SELECT COALESCE(kadus, '(kosong)') AS kadus, COUNT(*) AS n
       FROM members WHERE org_id = ? AND deleted_at IS NULL
       GROUP BY kadus ORDER BY n DESC LIMIT 20`,
    )
    .bind(orgId)
    .all();

  const byTps = await db
    .prepare(
      `SELECT COALESCE(tps, '(kosong)') AS tps, COUNT(*) AS n
       FROM members WHERE org_id = ? AND deleted_at IS NULL
       GROUP BY tps ORDER BY n DESC LIMIT 30`,
    )
    .bind(orgId)
    .all();

  return { totals, byArea: byArea.results, byTps: byTps.results };
}

/**
 * Data quality report: the checks the original application ran, moved to SQL.
 * Returns counts and ids, never the offending values.
 */
export async function integrityReport(
  db: D1Database,
  orgId: string,
): Promise<Record<string, unknown>> {
  const missingName = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM members
       WHERE org_id = ? AND deleted_at IS NULL AND (nama IS NULL OR nama = '')`,
    )
    .bind(orgId)
    .first<{ n: number }>();

  const badNik = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM members
       WHERE org_id = ? AND deleted_at IS NULL
         AND nik IS NOT NULL AND nik <> '' AND length(nik) <> 16`,
    )
    .bind(orgId)
    .first<{ n: number }>();

  const noNik = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM members
       WHERE org_id = ? AND deleted_at IS NULL AND (nik IS NULL OR nik = '')`,
    )
    .bind(orgId)
    .first<{ n: number }>();

  const noTps = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM members
       WHERE org_id = ? AND deleted_at IS NULL AND (tps IS NULL OR tps = '')`,
    )
    .bind(orgId)
    .first<{ n: number }>();

  return {
    tanpaNama: missingName?.n ?? 0,
    nikTidakValid: badNik?.n ?? 0,
    tanpaNik: noNik?.n ?? 0,
    tanpaTps: noTps?.n ?? 0,
  };
}

function describe(error: unknown): ValidationIssue {
  const message = error instanceof Error ? error.message : String(error);

  if (/UNIQUE constraint/i.test(message) && /nik/i.test(message)) {
    return { field: "nik", message: "NIK ini sudah terdaftar pada anggota lain." };
  }
  if (/CHECK constraint/i.test(message)) {
    return { field: "", message: "Ada pilihan yang tidak diterima." };
  }
  return { field: "", message: "Data gagal disimpan." };
}
