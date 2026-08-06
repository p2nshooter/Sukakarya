import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { newId, slugify } from "@/lib/id";
import { sanitizeHtml } from "@/lib/sanitize";

import type { ResourceDef, ResourceField } from "@/lib/admin/resource";

/**
 * The single write path for every declarative resource.
 *
 * Four things hold for all of them, by construction rather than by discipline:
 *
 *  - every statement carries `village_id = ?`, so one tenant can never read or
 *    write another's rows even if a crafted id is submitted;
 *  - only columns declared on the resource are ever written, so an extra form
 *    field cannot reach a column the screen was not meant to expose;
 *  - `html` fields pass through the allowlist sanitiser before storage;
 *  - every mutation appends an audit entry.
 */

export interface FieldError {
  field: string;
  message: string;
}

export type WriteResult =
  | { ok: true; id: string }
  | { ok: false; errors: FieldError[] };

/** Reads one value out of the form, coerced for its declared kind. */
function readField(
  field: ResourceField,
  formData: FormData,
  deferRequired = false,
): { value: string | number | null; error?: string } {
  const raw = formData.get(field.name);

  if (field.kind === "boolean") {
    return { value: raw === "on" || raw === "1" ? 1 : 0 };
  }

  const text = typeof raw === "string" ? raw.trim() : "";

  if (!text) {
    if (field.required && !deferRequired) {
      return { value: null, error: `${field.label} wajib diisi.` };
    }
    // Numeric columns with a declared default should fall back to it rather
    // than to NULL, which would fail a NOT NULL constraint.
    if (
      (field.kind === "number" || field.kind === "currency") &&
      typeof field.default === "number"
    ) {
      return { value: field.default };
    }
    return { value: null };
  }

  switch (field.kind) {
    case "number":
    case "currency": {
      // Accept "1.250.000" and "1250000,50" as typed by Indonesian users.
      const normalised = text.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalised);
      if (!Number.isFinite(parsed)) {
        return { value: null, error: `${field.label} harus berupa angka.` };
      }
      return { value: parsed };
    }

    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?/.test(text)) {
        return { value: null, error: `${field.label} bukan tanggal yang sah.` };
      }
      return { value: text };
    }

    case "select": {
      const allowed = field.options?.map((option) => option.value) ?? [];
      if (allowed.length > 0 && !allowed.includes(text)) {
        return { value: null, error: `${field.label} bukan pilihan yang tersedia.` };
      }
      return { value: text };
    }

    case "html":
      // Authored markup is untrusted: script, iframe, event handlers and
      // non-http schemes are stripped here, before it ever reaches the row.
      return { value: sanitizeHtml(text.slice(0, 40_000)) };

    case "slug":
      return { value: slugify(text) };

    default:
      return { value: text.slice(0, field.maxLength ?? 500) };
  }
}

interface Prepared {
  values: Record<string, string | number | null>;
  errors: FieldError[];
}

/**
 * Finds a free slug for a village by probing the table.
 *
 * Two UMKM called "Bakso Malang" is an ordinary situation in one village, and
 * an operator who never typed a slug should not be shown a uniqueness error
 * about a column the form filled in for them.
 *
 * The table and column come from the resource definition, never from the
 * request, which is what makes interpolating them here safe.
 */
async function freeSlug(
  resource: ResourceDef,
  column: string,
  base: string,
  villageId: string,
  excludeId: string | null,
): Promise<string> {
  const { results } = await getDb()
    .prepare(
      `SELECT ${column} AS slug FROM ${resource.table}
       WHERE village_id = ? AND ${column} LIKE ? AND id <> ?`,
    )
    .bind(villageId, `${base}%`, excludeId ?? "")
    .all<{ slug: string | null }>();

  const taken = new Set(results.map((row) => row.slug).filter(Boolean));
  if (!taken.has(base)) return base;

  for (let n = 2; n < 200; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function prepare(
  resource: ResourceDef,
  formData: FormData,
  villageId: string,
  rowId: string | null,
): Promise<Prepared> {
  const values: Record<string, string | number | null> = {};
  const errors: FieldError[] = [];

  for (const field of resource.fields) {
    // A slug with a source column is filled in below, so its "required" check
    // has to wait until the derivation has had a chance to run - otherwise the
    // rejection fires first and the derivation is unreachable.
    const derivable = field.kind === "slug" && Boolean(field.slugFrom);

    const { value, error } = readField(field, formData, derivable);
    if (error) {
      errors.push({ field: field.name, message: error });
      continue;
    }
    values[field.name] = value;
  }

  for (const field of resource.fields) {
    if (field.kind !== "slug") continue;

    // A slug the operator typed is left exactly as typed, collisions included:
    // that is a choice they made, and an error is the right answer. Only a
    // blank one is derived, and only a derived one is made unique.
    if (values[field.name]) continue;

    const source = field.slugFrom ? values[field.slugFrom] : null;
    if (typeof source === "string" && source) {
      values[field.name] = await freeSlug(
        resource,
        field.name,
        slugify(source),
        villageId,
        rowId,
      );
    }

    if (field.required && !values[field.name]) {
      errors.push({ field: field.name, message: `${field.label} wajib diisi.` });
    }
  }

  return { values, errors };
}

export async function createRow(
  resource: ResourceDef,
  villageId: string,
  actorId: string | null,
  formData: FormData,
): Promise<WriteResult> {
  const { values, errors } = await prepare(resource, formData, villageId, null);
  if (errors.length > 0) return { ok: false, errors };

  const id = newId(resource.idPrefix);
  const columns = ["id", "village_id", ...Object.keys(values)];
  const placeholders = columns.map(() => "?").join(", ");
  const binds = [id, villageId, ...Object.values(values)];

  try {
    await getDb()
      .prepare(
        `INSERT INTO ${resource.table} (${columns.join(", ")}) VALUES (${placeholders})`,
      )
      .bind(...binds)
      .run();
  } catch (error) {
    return { ok: false, errors: [{ field: "", message: describe(error) }] };
  }

  await logAudit({
    villageId,
    actorId,
    action: "create",
    resource: resource.table,
    resourceId: id,
    summary: `${resource.label}: ${String(values[resource.titleField] ?? id)}`,
  });

  return { ok: true, id };
}

export async function updateRow(
  resource: ResourceDef,
  villageId: string,
  actorId: string | null,
  id: string,
  formData: FormData,
): Promise<WriteResult> {
  const { values, errors } = await prepare(resource, formData, villageId, id);
  if (errors.length > 0) return { ok: false, errors };

  const assignments = Object.keys(values)
    .map((column) => `${column} = ?`)
    .join(", ");
  const binds = [...Object.values(values), id, villageId];

  try {
    await getDb()
      .prepare(
        `UPDATE ${resource.table} SET ${assignments} WHERE id = ? AND village_id = ?`,
      )
      .bind(...binds)
      .run();
  } catch (error) {
    return { ok: false, errors: [{ field: "", message: describe(error) }] };
  }

  await logAudit({
    villageId,
    actorId,
    action: "update",
    resource: resource.table,
    resourceId: id,
    summary: `${resource.label}: ${String(values[resource.titleField] ?? id)}`,
  });

  return { ok: true, id };
}

export async function deleteRow(
  resource: ResourceDef,
  villageId: string,
  actorId: string | null,
  id: string,
): Promise<void> {
  const db = getDb();

  // Soft delete where the table supports it, so a mistaken click is
  // recoverable from the database rather than gone.
  if (resource.softDelete) {
    await db
      .prepare(
        `UPDATE ${resource.table} SET deleted_at = datetime('now')
         WHERE id = ? AND village_id = ?`,
      )
      .bind(id, villageId)
      .run();
  } else {
    await db
      .prepare(`DELETE FROM ${resource.table} WHERE id = ? AND village_id = ?`)
      .bind(id, villageId)
      .run();
  }

  await logAudit({
    villageId,
    actorId,
    action: "delete",
    resource: resource.table,
    resourceId: id,
    summary: `${resource.label} dihapus`,
  });
}

export async function listRows(
  resource: ResourceDef,
  villageId: string,
  limit = 200,
): Promise<Record<string, unknown>[]> {
  const columns = ["id", ...resource.fields.map((f) => f.name)].join(", ");
  const where = resource.softDelete
    ? "village_id = ? AND deleted_at IS NULL"
    : "village_id = ?";

  const { results } = await getDb()
    .prepare(
      `SELECT ${columns} FROM ${resource.table}
       WHERE ${where} ORDER BY ${resource.orderBy} LIMIT ?`,
    )
    .bind(villageId, limit)
    .all<Record<string, unknown>>();

  return results;
}

export async function getRow(
  resource: ResourceDef,
  villageId: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const columns = ["id", ...resource.fields.map((f) => f.name)].join(", ");
  return getDb()
    .prepare(
      `SELECT ${columns} FROM ${resource.table} WHERE id = ? AND village_id = ?`,
    )
    .bind(id, villageId)
    .first<Record<string, unknown>>();
}

/**
 * Turns a driver error into something an operator can act on.
 *
 * The raw message names the table and constraint, which is noise at best and a
 * schema disclosure at worst, so only the recognisable cases are translated and
 * everything else becomes a generic line.
 */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/UNIQUE constraint/i.test(message)) {
    return "Sudah ada data dengan slug atau kombinasi yang sama. Ubah salah satunya.";
  }
  if (/NOT NULL constraint/i.test(message)) {
    return "Ada kolom wajib yang belum terisi.";
  }
  if (/CHECK constraint/i.test(message)) {
    return "Salah satu pilihan tidak diterima. Periksa kolom bertipe pilihan.";
  }
  if (/FOREIGN KEY constraint/i.test(message)) {
    return "Media atau kategori yang dirujuk tidak ditemukan.";
  }
  return "Data gagal disimpan. Periksa kembali isian Anda.";
}
