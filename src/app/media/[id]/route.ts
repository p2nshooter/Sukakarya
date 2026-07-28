import { getViewer } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { getMediaBucket } from "@/lib/env";
import { getMediaById } from "@/lib/media";
import { getCurrentVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Streams a stored object out of R2.
 *
 * The bucket itself is never public. Every read goes through this route so we
 * can (a) scope the lookup to the current tenant, (b) enforce `visibility`, and
 * (c) serve the recorded content-type rather than letting the browser sniff it.
 *
 * Supports conditional requests and range requests so video seeks work.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const village = await getCurrentVillage();
  if (!village) {
    return new Response("Not found", { status: 404 });
  }

  const record = await getMediaById(id, village.id);
  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  if (record.visibility === "private") {
    const viewer = await getViewer();
    if (!canAccess(viewer, "staff")) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const range = request.headers.get("range");
  const object = await getMediaBucket().get(record.objectKey, {
    onlyIf: request.headers,
    range: range ? request.headers : undefined,
  });

  if (!object) {
    // The row exists but the object is gone - report it as missing rather than
    // serving an empty body.
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-type", record.mimeType);
  headers.set("x-content-type-options", "nosniff");
  headers.set(
    "content-disposition",
    `inline; filename="${encodeURIComponent(record.fileName)}"`,
  );
  headers.set(
    "cache-control",
    record.visibility === "private"
      ? "private, no-store"
      : "public, max-age=31536000, immutable",
  );

  // `body` is absent when R2 matched a conditional header: nothing changed.
  if (!("body" in object) || object.body === null) {
    return new Response(null, { status: 304, headers });
  }

  // R2 reports a `range` on every object, so 206 must be gated on the client
  // actually having asked for one - otherwise plain GETs come back partial.
  if (range && object.range && "offset" in object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? record.sizeBytes - offset;
    headers.set(
      "content-range",
      `bytes ${offset}-${offset + length - 1}/${record.sizeBytes}`,
    );
    headers.set("accept-ranges", "bytes");
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("accept-ranges", "bytes");
  return new Response(object.body, { status: 200, headers });
}
