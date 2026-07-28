import { getDb, getMediaBucket } from "@/lib/env";
import { newId, slugify } from "@/lib/id";

export type MediaKind = "image" | "video" | "audio" | "document" | "file";

export interface MediaRecord {
  id: string;
  villageId: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  altText: string | null;
  caption: string | null;
  folder: string;
  visibility: "public" | "private";
  createdAt: string;
}

/** 64 MiB - comfortably above a drone photo or a short clip, below the Worker
 *  request body ceiling. */
export const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

/**
 * Allowlist rather than denylist: anything not named here is rejected. Keeps
 * executables, HTML and SVG (script-carrying) out of a bucket we serve from our
 * own origin.
 */
export const ALLOWED_MIME_TYPES: Record<string, { ext: string; kind: MediaKind }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "audio/mpeg": { ext: "mp3", kind: "audio" },
  "audio/ogg": { ext: "ogg", kind: "audio" },
  "audio/wav": { ext: "wav", kind: "audio" },
  "application/pdf": { ext: "pdf", kind: "document" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    kind: "document",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: "xlsx",
    kind: "document",
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: "pptx",
    kind: "document",
  },
  "text/csv": { ext: "csv", kind: "document" },
};

export class MediaValidationError extends Error {}

export function assertUploadIsAllowed(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    throw new MediaValidationError(
      `Tipe berkas "${mimeType}" tidak diizinkan. Format yang didukung: ` +
        `${Object.keys(ALLOWED_MIME_TYPES).join(", ")}.`,
    );
  }
  if (sizeBytes <= 0) {
    throw new MediaValidationError("Berkas kosong.");
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(
      `Ukuran berkas melebihi batas ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
    );
  }
}

/**
 * Builds the R2 object key.
 *
 * Keys are namespaced by village and date so that one village can never read or
 * overwrite another's objects by guessing a key, and so the bucket stays
 * browsable. The random id keeps uploads with identical names distinct.
 */
export function buildObjectKey(params: {
  villageId: string;
  fileName: string;
  mimeType: string;
  now?: Date;
}): string {
  const { ext } = ALLOWED_MIME_TYPES[params.mimeType];
  const now = params.now ?? new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const base = slugify(params.fileName.replace(/\.[^.]+$/, ""), "berkas");
  return `${params.villageId}/${year}/${month}/${base}-${newId()}.${ext}`;
}

export interface StoreMediaInput {
  villageId: string;
  file: File;
  uploadedBy?: string | null;
  folder?: string;
  altText?: string | null;
  caption?: string | null;
  visibility?: "public" | "private";
}

/**
 * Writes the object to R2, then records it in D1.
 *
 * If the D1 insert fails the R2 object is deleted again, so the bucket never
 * accumulates rows nobody can find.
 */
export async function storeMedia(input: StoreMediaInput): Promise<MediaRecord> {
  const { file, villageId } = input;
  const mimeType = file.type || "application/octet-stream";
  const sizeBytes = file.size;

  assertUploadIsAllowed(mimeType, sizeBytes);

  const objectKey = buildObjectKey({
    villageId,
    fileName: file.name || "berkas",
    mimeType,
  });

  const bucket = getMediaBucket();
  const body = await file.arrayBuffer();

  const uploaded = await bucket.put(objectKey, body, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      villageId,
      originalName: file.name || "berkas",
    },
  });

  const id = newId("med");
  const kind = ALLOWED_MIME_TYPES[mimeType].kind;
  const createdAt = new Date().toISOString();

  try {
    await getDb()
      .prepare(
        `INSERT INTO media (id, village_id, object_key, file_name, mime_type,
                            size_bytes, kind, checksum, alt_text, caption,
                            folder, visibility, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        villageId,
        objectKey,
        file.name || "berkas",
        mimeType,
        sizeBytes,
        kind,
        uploaded?.etag ?? null,
        input.altText ?? null,
        input.caption ?? null,
        input.folder ?? "/",
        input.visibility ?? "public",
        input.uploadedBy ?? null,
        createdAt,
      )
      .run();
  } catch (error) {
    await bucket.delete(objectKey).catch(() => {
      /* best effort: the row insert already failed, surface that instead */
    });
    throw error;
  }

  return {
    id,
    villageId,
    objectKey,
    fileName: file.name || "berkas",
    mimeType,
    sizeBytes,
    kind,
    altText: input.altText ?? null,
    caption: input.caption ?? null,
    folder: input.folder ?? "/",
    visibility: input.visibility ?? "public",
    createdAt,
  };
}

interface MediaRow {
  id: string;
  village_id: string;
  object_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: MediaKind;
  alt_text: string | null;
  caption: string | null;
  folder: string;
  visibility: "public" | "private";
  created_at: string;
}

function toRecord(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    villageId: row.village_id,
    objectKey: row.object_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    kind: row.kind,
    altText: row.alt_text,
    caption: row.caption,
    folder: row.folder,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

const MEDIA_COLUMNS = `id, village_id, object_key, file_name, mime_type,
  size_bytes, kind, alt_text, caption, folder, visibility, created_at`;

export async function getMediaById(
  id: string,
  villageId?: string,
): Promise<MediaRecord | null> {
  const sql = villageId
    ? `SELECT ${MEDIA_COLUMNS} FROM media
       WHERE id = ? AND village_id = ? AND deleted_at IS NULL LIMIT 1`
    : `SELECT ${MEDIA_COLUMNS} FROM media
       WHERE id = ? AND deleted_at IS NULL LIMIT 1`;

  const stmt = villageId
    ? getDb().prepare(sql).bind(id, villageId)
    : getDb().prepare(sql).bind(id);

  const row = await stmt.first<MediaRow>();
  return row ? toRecord(row) : null;
}

export async function listMedia(params: {
  villageId: string;
  kind?: MediaKind;
  limit?: number;
  offset?: number;
}): Promise<MediaRecord[]> {
  const limit = Math.min(Math.max(params.limit ?? 40, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const sql = params.kind
    ? `SELECT ${MEDIA_COLUMNS} FROM media
       WHERE village_id = ? AND kind = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    : `SELECT ${MEDIA_COLUMNS} FROM media
       WHERE village_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const stmt = params.kind
    ? getDb().prepare(sql).bind(params.villageId, params.kind, limit, offset)
    : getDb().prepare(sql).bind(params.villageId, limit, offset);

  const { results } = await stmt.all<MediaRow>();
  return results.map(toRecord);
}

/** Soft-deletes the row and removes the object from R2. */
export async function deleteMedia(id: string, villageId: string): Promise<boolean> {
  const record = await getMediaById(id, villageId);
  if (!record) return false;

  await getDb()
    .prepare("UPDATE media SET deleted_at = ? WHERE id = ? AND village_id = ?")
    .bind(new Date().toISOString(), id, villageId)
    .run();

  await getMediaBucket().delete(record.objectKey);
  return true;
}

/** Public URL for a stored media id. Served by `app/media/[id]/route.ts`. */
export function mediaUrl(id: string | null | undefined): string | null {
  return id ? `/media/${id}` : null;
}
