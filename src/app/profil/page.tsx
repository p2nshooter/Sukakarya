import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listOfficials, listStatistics } from "@/lib/content";
import { getDb } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import {
  Card,
  Container,
  EmptyState,
  PageHeader,
  Section,
  StatTile,
  Thumb,
} from "@/components/ui";
import { IconArrowRight, IconMail, IconPhone, IconPin } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profil Desa" };

/** Unit labels, ordered the way a village would print its own structure. */
const UNITS: { key: string; label: string }[] = [
  { key: "pemerintah_desa", label: "Pemerintah Desa" },
  { key: "bpd", label: "Badan Permusyawaratan Desa" },
  { key: "lpm", label: "Lembaga Pemberdayaan Masyarakat" },
  { key: "pkk", label: "PKK" },
  { key: "karang_taruna", label: "Karang Taruna" },
  { key: "rt_rw", label: "RT / RW" },
  { key: "lainnya", label: "Lembaga Lainnya" },
];

export default async function ProfilePage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("profil-desa"), { viewer })) notFound();

  const [officials, penduduk, wilayah] = await Promise.all([
    listOfficials(village.id),
    listStatistics(village.id, "penduduk"),
    listStatistics(village.id, "wilayah"),
  ]);

  // The profile pages an operator has actually written. Listed rather than
  // hardcoded, so a village that adds "Geografi" gets it here for free.
  const { results: pages } = await getDb()
    .prepare(
      `SELECT slug, title, excerpt FROM pages
       WHERE village_id = ? AND status = 'published' AND deleted_at IS NULL
       ORDER BY sort_order, title LIMIT 12`,
    )
    .bind(village.id)
    .all<{ slug: string; title: string; excerpt: string | null }>();

  const [head] = officials.filter((o) => o.unit === "pemerintah_desa");
  const stats = [...penduduk, ...wilayah].filter((s) => s.value > 0).slice(0, 4);

  const showStructure = shouldRender(modules.get("struktur-organisasi"), {
    viewer,
  });

  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow="Tentang Kami"
        title={`Profil ${village.entityLabel} ${village.name}`}
        description={region}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Profil", href: "/profil" },
        ]}
      />

      {stats.length > 0 ? (
        <Container className="relative z-10 -mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((entry) => (
              <StatTile
                key={entry.label}
                value={formatNumber(entry.value)}
                label={entry.label}
                hint={entry.unit}
              />
            ))}
          </div>
        </Container>
      ) : null}

      {head?.bio ? (
        <Section eyebrow="Sambutan" title="Sambutan Kepala Desa">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-14">
            <div className="mx-auto w-full max-w-[280px] lg:mx-0">
              <Thumb
                src={mediaUrl(head.photoMediaId)}
                alt={head.fullName}
                ratio="4/5"
                className="rounded-[var(--radius-card)] shadow-[var(--shadow-lg)]"
              />
              <p className="mt-5 font-display text-lg font-bold leading-tight">
                {head.fullName}
              </p>
              <p className="mt-0.5 text-sm text-brand">{head.position}</p>
            </div>
            <div
              className="prose-cms"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(head.bio) }}
            />
          </div>
        </Section>
      ) : null}

      {pages.length > 0 ? (
        <Section
          eyebrow="Selengkapnya"
          title="Halaman Profil"
          subtitle="Sejarah, visi dan misi, serta keterangan lain yang disusun pemerintah desa."
          tone="muted"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card key={page.slug} interactive className="flex flex-col p-6">
                <h3 className="font-semibold leading-snug">
                  <Link
                    href={`/${page.slug}`}
                    className="transition-colors hover:text-brand"
                  >
                    {page.title}
                  </Link>
                </h3>
                {page.excerpt ? (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    {page.excerpt}
                  </p>
                ) : null}
                <Link
                  href={`/${page.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
                >
                  <span className="link-underline">Baca</span>
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      {showStructure ? (
        <Section
          eyebrow="Organisasi"
          title="Struktur Pemerintahan"
          subtitle="Perangkat desa dan lembaga kemasyarakatan yang bertugas saat ini."
          id="struktur"
        >
          {officials.length === 0 ? (
            <EmptyState title="Data perangkat belum diisi." />
          ) : (
            <div className="space-y-12">
              {UNITS.map((unit) => {
                const members = officials.filter((o) => o.unit === unit.key);
                if (members.length === 0) return null;

                return (
                  <div key={unit.key}>
                    <h3 className="font-display text-lg font-bold">
                      {unit.label}
                    </h3>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {members.map((person) => (
                        <Card key={person.id} className="overflow-hidden">
                          <Thumb
                            src={mediaUrl(person.photoMediaId)}
                            alt={person.fullName}
                            ratio="1/1"
                          />
                          <div className="p-4">
                            <p className="font-semibold leading-snug">
                              {person.fullName}
                            </p>
                            <p className="mt-0.5 text-sm text-brand">
                              {person.position}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      <Section eyebrow="Alamat" title="Kantor Desa" tone="muted">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {village.address ? (
            <Card className="p-5">
              <IconPin className="h-5 w-5 text-brand" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Alamat
              </p>
              <p className="mt-1 leading-snug">
                {[village.address, region].filter(Boolean).join(", ")}
              </p>
            </Card>
          ) : null}
          {village.phone ? (
            <Card className="p-5">
              <IconPhone className="h-5 w-5 text-brand" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Telepon
              </p>
              <a
                href={`tel:${village.phone.replace(/\s/g, "")}`}
                className="mt-1 block font-medium leading-snug hover:text-brand"
              >
                {village.phone}
              </a>
            </Card>
          ) : null}
          {village.email ? (
            <Card className="p-5">
              <IconMail className="h-5 w-5 text-brand" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </p>
              <a
                href={`mailto:${village.email}`}
                className="mt-1 block break-all font-medium leading-snug hover:text-brand"
              >
                {village.email}
              </a>
            </Card>
          ) : null}
        </div>
      </Section>
    </SiteShell>
  );
}
