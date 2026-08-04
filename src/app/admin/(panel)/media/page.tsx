import { formatDateTime } from "@/lib/format";
import { listMedia } from "@/lib/media";
import { requireVillage } from "@/lib/village";

import { MediaUploader } from "@/components/admin/media-uploader";
import { EmptyState, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const village = await requireVillage();
  const items = await listMedia({ villageId: village.id, limit: 60 });

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Media</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Berkas disimpan di Cloudflare R2 dan disajikan melalui rute
        <code className="mx-1 rounded bg-[var(--surface-1)] px-1">/media/[id]</code>
        yang memeriksa tenant dan hak akses.
      </p>

      <div className="mt-6">
        <MediaUploader />
      </div>

      <h2 className="mt-10 text-lg font-semibold">
        Pustaka Media ({items.length})
      </h2>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Belum ada berkas." hint="Unggah berkas pertama di atas." />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((media) => (
            <figure
              key={media.id}
              className="overflow-hidden rounded-lg border border-[var(--border)]"
            >
              {media.kind === "image" ? (
                <Thumb src={`/media/${media.id}`} alt={media.altText ?? media.fileName} ratio="1/1" />
              ) : (
                <div className="grid aspect-square place-items-center bg-[var(--surface-1)] text-3xl">
                  <span aria-hidden>
                    {media.kind === "video"
                      ? "▶"
                      : media.kind === "audio"
                        ? "♪"
                        : "▤"}
                  </span>
                </div>
              )}
              <figcaption className="p-2">
                <a
                  href={`/media/${media.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs font-medium hover:text-brand"
                  title={media.fileName}
                >
                  {media.fileName}
                </a>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {Math.max(1, Math.round(media.sizeBytes / 1024))} KB ·{" "}
                  {formatDateTime(media.createdAt, `${village.locale}-ID`, village.timezone)}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
