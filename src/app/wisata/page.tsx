import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listTourism } from "@/lib/content";
import { formatCurrency, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Wisata Desa" };

export default async function TourismPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("wisata"), { viewer })) notFound();

  const items = await listTourism({ villageId: village.id, limit: 60 });

  return (
    <SiteShell>
      <PageHeader
        title="Wisata Desa"
        description={`Destinasi, kuliner dan penginapan di ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Wisata", href: "/wisata" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {items.length === 0 ? (
          <EmptyState title="Belum ada destinasi terdaftar." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col transition hover:border-brand">
                <Thumb src={mediaUrl(item.coverMediaId)} alt={item.name} />
                <div className="flex flex-1 flex-col p-4">
                  <Badge>{item.kind}</Badge>
                  {/* Kartu di sini sempat tidak menautkan ke mana pun, padahal
                      halaman rincinya ada, terisi, dan sudah ditautkan dari
                      beranda. Beranda hanya memuat beberapa destinasi teratas,
                      jadi halaman inilah tempat orang menelusuri semuanya -
                      dan di situ setiap kartunya buntu. */}
                  <h2 className="mt-2 font-semibold">
                    <Link href={`/wisata/${item.slug}`} className="hover:text-brand">
                      {item.name}
                    </Link>
                  </h2>
                  <p className="mt-1 flex-1 text-sm text-[var(--text-muted)]">
                    {truncate(item.description, 120)}
                  </p>
                  {item.address ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {item.address}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium">
                    {item.ticketPrice
                      ? formatCurrency(item.ticketPrice)
                      : "Gratis masuk"}
                    {item.openHours ? (
                      <span className="ml-2 font-normal text-[var(--text-muted)]">
                        {item.openHours}
                      </span>
                    ) : null}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
