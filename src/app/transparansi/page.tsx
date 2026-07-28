import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listApbdes } from "@/lib/content";
import { formatCurrency, percentOf } from "@/lib/format";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Transparansi APBDes" };

const SECTION_LABEL = {
  pendapatan: "Pendapatan",
  belanja: "Belanja",
  pembiayaan: "Pembiayaan",
} as const;

export default async function TransparencyPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("transparansi"), { viewer })) notFound();

  const requestedYear = Number(params.tahun);
  const { year, rows } = await listApbdes(
    village.id,
    Number.isInteger(requestedYear) ? requestedYear : undefined,
  );

  return (
    <SiteShell>
      <PageHeader
        title={year ? `APBDes ${year}` : "Transparansi APBDes"}
        description="Ringkasan anggaran dan realisasi. Angka bersifat agregat sesuai dokumen resmi desa."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Transparansi", href: "/transparansi" },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10">
        {rows.length === 0 ? (
          <EmptyState title="Data APBDes belum dipublikasikan." />
        ) : (
          (["pendapatan", "belanja", "pembiayaan"] as const).map((sectionKey) => {
            const sectionRows = rows.filter((r) => r.section === sectionKey);
            if (sectionRows.length === 0) return null;

            const budget = sectionRows.reduce((sum, r) => sum + r.budgetAmount, 0);
            const actual = sectionRows.reduce((sum, r) => sum + r.actualAmount, 0);

            return (
              <section key={sectionKey} className="mb-10">
                <h2 className="text-xl font-bold">{SECTION_LABEL[sectionKey]}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Anggaran {formatCurrency(budget)} · Realisasi{" "}
                  {formatCurrency(actual)} ({percentOf(actual, budget)}%)
                </p>

                <Card className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left">
                        <th className="px-4 py-3 font-semibold">Uraian</th>
                        <th className="px-4 py-3 font-semibold">Kategori</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Anggaran
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Realisasi
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((row, i) => (
                        <tr key={`${row.item}-${i}`} className="border-b border-[var(--border)]">
                          <td className="px-4 py-3">{row.item}</td>
                          <td className="px-4 py-3 text-[var(--text-muted)]">
                            {row.category}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.budgetAmount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.actualAmount)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {percentOf(row.actualAmount, row.budgetAmount)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            );
          })
        )}
      </div>
    </SiteShell>
  );
}
