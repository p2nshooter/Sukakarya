import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listPpid } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "PPID" };

const CLASSIFICATIONS = {
  berkala: "Informasi Berkala",
  setiap_saat: "Informasi Setiap Saat",
  serta_merta: "Informasi Serta Merta",
} as const;

export default async function PpidPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("ppid"), { viewer })) notFound();

  const items = await listPpid({ villageId: village.id });

  return (
    <SiteShell>
      <PageHeader
        title="PPID"
        description="Pejabat Pengelola Informasi dan Dokumentasi — daftar informasi publik yang tersedia."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "PPID", href: "/ppid" },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        {items.length === 0 ? (
          <EmptyState title="Daftar informasi publik belum tersedia." />
        ) : (
          (Object.keys(CLASSIFICATIONS) as (keyof typeof CLASSIFICATIONS)[]).map(
            (classification) => {
              const group = items.filter(
                (item) => item.classification === classification,
              );
              if (group.length === 0) return null;

              return (
                <section key={classification} className="mb-10">
                  <h2 className="text-xl font-bold">
                    {CLASSIFICATIONS[classification]}
                  </h2>
                  <Card className="mt-4">
                    <ul className="divide-y divide-[var(--border)]">
                      {group.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-3 p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{item.title}</p>
                            {item.summary ? (
                              <p className="text-sm text-[var(--text-muted)]">
                                {item.summary}
                              </p>
                            ) : null}
                            {item.period ? (
                              <p className="text-xs text-[var(--text-muted)]">
                                Periode {item.period}
                              </p>
                            ) : null}
                          </div>
                          {item.mediaId ? (
                            <a
                              href={mediaUrl(item.mediaId)!}
                              download
                              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
                            >
                              Unduh
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </section>
              );
            },
          )
        )}
      </div>
    </SiteShell>
  );
}
