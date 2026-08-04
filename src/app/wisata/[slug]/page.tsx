import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, Container, PageHeader, Thumb } from "@/components/ui";
import { IconClock, IconPhone, IconPin, IconWallet } from "@/components/icons";

export const dynamic = "force-dynamic";

interface TourismRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  cover_media_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  open_hours: string | null;
  ticket_price: number | null;
  contact: string | null;
}

async function getTourism(villageId: string, slug: string) {
  return getDb()
    .prepare(
      `SELECT id, slug, name, kind, description, cover_media_id, address,
              latitude, longitude, open_hours, ticket_price, contact
       FROM tourism
       WHERE village_id = ? AND slug = ?
         AND status = 'published' AND deleted_at IS NULL`,
    )
    .bind(villageId, slug)
    .first<TourismRow>();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage();
  const item = await getTourism(village.id, slug);

  if (!item) return { title: "Destinasi tidak ditemukan" };
  return { title: item.name, description: item.description ?? undefined };
}

export default async function TourismDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("wisata"), { viewer })) notFound();

  const item = await getTourism(village.id, slug);
  if (!item) notFound();

  const hasCoords = item.latitude !== null && item.longitude !== null;
  const bbox = 0.01;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=` +
      `${item.longitude! - bbox}%2C${item.latitude! - bbox}%2C` +
      `${item.longitude! + bbox}%2C${item.latitude! + bbox}` +
      `&layer=mapnik&marker=${item.latitude}%2C${item.longitude}`
    : null;

  const facts = [
    item.ticket_price !== null && {
      icon: <IconWallet className="h-4 w-4" />,
      label: "Tiket masuk",
      value: item.ticket_price > 0 ? formatCurrency(item.ticket_price) : "Gratis",
    },
    item.open_hours && {
      icon: <IconClock className="h-4 w-4" />,
      label: "Jam buka",
      value: item.open_hours,
    },
    item.address && {
      icon: <IconPin className="h-4 w-4" />,
      label: "Alamat",
      value: item.address,
    },
    item.contact && {
      icon: <IconPhone className="h-4 w-4" />,
      label: "Kontak",
      value: item.contact,
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow="Wisata Desa"
        title={item.name}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Wisata", href: "/wisata" },
          { label: item.name, href: `/wisata/${item.slug}` },
        ]}
        action={<Badge tone="onDark">{item.kind}</Badge>}
      />

      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <div className="min-w-0">
            <Thumb
              src={mediaUrl(item.cover_media_id)}
              alt={item.name}
              ratio="16/9"
              className="rounded-[var(--radius-card)] shadow-[var(--shadow-md)]"
              priority
            />

            {item.description ? (
              <div
                className="prose-cms mt-8"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(item.description),
                }}
              />
            ) : null}

            {mapSrc ? (
              <section className="mt-12">
                <h2 className="font-display text-lg font-bold">Lokasi</h2>
                <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
                  <iframe
                    title={`Peta ${item.name}`}
                    src={mapSrc}
                    loading="lazy"
                    className="aspect-[16/9] w-full border-0"
                  />
                </div>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Card tone="raised" className="p-6">
              <h2 className="font-display font-bold">Informasi</h2>
              <dl className="mt-4 space-y-4 text-sm">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-brand">{fact.icon}</span>
                    <div className="min-w-0">
                      <dt className="text-[var(--text-muted)]">{fact.label}</dt>
                      <dd className="font-semibold leading-snug">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
          </aside>
        </div>
      </Container>
    </SiteShell>
  );
}
