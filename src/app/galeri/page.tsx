import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listAlbums, listGalleryItems } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Galeri" };

export default async function GalleryPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  const showPhotos = shouldRender(modules.get("galeri-foto"), { viewer });
  const showVideos = shouldRender(modules.get("galeri-video"), { viewer });
  if (!showPhotos && !showVideos) notFound();

  const [albums, photos] = await Promise.all([
    listAlbums({ villageId: village.id, limit: 24 }),
    showPhotos
      ? listGalleryItems({ villageId: village.id, kind: "photo", limit: 24 })
      : Promise.resolve([]),
  ]);

  return (
    <SiteShell>
      <PageHeader
        title="Galeri"
        description={`Dokumentasi kegiatan ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Galeri", href: "/galeri" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {albums.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-5 text-xl font-bold">Album</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {albums.map((album) => (
                <Card key={album.id} className="transition hover:border-brand">
                  <Link href={`/galeri/${album.slug}`}>
                    <Thumb src={mediaUrl(album.coverMediaId)} alt={album.title} />
                  </Link>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold">
                      <Link href={`/galeri/${album.slug}`} className="hover:text-brand">
                        {album.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {album.itemCount} berkas · {album.kind}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {showPhotos ? (
          <section>
            <h2 className="mb-5 text-xl font-bold">Foto Terbaru</h2>
            {photos.length === 0 ? (
              <EmptyState title="Belum ada foto." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <Card key={photo.id}>
                    <Thumb
                      src={mediaUrl(photo.mediaId)}
                      alt={photo.title ?? "Dokumentasi desa"}
                      ratio="1/1"
                    />
                    {photo.title ? (
                      <p className="p-2 text-xs text-[var(--text-muted)]">
                        {photo.title}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}
