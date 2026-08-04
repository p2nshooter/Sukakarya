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
import {
  Badge,
  Card,
  Container,
  EmptyState,
  PageHeader,
  Thumb,
} from "@/components/ui";
import { IconPin, IconStore, SocialIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface UmkmRow {
  id: string;
  slug: string;
  name: string;
  owner_name: string | null;
  description: string | null;
  logo_media_id: string | null;
  cover_media_id: string | null;
  whatsapp: string | null;
  address: string | null;
  category_name: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  media_id: string | null;
  stock_status: string;
}

const STOCK_LABEL: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
  available: { label: "Tersedia", tone: "success" },
  preorder: { label: "Pre-order", tone: "warning" },
  out_of_stock: { label: "Habis", tone: "neutral" },
};

async function getUmkm(villageId: string, slug: string) {
  return getDb()
    .prepare(
      `SELECT u.id, u.slug, u.name, u.owner_name, u.description,
              u.logo_media_id, u.cover_media_id, u.whatsapp, u.address,
              c.name AS category_name
       FROM umkm u
       LEFT JOIN categories c ON c.id = u.category_id
       WHERE u.village_id = ? AND u.slug = ?
         AND u.status = 'published' AND u.deleted_at IS NULL`,
    )
    .bind(villageId, slug)
    .first<UmkmRow>();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage();
  const umkm = await getUmkm(village.id, slug);

  if (!umkm) return { title: "UMKM tidak ditemukan" };
  return { title: umkm.name, description: umkm.description ?? undefined };
}

export default async function UmkmDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("umkm"), { viewer })) notFound();

  const umkm = await getUmkm(village.id, slug);
  if (!umkm) notFound();

  const { results: products } = await getDb()
    .prepare(
      `SELECT id, name, description, price, unit, media_id, stock_status
       FROM umkm_products
       WHERE umkm_id = ? AND village_id = ? AND status = 'published'
       ORDER BY is_featured DESC, sort_order, name
       LIMIT 24`,
    )
    .bind(umkm.id, village.id)
    .all<ProductRow>();

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow={umkm.category_name ?? "UMKM Desa"}
        title={umkm.name}
        description={umkm.owner_name ? `Pemilik: ${umkm.owner_name}` : null}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "UMKM", href: "/umkm" },
          { label: umkm.name, href: `/umkm/${umkm.slug}` },
        ]}
      />

      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <div className="min-w-0">
            {umkm.cover_media_id ? (
              <Thumb
                src={mediaUrl(umkm.cover_media_id)}
                alt={umkm.name}
                ratio="16/9"
                className="rounded-[var(--radius-card)] shadow-[var(--shadow-md)]"
                priority
              />
            ) : null}

            {umkm.description ? (
              <div
                className="prose-cms mt-8"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(umkm.description),
                }}
              />
            ) : null}

            <section className="mt-12">
              <h2 className="font-display text-lg font-bold">Produk</h2>
              {products.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="Belum ada produk yang dipublikasikan." />
                </div>
              ) : (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => {
                    const stock =
                      STOCK_LABEL[product.stock_status] ?? STOCK_LABEL.available;

                    return (
                      <Card key={product.id} interactive className="flex flex-col">
                        <Thumb
                          src={mediaUrl(product.media_id)}
                          alt={product.name}
                          ratio="4/3"
                          zoom
                        />
                        <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold leading-snug">
                              {product.name}
                            </h3>
                            <Badge tone={stock.tone}>{stock.label}</Badge>
                          </div>
                          {product.description ? (
                            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                              {product.description}
                            </p>
                          ) : null}
                          {product.price !== null ? (
                            <p className="mt-3 font-display font-bold text-brand">
                              {formatCurrency(product.price)}
                              {product.unit ? (
                                <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                                  / {product.unit}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Card tone="raised" className="p-6">
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand"
              >
                {umkm.logo_media_id ? (
                  <img
                    src={mediaUrl(umkm.logo_media_id)!}
                    alt=""
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <IconStore className="h-6 w-6" />
                )}
              </span>
              <h2 className="mt-4 font-display font-bold">{umkm.name}</h2>

              {umkm.address ? (
                <p className="mt-4 flex gap-2.5 text-sm text-[var(--text-muted)]">
                  <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="leading-relaxed">{umkm.address}</span>
                </p>
              ) : null}

              {umkm.whatsapp ? (
                <a
                  href={`https://wa.me/${umkm.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-brand)] transition-colors hover:bg-brand-600"
                >
                  <SocialIcon platform="whatsapp" className="h-4 w-4" />
                  Hubungi Penjual
                </a>
              ) : null}
            </Card>
          </aside>
        </div>
      </Container>
    </SiteShell>
  );
}
