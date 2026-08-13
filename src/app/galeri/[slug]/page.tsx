import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { listGalleryItems } from "@/lib/content";
import { getDb } from "@/lib/env";
import { truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

interface AlbumRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: string;
}

async function getAlbum(villageId: string, slug: string) {
  return getDb()
    .prepare(
      `SELECT id, slug, title, description, kind FROM albums
       WHERE village_id = ? AND slug = ? AND status = 'published'
         AND deleted_at IS NULL AND access_level = 'public'
       LIMIT 1`,
    )
    .bind(villageId, slug)
    .first<AlbumRow>();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage().catch(() => null);
  if (!village) return {};

  const album = await getAlbum(village.id, slug);
  if (!album) return { title: "Tidak ditemukan" };

  return {
    title: album.title,
    description: truncate(album.description, 160),
    alternates: { canonical: `/galeri/${album.slug}` },
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();

  const album = await getAlbum(village.id, slug);
  if (!album) notFound();

  const items = await listGalleryItems({
    villageId: village.id,
    albumId: album.id,
    limit: 120,
  });

  return (
    <SiteShell>
      <PageHeader
        title={album.title}
        description={album.description}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Galeri", href: "/galeri" },
          { label: truncate(album.title, 40), href: `/galeri/${album.slug}` },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {items.length === 0 ? (
          <EmptyState title="Album ini masih kosong." />
        ) : (
          <div className="tile-reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id}>
                {item.embedUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={item.embedUrl}
                      title={item.title ?? album.title}
                      allowFullScreen
                      loading="lazy"
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : item.kind === "video" && item.mediaId ? (
                  <video
                    controls
                    preload="metadata"
                    className="aspect-video w-full bg-black"
                    src={mediaUrl(item.mediaId)!}
                  />
                ) : (
                  <Thumb
                    src={mediaUrl(item.mediaId)}
                    alt={item.title ?? album.title}
                    ratio="4/3"
                  />
                )}
                {item.title || item.caption ? (
                  <div className="p-3">
                    {item.title ? (
                      <p className="text-sm font-medium">{item.title}</p>
                    ) : null}
                    {item.caption ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.caption}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
