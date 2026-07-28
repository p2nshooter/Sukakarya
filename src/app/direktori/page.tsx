import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listDirectory } from "@/lib/content";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Direktori Desa" };

export default async function DirectoryPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("direktori"), { viewer })) notFound();

  const entries = await listDirectory({ villageId: village.id, limit: 200 });

  // Each directory type maps to its own module, so a village can publish the
  // schools list while keeping, say, the clinics list switched off.
  const visible = entries.filter((entry) => {
    const module = modules.get(entry.type);
    return module ? shouldRender(module, { viewer }) : true;
  });

  const grouped = new Map<string, typeof visible>();
  for (const entry of visible) {
    const list = grouped.get(entry.type) ?? [];
    list.push(entry);
    grouped.set(entry.type, list);
  }

  return (
    <SiteShell>
      <PageHeader
        title="Direktori Desa"
        description="Fasilitas umum, layanan darurat dan wilayah administratif."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Direktori", href: "/direktori" },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10">
        {grouped.size === 0 ? (
          <EmptyState title="Direktori belum diisi." />
        ) : (
          [...grouped.entries()].map(([type, items]) => (
            <section key={type} className="mb-10">
              <h2 className="text-xl font-bold capitalize">
                {modules.get(type)?.name ?? type.replace(/_/g, " ")}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {items.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <p className="font-semibold">{entry.name}</p>
                    {entry.description ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {entry.description}
                      </p>
                    ) : null}
                    {entry.address ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        {entry.address}
                      </p>
                    ) : null}
                    {entry.contact ? (
                      <p className="mt-1 text-sm">
                        Kontak:{" "}
                        <span className="text-brand">{entry.contact}</span>
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </SiteShell>
  );
}
