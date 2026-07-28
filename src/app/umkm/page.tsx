import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listUmkm } from "@/lib/content";
import { truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "UMKM Desa" };

export default async function UmkmPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("umkm"), { viewer })) notFound();

  const items = await listUmkm({ villageId: village.id, limit: 60 });

  return (
    <SiteShell>
      <PageHeader
        title="UMKM Desa"
        description={`Usaha mikro, kecil dan menengah di ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "UMKM", href: "/umkm" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {items.length === 0 ? (
          <EmptyState title="Belum ada UMKM terdaftar." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-col transition hover:border-brand">
                <Thumb
                  src={mediaUrl(item.coverMediaId ?? item.logoMediaId)}
                  alt={item.name}
                />
                <div className="flex flex-1 flex-col p-4">
                  {item.categoryName ? <Badge>{item.categoryName}</Badge> : null}
                  <h2 className="mt-2 font-semibold">
                    <Link href={`/umkm/${item.slug}`} className="hover:text-brand">
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
                  {item.whatsapp ? (
                    <a
                      href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
                    >
                      Pesan via WhatsApp →
                    </a>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
