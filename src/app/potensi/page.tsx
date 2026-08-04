import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listPotentials } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Potensi Desa" };

export default async function PotentialsPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("potensi-desa"), { viewer })) notFound();

  const items = await listPotentials(village.id, 60);

  // Sectors come from a CHECK constraint on the table, so grouping by whatever
  // is present keeps this correct if the list is extended later.
  const sectors = [...new Set(items.map((item) => item.sector))];

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow="Profil Desa"
        title="Potensi Desa"
        description={`Sektor unggulan dan sumber daya yang dimiliki ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Potensi", href: "/potensi" },
        ]}
      />

      <Container className="py-12">
        {items.length === 0 ? (
          <EmptyState
            title="Belum ada potensi yang dipublikasikan."
            hint="Data potensi desa akan tampil di sini setelah ditambahkan dari panel admin."
          />
        ) : (
          <div className="space-y-14">
            {sectors.map((sector) => {
              const group = items.filter((item) => item.sector === sector);

              return (
                <section key={sector}>
                  <h2 className="font-display text-xl font-bold capitalize">
                    {sector}
                  </h2>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((item) => (
                      <Card key={item.id} interactive className="flex flex-col">
                        <Thumb
                          src={mediaUrl(item.coverMediaId)}
                          alt={item.title}
                          zoom
                        />
                        <div className="flex flex-1 flex-col p-5">
                          <Badge tone="neutral">{item.sector}</Badge>
                          <h3 className="mt-3 font-semibold leading-snug">
                            {item.title}
                          </h3>
                          {item.description ? (
                            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                              {item.description}
                            </p>
                          ) : null}
                          {item.metricValue ? (
                            <p className="mt-4 border-t border-[var(--border)] pt-3.5 font-display text-lg font-bold text-brand">
                              {item.metricValue}
                              {item.metricLabel ? (
                                <span className="ml-1.5 text-sm font-normal text-[var(--text-muted)]">
                                  {item.metricLabel}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Container>
    </SiteShell>
  );
}
