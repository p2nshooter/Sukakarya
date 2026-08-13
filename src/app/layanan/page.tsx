import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listServices } from "@/lib/content";
import { formatCurrency } from "@/lib/format";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Panduan } from "@/components/panduan";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Layanan Surat Online" };

export default async function ServicesPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("pelayanan-online"), { viewer })) notFound();

  const services = await listServices(village.id);
  const trackingEnabled = shouldRender(modules.get("tracking-surat"), { viewer });

  return (
    <SiteShell>
      <PageHeader
        title="Layanan Surat Online"
        description={`Persyaratan dan pengajuan surat di ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
        ]}
      />

      {/* How the whole thing works, before the catalogue. A resident who has
          never asked for a surat online does not know whether they will have to
          come to the office anyway, or how long it takes - and that uncertainty
          is what sends them to the office instead of the form. */}
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <h2 className="font-display text-xl font-bold">
          Cara Mengajukan Surat
        </h2>
        <p className="mt-1.5 text-[0.9375rem] text-[var(--text-muted)]">
          Lima langkah. Tanpa akun, tanpa antre.
        </p>
        <Panduan
          className="mt-6 max-w-2xl"
          steps={[
            {
              title: "Pilih jenis suratnya",
              body: "Setiap layanan di bawah mencantumkan persyaratan, perkiraan waktu selesai, dan biayanya. Buka yang Anda butuhkan.",
            },
            {
              title: "Baca persyaratannya lebih dulu",
              body: "Siapkan berkas yang diminta — biasanya fotokopi KTP dan Kartu Keluarga. Berkas fisik tetap dibawa saat mengambil surat.",
            },
            {
              title: "Isi formulir pengajuan",
              body: "Nama, kontak yang bisa dihubungi, dan keperluan surat. Data ini hanya dapat dilihat petugas desa dan tidak pernah tampil di halaman publik.",
            },
            {
              title: "Simpan nomor tiket Anda",
              body: "Setelah mengirim, Anda menerima nomor tiket. Catat atau potret layarnya — nomor itu satu-satunya cara memantau status pengajuan.",
              aside: (
                <p>
                  Pantau kapan saja lewat menu{" "}
                  <Link href="/layanan/lacak" className="font-semibold text-brand hover:underline">
                    Lacak Surat
                  </Link>
                  . Petugas juga menghubungi Anda bila ada berkas yang kurang.
                </p>
              ),
            },
            {
              title: "Ambil surat di kantor desa",
              body: "Surat yang sudah selesai ditandatangani Kepala Desa dan diambil pada jam pelayanan. Bawa berkas asli untuk dicocokkan.",
            },
          ]}
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {trackingEnabled ? (
          <Card className="mb-8 flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm">
              Sudah mengajukan surat? Periksa status dengan nomor tiket Anda.
            </p>
            <Link
              href="/layanan/lacak"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Lacak Surat
            </Link>
          </Card>
        ) : null}

        {services.length === 0 ? (
          <EmptyState title="Belum ada layanan yang dipublikasikan." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {services.map((service) => (
              <Card key={service.id} interactive className="flex flex-col p-5">
                <h2 className="text-lg font-semibold">
                  <Link
                    href={`/layanan/${service.slug}`}
                    className="transition-colors hover:text-brand"
                  >
                    {service.name}
                  </Link>
                </h2>
                {service.description ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {service.description}
                  </p>
                ) : null}

                {service.requirements ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Persyaratan
                    </p>
                    <div
                      className="prose-cms mt-1 text-sm"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(service.requirements),
                      }}
                    />
                  </div>
                ) : null}

                <p className="mt-auto pt-4 text-xs text-[var(--text-muted)]">
                  Estimasi {service.slaDays} hari kerja ·{" "}
                  {service.fee > 0 ? formatCurrency(service.fee) : "Tidak dipungut biaya"}
                  {service.requiresLogin ? " · Perlu masuk akun warga" : ""}
                </p>

                {/* Without this the catalogue is a dead end: it lists the
                    requirements for a letter and then offers nothing to press,
                    even though the form exists one route away. */}
                <Link
                  href={`/layanan/${service.slug}`}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  Ajukan Surat Ini
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
