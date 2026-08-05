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
): { value: string | number | null; error?: string } {
  const raw = formData.get(field.name);

  if (field.kind === "boolean") {
    return { value: raw === "on" || raw === "1" ? 1 : 0 };
  }

  const text = typeof raw === "string" ? raw.trim() : "";

  if (!text) {
    if (field.required) {
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

function prepare(resource: ResourceDef, formData: FormData): Prepared {
  const values: Record<string, string | number | null> = {};
  const errors: FieldError[] = [];

  for (const field of resource.fields) {
    const { value, error } = readField(field, formData);
    if (error) {
      errors.push({ field: field.name, message: error });
      continue;
    }
    values[field.name] = value;
  }

  // A blank slug is derived from its source column rather than rejected, so an
  // operator never has to hand-write one.
  for (const field of resource.fields) {
    if (field.kind !== "slug" || values[field.name]) continue;
    const source = field.slugFrom ? values[field.slugFrom] : null;
    if (typeof source === "string" && source) {
      values[field.name] = slugify(source);
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
  const { values, errors } = prepare(resource, formData);
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
  const { values, errors } = prepare(resource, formData);
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
