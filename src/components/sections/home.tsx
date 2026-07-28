import Link from "next/link";

import {
  listAlbums,
  listApbdes,
  listBanners,
  listDownloads,
  listEvents,
  listFaqs,
  listGalleryItems,
  listOfficials,
  listPosts,
  listPotentials,
  listServices,
  listStatistics,
  listTourism,
  listUmkm,
} from "@/lib/content";
import { formatCurrency, formatDate, formatNumber, percentOf, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getMenu } from "@/lib/navigation";
import { sanitizeHtml } from "@/lib/sanitize";

import { Badge, Card, EmptyState, MoreLink, Section, Thumb } from "@/components/ui";
import { configNumber, configString, type SectionProps } from "@/components/sections/types";

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export async function HeroBanner({ village, section }: SectionProps) {
  const banners = await listBanners(village.id, "hero");
  if (banners.length === 0) return null;

  const [primary, ...rest] = banners;

  return (
    <section className="relative">
      <div className="relative min-h-[22rem] w-full overflow-hidden bg-brand-dark">
        {primary.mediaId ? (
          <img
            src={mediaUrl(primary.mediaId)!}
            alt={primary.title ?? ""}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        ) : null}
        <div className="relative mx-auto flex min-h-[22rem] max-w-7xl flex-col justify-center px-4 py-16 text-white">
          <p className="text-sm font-medium uppercase tracking-widest opacity-90">
            {section.subtitle ?? `${village.entityLabel} ${village.name}`}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            {primary.title ?? section.title ?? `Selamat Datang di ${village.entityLabel} ${village.name}`}
          </h1>
          {primary.subtitle ? (
            <p className="mt-4 max-w-2xl text-base opacity-95 sm:text-lg">
              {primary.subtitle}
            </p>
          ) : null}
          {primary.linkUrl ? (
            <div className="mt-7">
              <Link
                href={primary.linkUrl}
                className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-white/90"
              >
                {primary.linkLabel ?? "Selengkapnya"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {rest.length > 0 ? (
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, 3).map((banner) => (
            <Card key={banner.id} className="p-4">
              <p className="text-sm font-semibold">{banner.title}</p>
              {banner.subtitle ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {banner.subtitle}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Announcement / event banner strips                                          */
/* -------------------------------------------------------------------------- */

function BannerStrip({
  banners,
  title,
}: {
  banners: Awaited<ReturnType<typeof listBanners>>;
  title: string;
}) {
  if (banners.length === 0) return null;

  return (
    <Section title={title}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <Thumb src={mediaUrl(banner.mediaId)} alt={banner.title ?? title} />
            <div className="p-4">
              <p className="font-semibold">{banner.title}</p>
              {banner.subtitle ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {banner.subtitle}
                </p>
              ) : null}
              {banner.linkUrl ? (
                <Link
                  href={banner.linkUrl}
                  className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
                >
                  {banner.linkLabel ?? "Selengkapnya"} →
                </Link>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function BannerEvent({ village, section }: SectionProps) {
  const banners = await listBanners(village.id, "event");
  return <BannerStrip banners={banners} title={section.title ?? "Event Desa"} />;
}

export async function BannerPengumuman({ village, section }: SectionProps) {
  const banners = await listBanners(village.id, "announcement");
  return <BannerStrip banners={banners} title={section.title ?? "Pengumuman"} />;
}

/* -------------------------------------------------------------------------- */
/* Head of village welcome                                                     */
/* -------------------------------------------------------------------------- */

export async function SambutanKepalaDesa({ village, section }: SectionProps) {
  const [head] = await listOfficials(village.id, "pemerintah_desa");
  const body = configString(section.config, "body");

  if (!head && !body) return null;

  return (
    <Section title={section.title ?? "Sambutan Kepala Desa"}>
      <Card className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
        <Thumb
          src={mediaUrl(head?.photoMediaId ?? null)}
          alt={head?.fullName ?? "Kepala Desa"}
          ratio="3/4"
          className="rounded-lg"
        />
        <div>
          {head ? (
            <>
              <p className="text-lg font-bold">{head.fullName}</p>
              <p className="text-sm text-[var(--text-muted)]">{head.position}</p>
            </>
          ) : null}
          <div
            className="prose-cms mt-4 text-sm"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(body || head?.bio || ""),
            }}
          />
        </div>
      </Card>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick menu, driven by the `quick` menu in the database                       */
/* -------------------------------------------------------------------------- */

export async function QuickMenu({ village, section }: SectionProps) {
  const items = await getMenu(village.id, "quick");
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "Layanan Cepat"}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.url}
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] p-4 text-center transition hover:border-brand hover:bg-[var(--surface-muted)]"
          >
            <span aria-hidden className="text-2xl">
              {item.icon ?? "◆"}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Statistics                                                                  */
/* -------------------------------------------------------------------------- */

export async function StatistikPenduduk({ village, section }: SectionProps) {
  const dataset = configString(section.config, "dataset", "penduduk");
  const entries = await listStatistics(village.id, dataset);
  if (entries.length === 0) return null;

  return (
    <Section
      title={section.title ?? "Statistik Penduduk"}
      subtitle={section.subtitle ?? "Data agregat, tanpa identitas perorangan."}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <Card key={entry.label} className="p-5">
            <p className="text-sm text-[var(--text-muted)]">{entry.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand">
              {formatNumber(entry.value)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {entry.unit}
              {entry.period ? ` · ${entry.period}` : ""}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* News and events                                                             */
/* -------------------------------------------------------------------------- */

export async function BeritaTerbaru({ village, section }: SectionProps) {
  const limit = configNumber(section.config, "limit", 6);
  const posts = await listPosts({ villageId: village.id, type: "news", limit });

  return (
    <Section
      title={section.title ?? "Berita Terbaru"}
      action={<MoreLink href="/berita" />}
    >
      {posts.length === 0 ? (
        <EmptyState title="Belum ada berita." hint="Berita akan tampil di sini setelah dipublikasikan." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col transition hover:border-brand">
              <Link href={`/berita/${post.slug}`}>
                <Thumb src={mediaUrl(post.coverMediaId)} alt={post.title} />
              </Link>
              <div className="flex flex-1 flex-col p-4">
                {post.categoryName ? <Badge>{post.categoryName}</Badge> : null}
                <h3 className="mt-2 font-semibold leading-snug">
                  <Link href={`/berita/${post.slug}`} className="hover:text-brand">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                  {truncate(post.excerpt, 120)}
                </p>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {formatDate(post.publishedAt, `${village.locale}-ID`, village.timezone)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export async function EventTerbaru({ village, section }: SectionProps) {
  const limit = configNumber(section.config, "limit", 4);
  const events = await listEvents({
    villageId: village.id,
    upcomingOnly: true,
    limit,
  });

  return (
    <Section title={section.title ?? "Event Mendatang"} action={<MoreLink href="/event" />}>
      {events.length === 0 ? (
        <EmptyState title="Belum ada event terjadwal." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="flex gap-4 p-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <span className="text-xl font-bold">
                  {new Date(event.startsAt).getDate()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">
                  <Link href={`/event/${event.slug}`} className="hover:text-brand">
                    {event.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {formatDate(event.startsAt, `${village.locale}-ID`, village.timezone)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

export async function AgendaDesa({ village, section }: SectionProps) {
  const events = await listEvents({
    villageId: village.id,
    upcomingOnly: true,
    limit: configNumber(section.config, "limit", 5),
  });
  if (events.length === 0) return null;

  return (
    <Section title={section.title ?? "Agenda Desa"}>
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="text-sm font-medium text-brand">
                {formatDate(event.startsAt, `${village.locale}-ID`, village.timezone)}
              </span>
              <Link href={`/event/${event.slug}`} className="font-medium hover:text-brand">
                {event.title}
              </Link>
              {event.location ? (
                <span className="ml-auto text-xs text-[var(--text-muted)]">
                  {event.location}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Gallery and video                                                           */
/* -------------------------------------------------------------------------- */

export async function GaleriFoto({ village, section }: SectionProps) {
  const items = await listGalleryItems({
    villageId: village.id,
    kind: "photo",
    limit: configNumber(section.config, "limit", 8),
  });
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "Galeri Foto"} action={<MoreLink href="/galeri" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.id}>
            <Thumb
              src={mediaUrl(item.mediaId)}
              alt={item.title ?? "Foto kegiatan desa"}
              ratio="1/1"
            />
            {item.title ? (
              <p className="p-2 text-xs text-[var(--text-muted)]">{item.title}</p>
            ) : null}
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function GaleriVideo({ village, section }: SectionProps) {
  const albums = await listAlbums({
    villageId: village.id,
    kind: "video",
    limit: configNumber(section.config, "limit", 4),
  });
  if (albums.length === 0) return null;

  return (
    <Section title={section.title ?? "Galeri Video"} action={<MoreLink href="/galeri" />}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {albums.map((album) => (
          <Card key={album.id}>
            <Link href={`/galeri/${album.slug}`}>
              <Thumb src={mediaUrl(album.coverMediaId)} alt={album.title} />
            </Link>
            <div className="p-3">
              <p className="text-sm font-semibold">{album.title}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {album.itemCount} video
              </p>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function VideoProfil({ village, section }: SectionProps) {
  const [item] = await listGalleryItems({
    villageId: village.id,
    kind: "video",
    limit: 1,
  });
  const configuredUrl = configString(section.config, "embedUrl");
  const embed = configuredUrl || item?.embedUrl;

  if (!embed && !item?.mediaId) return null;

  return (
    <Section title={section.title ?? `Video Profil ${village.entityLabel} ${village.name}`}>
      <Card className="overflow-hidden">
        {embed ? (
          <div className="aspect-video w-full">
            <iframe
              src={embed}
              title={section.title ?? "Video profil desa"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <video
            controls
            preload="metadata"
            className="aspect-video w-full bg-black"
            src={mediaUrl(item!.mediaId)!}
          />
        )}
      </Card>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Economy                                                                     */
/* -------------------------------------------------------------------------- */

export async function PotensiDesa({ village, section }: SectionProps) {
  const items = await listPotentials(village.id, configNumber(section.config, "limit", 6));
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "Potensi Desa"} action={<MoreLink href="/potensi" />}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <Thumb src={mediaUrl(item.coverMediaId)} alt={item.title} />
            <div className="p-4">
              <Badge>{item.sector}</Badge>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {truncate(item.description, 110)}
              </p>
              {item.metricValue ? (
                <p className="mt-3 text-sm font-semibold text-brand">
                  {item.metricValue}
                  {item.metricLabel ? (
                    <span className="ml-1 font-normal text-[var(--text-muted)]">
                      {item.metricLabel}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function UmkmSection({ village, section }: SectionProps) {
  const items = await listUmkm({
    villageId: village.id,
    limit: configNumber(section.config, "limit", 6),
  });
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "UMKM Desa"} action={<MoreLink href="/umkm" />}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <Thumb src={mediaUrl(item.coverMediaId ?? item.logoMediaId)} alt={item.name} />
            <div className="p-4">
              {item.categoryName ? <Badge>{item.categoryName}</Badge> : null}
              <h3 className="mt-2 font-semibold">
                <Link href={`/umkm/${item.slug}`} className="hover:text-brand">
                  {item.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {truncate(item.description, 100)}
              </p>
              {item.whatsapp ? (
                <a
                  href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
                >
                  Hubungi via WhatsApp →
                </a>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function WisataSection({ village, section }: SectionProps) {
  const items = await listTourism({
    villageId: village.id,
    limit: configNumber(section.config, "limit", 6),
  });
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "Wisata Desa"} action={<MoreLink href="/wisata" />}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <Thumb src={mediaUrl(item.coverMediaId)} alt={item.name} />
            <div className="p-4">
              <Badge>{item.kind}</Badge>
              <h3 className="mt-2 font-semibold">
                <Link href={`/wisata/${item.slug}`} className="hover:text-brand">
                  {item.name}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {truncate(item.description, 100)}
              </p>
              {item.ticketPrice ? (
                <p className="mt-2 text-sm font-medium">
                  {formatCurrency(item.ticketPrice)}
                </p>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Transparency                                                                */
/* -------------------------------------------------------------------------- */

export async function ApbdesRingkas({ village, section }: SectionProps) {
  const { year, rows } = await listApbdes(village.id);
  if (!year || rows.length === 0) return null;

  const totals = { pendapatan: 0, belanja: 0, pembiayaan: 0 };
  const actuals = { pendapatan: 0, belanja: 0, pembiayaan: 0 };

  for (const row of rows) {
    totals[row.section] += row.budgetAmount;
    actuals[row.section] += row.actualAmount;
  }

  return (
    <Section
      title={section.title ?? `APBDes ${year}`}
      subtitle={section.subtitle ?? "Ringkasan anggaran dan realisasi."}
      action={<MoreLink href="/transparansi" label="Lihat rincian" />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {(["pendapatan", "belanja", "pembiayaan"] as const).map((key) => (
          <Card key={key} className="p-5">
            <p className="text-sm capitalize text-[var(--text-muted)]">{key}</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totals[key])}</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(percentOf(actuals[key], totals[key]), 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Realisasi {formatCurrency(actuals[key])} ({percentOf(actuals[key], totals[key])}%)
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Services, downloads, FAQ, contact                                           */
/* -------------------------------------------------------------------------- */

export async function LayananSection({ village, section }: SectionProps) {
  const services = await listServices(village.id);
  if (services.length === 0) return null;

  return (
    <Section title={section.title ?? "Layanan Surat Online"} action={<MoreLink href="/layanan" />}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.slice(0, 6).map((service) => (
          <Card key={service.id} className="p-5">
            <h3 className="font-semibold">
              <Link href={`/layanan/${service.slug}`} className="hover:text-brand">
                {service.name}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {truncate(service.description, 100)}
            </p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Estimasi {service.slaDays} hari kerja
              {service.fee > 0 ? ` · ${formatCurrency(service.fee)}` : " · Gratis"}
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export async function DownloadCenter({ village, section }: SectionProps) {
  const items = await listDownloads({
    villageId: village.id,
    limit: configNumber(section.config, "limit", 8),
  });
  if (items.length === 0) return null;

  return (
    <Section title={section.title ?? "Pusat Unduhan"} action={<MoreLink href="/download" />}>
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
              <span aria-hidden className="text-lg">
                ⬇
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                {item.description ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    {truncate(item.description, 110)}
                  </p>
                ) : null}
              </div>
              <a
                href={item.externalUrl ?? mediaUrl(item.mediaId) ?? "#"}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
                {...(item.externalUrl
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : { download: true })}
              >
                Unduh
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

export async function FaqSection({ village, section }: SectionProps) {
  const faqs = await listFaqs(village.id, configNumber(section.config, "limit", 8));
  if (faqs.length === 0) return null;

  return (
    <Section title={section.title ?? "Pertanyaan yang Sering Diajukan"}>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <summary className="cursor-pointer font-medium">{faq.question}</summary>
            <div
              className="prose-cms mt-2 text-sm text-[var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(faq.answer) }}
            />
          </details>
        ))}
      </div>
    </Section>
  );
}

export async function MapsSection({ village, section }: SectionProps) {
  if (village.latitude === null || village.longitude === null) return null;

  const bbox = 0.02;
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=` +
    `${village.longitude - bbox}%2C${village.latitude - bbox}%2C` +
    `${village.longitude + bbox}%2C${village.latitude + bbox}` +
    `&layer=mapnik&marker=${village.latitude}%2C${village.longitude}`;

  return (
    <Section title={section.title ?? "Peta Lokasi"}>
      <Card className="overflow-hidden">
        <iframe
          title={`Peta ${village.entityLabel} ${village.name}`}
          src={src}
          loading="lazy"
          className="aspect-[16/7] w-full border-0"
        />
      </Card>
    </Section>
  );
}

export async function KontakSection({ village, section }: SectionProps) {
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  return (
    <Section title={section.title ?? "Kontak Kami"}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {village.address ? (
          <Card className="p-5">
            <p className="text-sm font-semibold">Alamat Kantor</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{village.address}</p>
            {region ? (
              <p className="text-sm text-[var(--text-muted)]">{region}</p>
            ) : null}
          </Card>
        ) : null}
        {village.whatsapp ? (
          <Card className="p-5">
            <p className="text-sm font-semibold">WhatsApp</p>
            <a
              href={`https://wa.me/${village.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-brand hover:underline"
            >
              {village.whatsapp}
            </a>
          </Card>
        ) : null}
        {village.email ? (
          <Card className="p-5">
            <p className="text-sm font-semibold">Email</p>
            <a
              href={`mailto:${village.email}`}
              className="mt-1 block text-sm text-brand hover:underline"
            >
              {village.email}
            </a>
          </Card>
        ) : null}
      </div>
    </Section>
  );
}
