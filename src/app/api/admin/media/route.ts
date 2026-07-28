import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  deleteMedia,
  listMedia,
  MediaValidationError,
  storeMedia,
  type MediaKind,
} from "@/lib/media";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** GET /api/admin/media - paginated media library for the current village. */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) return json({ error: "Forbidden" }, 403);

  const village = await requireVillage();
  const url = new URL(request.url);

  const items = await listMedia({
    villageId: village.id,
    kind: (url.searchParams.get("kind") as MediaKind | null) ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 40),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });

  return json({ items });
}

/**
 * POST /api/admin/media - uploads a file to R2 and records it in D1.
 *
 * Accepts `multipart/form-data` with a `file` part. The object is written to
 * the bucket before the row is inserted, and the object is removed again if the
 * insert fails, so the two never disagree.
 */
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) return json({ error: "Forbidden" }, 403);

  const village = await requireVillage();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Permintaan harus berupa multipart/form-data." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Berkas tidak ditemukan pada field `file`." }, 400);
  }

  try {
    const record = await storeMedia({
      villageId: village.id,
      file,
      uploadedBy: viewer.userId,
      folder: String(form.get("folder") ?? "/"),
      altText: form.get("altText") ? String(form.get("altText")) : null,
      caption: form.get("caption") ? String(form.get("caption")) : null,
      visibility: form.get("visibility") === "private" ? "private" : "public",
    });

    await logAudit({
      villageId: village.id,
      actorId: viewer.userId,
      action: "create",
      resource: "media",
      resourceId: record.id,
      summary: `Unggah ${record.fileName} (${record.sizeBytes} bytes)`,
    });

    return json({ media: { ...record, url: `/media/${record.id}` } }, 201);
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return json({ error: error.message }, 422);
    }
    console.error("media upload failed", error);
    return json({ error: "Gagal menyimpan berkas." }, 500);
  }
}

/** DELETE /api/admin/media?id=... - soft-deletes the row, removes the object. */
export async function DELETE(request: Request) {
  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) return json({ error: "Forbidden" }, 403);

  const village = await requireVillage();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Parameter `id` wajib diisi." }, 400);

  const removed = await deleteMedia(id, village.id);
  if (!removed) return json({ error: "Media tidak ditemukan." }, 404);

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "delete",
    resource: "media",
    resourceId: id,
    summary: "Hapus media",
  });

  return json({ ok: true });
}
