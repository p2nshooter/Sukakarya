import { audit, type Session } from "./auth";

/**
 * R2 side of the storage split.
 *
 * D1 holds the rows that get queried: a few thousand members is single-digit
 * megabytes against a 10 GB per-database ceiling, and it is where an index, a
 * unique constraint and a transaction actually mean something. R2 holds what is
 * genuinely bulky and never queried - nightly snapshots and operator exports -
 * so the live database stays small without giving up SQL.
 *
 * Snapshots are written by a cron trigger, so a restorable copy exists whether
 * or not anyone remembers to press a button.
 */

const SNAPSHOT_PREFIX = "snapshots";
const EXPORT_PREFIX = "exports";
const RETAIN_SNAPSHOTS = 30;

interface Env {
  DB: D1Database;
  ARCHIVE: R2Bucket;
}

function stamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

/**
 * Full snapshot of one org, written as newline-delimited JSON.
 *
 * NDJSON rather than a single array so a restore can stream: a roster that has
 * grown past memory should still be readable a line at a time.
 */
export async function writeSnapshot(
  env: Env,
  orgId: string,
): Promise<{ key: string; rows: number; bytes: number }> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM members WHERE org_id = ? ORDER BY created_at`,
  )
    .bind(orgId)
    .all<Record<string, unknown>>();

  const body = results.map((row) => JSON.stringify(row)).join("\n");
  const key = `${SNAPSHOT_PREFIX}/${orgId}/${stamp()}.ndjson`;

  await env.ARCHIVE.put(key, body, {
    httpMetadata: { contentType: "application/x-ndjson" },
    customMetadata: {
      orgId,
      rows: String(results.length),
      takenAt: new Date().toISOString(),
    },
  });

  await pruneSnapshots(env, orgId);

  return { key, rows: results.length, bytes: body.length };
}

/**
 * Keeps the most recent snapshots and drops the rest.
 *
 * Without this the bucket grows by one full copy a night forever, which is the
 * same storage problem in a different place.
 */
async function pruneSnapshots(env: Env, orgId: string): Promise<void> {
  try {
    const listed = await env.ARCHIVE.list({
      prefix: `${SNAPSHOT_PREFIX}/${orgId}/`,
      limit: 1000,
    });

    // Keys carry an ISO timestamp, so lexical order is chronological order.
    const keys = listed.objects.map((o) => o.key).sort();
    const excess = keys.slice(0, Math.max(0, keys.length - RETAIN_SNAPSHOTS));

    for (const key of excess) await env.ARCHIVE.delete(key);
  } catch {
    // A failed prune must not fail the snapshot it follows.
  }
}

/**
 * Everything this org has parked in the bucket - snapshots and exports both.
 *
 * Listing only snapshots would leave operator exports invisible after the
 * download that created them, which is exactly the sort of file that should be
 * accounted for rather than forgotten.
 */
export async function listArchive(
  env: Env,
  orgId: string,
): Promise<
  { key: string; kind: string; size: number; uploaded: string; rows: string }[]
> {
  const groups = await Promise.all(
    [SNAPSHOT_PREFIX, EXPORT_PREFIX].map((prefix) =>
      env.ARCHIVE.list({
        prefix: `${prefix}/${orgId}/`,
        limit: 100,
        include: ["customMetadata"],
      }),
    ),
  );

  return groups
    .flatMap((listed, index) =>
      listed.objects.map((object) => ({
        key: object.key,
        kind: index === 0 ? "cadangan" : "ekspor",
        size: object.size,
        uploaded: object.uploaded.toISOString(),
        rows: object.customMetadata?.rows ?? "?",
      })),
    )
    .sort((a, b) => b.uploaded.localeCompare(a.uploaded));
}

/** CSV column order, chosen to match what the original app printed. */
const EXPORT_COLUMNS = [
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

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds a CSV export and parks it in R2 rather than streaming it straight
 * back.
 *
 * Two reasons: a large export should not have to be regenerated if the browser
 * drops the connection, and putting it in the bucket means the download is a
 * recorded object rather than a transient response nobody can account for
 * afterwards.
 *
 * `includeNik` is refused for anyone but an admin, because a CSV is the easiest
 * way for a roster to leave the building.
 */
export async function writeExport(
  env: Env,
  session: Session,
  includeNik: boolean,
  ipHash: string | null,
): Promise<{ key: string; rows: number }> {
  const withNik = includeNik && session.role === "admin";

  const columns = withNik
    ? EXPORT_COLUMNS
    : EXPORT_COLUMNS.filter((column) => column !== "nik");

  const { results } = await env.DB.prepare(
    `SELECT ${columns.join(", ")} FROM members
     WHERE org_id = ? AND deleted_at IS NULL ORDER BY nama`,
  )
    .bind(session.orgId)
    .all<Record<string, unknown>>();

  const lines = [
    columns.join(","),
    ...results.map((row) => columns.map((c) => csvCell(row[c])).join(",")),
  ];
  // BOM so Excel on Windows reads the accents correctly.
  const body = `﻿${lines.join("\r\n")}`;

  const key = `${EXPORT_PREFIX}/${session.orgId}/${stamp()}-${
    withNik ? "lengkap" : "tanpa-nik"
  }.csv`;

  await env.ARCHIVE.put(key, body, {
    httpMetadata: { contentType: "text/csv; charset=utf-8" },
    customMetadata: {
      orgId: session.orgId,
      by: session.email,
      rows: String(results.length),
      includesNik: String(withNik),
    },
  });

  await audit(env.DB, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: withNik ? "export.csv_with_nik" : "export.csv",
    summary: `${results.length} baris → ${key}`,
    ipHash,
  });

  return { key, rows: results.length };
}

/**
 * Parks a rendered report alongside the exports.
 *
 * Optional - a report streams straight to the browser whether or not this runs.
 * It exists so a team can answer "what did we hand out, and when": the file the
 * operator downloaded is the file in the bucket, byte for byte.
 */
export async function storeReport(
  env: Env,
  session: Session,
  filename: string,
  body: Uint8Array | string,
  contentType: string,
  rows: number,
  ipHash: string | null,
): Promise<{ key: string }> {
  const key = `${EXPORT_PREFIX}/${session.orgId}/${stamp()}-${filename}`;

  await env.ARCHIVE.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      orgId: session.orgId,
      by: session.email,
      rows: String(rows),
    },
  });

  await audit(env.DB, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "report.archived",
    summary: `${rows} baris → ${key}`,
    ipHash,
  });

  return { key };
}

/**
 * Streams an archived object back to an authenticated operator.
 *
 * The key is checked against the caller's own org prefix before the fetch, so a
 * crafted key cannot reach another team's snapshot.
 */
export async function readArchive(
  env: Env,
  session: Session,
  key: string,
): Promise<R2ObjectBody | null> {
  const allowed =
    key.startsWith(`${SNAPSHOT_PREFIX}/${session.orgId}/`) ||
    key.startsWith(`${EXPORT_PREFIX}/${session.orgId}/`);

  if (!allowed) return null;

  return env.ARCHIVE.get(key);
}

/** Every org gets a snapshot on the cron tick. */
export async function snapshotAll(env: Env): Promise<void> {
  const { results } = await env.DB.prepare("SELECT id FROM orgs").all<{
    id: string;
  }>();

  for (const org of results) {
    try {
      const result = await writeSnapshot(env, org.id);
      await audit(env.DB, {
        orgId: org.id,
        action: "snapshot.auto",
        summary: `${result.rows} baris, ${result.bytes} byte → ${result.key}`,
      });
    } catch {
      // One org failing must not stop the others.
      await audit(env.DB, { orgId: org.id, action: "snapshot.failed" });
    }
  }
}
