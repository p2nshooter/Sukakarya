import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listDownloads, listRegulations } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pusat Unduhan" };

export default async function DownloadPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("download-center"), { viewer })) notFound();

  const [files, regulations] = await Promise.all([
    listDownloads({ villageId: village.id, limit: 100 }),
    listRegulations({ villageId: village.id, limit: 100 }),
  ]);

  return (
    <SiteShell>
      <PageHeader
        title="Pusat Unduhan"
        description="Formulir, dokumen publik dan produk hukum desa."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Download", href: "/download" },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <section>
          <h2 className="text-xl font-bold">Dokumen &amp; Formulir</h2>
          {files.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Belum ada berkas yang dibagikan." />
            </div>
          ) : (
            <Card className="mt-4">
              <ul className="divide-y divide-[var(--border)]">
                {files.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{file.title}</p>
                      {file.categoryName ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          {file.categoryName}
                        </p>
                      ) : null}
                    </div>
                    <a
                      href={file.externalUrl ?? mediaUrl(file.mediaId) ?? "#"}
                      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
                      {...(file.externalUrl
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : { download: true })}
                    >
                      Unduh
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {regulations.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-bold">Produk Hukum Desa</h2>
            <Card className="mt-4">
              <ul className="divide-y divide-[var(--border)]">
                {regulations.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs uppercase text-[var(--text-muted)]">
                        {item.type}
                        {item.number ? ` No. ${item.number}` : ""}
                        {item.year ? ` / ${item.year}` : ""}
                      </p>
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
        ) : null}
      </div>
    </SiteShell>
  );
}
