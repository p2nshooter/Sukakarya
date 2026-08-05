import type { ReactNode } from "react";
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
import {
  formatCurrency,
  formatDate,
  formatNumber,
  percentOf,
  truncate,
} from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getMenu } from "@/lib/navigation";
import { sanitizeHtml } from "@/lib/sanitize";

import {
  Badge,
  ButtonLink,
  Card,
  Container,
  EmptyState,
  Meter,
  MoreLink,
  Section,
  StatTile,
  Thumb,
} from "@/components/ui";
import {
  IconArrowRight,
  IconChat,
  IconChevronDown,
  IconClock,
  IconDocument,
  IconDownload,
  IconMail,
  IconPhone,
  IconPin,
  IconPlay,
  IconStore,
  SocialIcon,
} from "@/components/icons";
import {
  configNumber,
  configString,
  type SectionProps,
} from "@/components/sections/types";

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

/** Locale tag assembled from the tenant row, e.g. "id" -> "id-ID". */
function localeTag(locale: string): string {
  return locale.includes("-") ? locale : `${locale}-ID`;
}

/** Day/month split for the date blocks on event cards. */
function dayParts(iso: string, locale: string, timezone: string) {
  const date = new Date(iso);
  const fmt = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTag(locale), {
      ...options,
      timeZone: timezone,
    }).format(date);

  return { day: fmt({ day: "numeric" }), month: fmt({ month: "short" }) };
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export async function HeroBanner({ village, section }: SectionProps) {
  const banners = await listBanners(village.id, "hero");
  const [primary, ...rest] = banners;

  const cover = mediaUrl(primary?.mediaId ?? null);
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  const heading =
    primary?.title ??
    section.title ??
    `Selamat Datang di ${village.entityLabel} ${village.name}`;

  return (
    <>
      <section
        className={`brand-mesh grain relative isolate overflow-hidden ${
          rest.length > 0 ? "" : "border-b border-[var(--border)]"
        }`}
      >
        <Container className="relative">
          {/* Split rather than an overlay. Laying text over a photograph means
              guessing at a scrim strong enough for every image a village might
              upload; giving the words their own column means the headline is
              always near-black on ivory and the picture is never darkened.

              With no cover image the second column would leave a large void, so
              the grid collapses to one column and the copy gets more room. */}
          <div
            className={`grid items-center gap-12 py-16 sm:py-20 lg:gap-16 lg:py-24 ${
              cover ? "lg:grid-cols-[1.05fr_1fr]" : ""
            }`}
          >
            <div className={cover ? "max-w-2xl" : "max-w-3xl"}>
              {region ? (
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] backdrop-blur-sm">
                  <IconPin className="h-3.5 w-3.5 text-brand" />
                  {region}
                </p>
              ) : null}

              <h1 className="text-[length:var(--text-display)] font-extrabold leading-[1.03] tracking-[-0.03em]">
                {heading}
              </h1>

              {primary?.subtitle || section.subtitle ? (
                <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
                  {primary?.subtitle ?? section.subtitle}
                </p>
              ) : null}

              <div className="mt-9 flex flex-wrap gap-3">
                {primary?.linkUrl ? (
                  <ButtonLink href={primary.linkUrl} size="lg">
                    {primary.linkLabel ?? "Selengkapnya"}
                    <IconArrowRight className="h-4 w-4" />
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/layanan" size="lg">
                    Ajukan Surat Online
                    <IconArrowRight className="h-4 w-4" />
                  </ButtonLink>
                )}
                <ButtonLink href="/berita" size="lg" variant="secondary">
                  Berita Terbaru
                </ButtonLink>
              </div>
            </div>

            {cover ? (
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -bottom-5 -right-5 hidden h-full w-full rounded-[var(--radius-card)] bg-brand/10 lg:block"
                />
                <img
                  src={cover}
                  alt=""
                  fetchPriority="high"
                  className="relative aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-xl)]"
                />
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* Secondary hero banners become a highlight strip that overlaps the hero
          boundary, so the fold has depth instead of a hard edge. It sits
          outside the section because the hero clips its own overflow, which
          would slice the top off these cards. */}
      {rest.length > 0 ? (
        <Container className="relative z-10 -mt-10 pb-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 3).map((banner) => (
              <div
                key={banner.id}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]"
              >
                <p className="font-semibold leading-snug">{banner.title}</p>
                {banner.subtitle ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                    {truncate(banner.subtitle, 90)}
                  </p>
                ) : null}
                {banner.linkUrl ? (
                  <Link
                    href={banner.linkUrl}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
                  >
                    <span className="link-underline">
                      {banner.linkLabel ?? "Selengkapnya"}
                    </span>
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Announcement / event banner strips                                          */
/* -------------------------------------------------------------------------- */

function BannerStrip({
  banners,
  title,
  eyebrow,
}: {
  banners: Awaited<ReturnType<typeof listBanners>>;
  title: string;
  eyebrow?: string;
}) {
  if (banners.length === 0) return null;

  return (
    <Section title={title} eyebrow={eyebrow} tone="muted">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <Card key={banner.id} interactive className="flex flex-col">
            <Thumb
              src={mediaUrl(banner.mediaId)}
              alt={banner.title ?? title}
              zoom
            />
            <div className="flex flex-1 flex-col p-5">
              <p className="font-semibold leading-snug">{banner.title}</p>
              {banner.subtitle ? (
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {truncate(banner.subtitle, 110)}
                </p>
              ) : null}
              {banner.linkUrl ? (
                <Link
                  href={banner.linkUrl}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
                >
                  <span className="link-underline">
                    {banner.linkLabel ?? "Selengkapnya"}
                  </span>
                  <IconArrowRight className="h-3.5 w-3.5" />
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
  return (
    <BannerStrip
      banners={banners}
      title={section.title ?? "Event Desa"}
      eyebrow="Kegiatan"
    />
  );
}

export async function BannerPengumuman({ village, section }: SectionProps) {
  const banners = await listBanners(village.id, "announcement");
  return (
    <BannerStrip
      banners={banners}
      title={section.title ?? "Pengumuman"}
      eyebrow="Informasi"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Head of village welcome                                                     */
/* -------------------------------------------------------------------------- */

export async function SambutanKepalaDesa({ village, section }: SectionProps) {
  const [head] = await listOfficials(village.id, "pemerintah_desa");
  const body = configString(section.config, "body");

  if (!head && !body) return null;

  return (
    <Section eyebrow="Sambutan" title={section.title ?? "Sambutan Kepala Desa"}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-14">
        <div className="mx-auto w-full max-w-[300px] lg:mx-0">
          <div className="relative">
            {/* Offset brand plate behind the portrait: gives the photograph a
                deliberate frame instead of floating it on the page. */}
            <div
              aria-hidden
              className="absolute -bottom-4 -left-4 h-full w-full rounded-[var(--radius-card)] bg-brand/12"
            />
            <Thumb
              src={mediaUrl(head?.photoMediaId ?? null)}
              alt={head?.fullName ?? "Kepala Desa"}
              ratio="4/5"
              className="relative rounded-[var(--radius-card)] shadow-[var(--shadow-lg)]"
            />
          </div>
          {head ? (
            <div className="relative mt-6">
              <p className="font-display text-lg font-bold leading-tight">
                {head.fullName}
              </p>
              <p className="mt-0.5 text-sm text-brand">{head.position}</p>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-1 -top-8 select-none font-display text-[7rem] leading-none text-brand/10"
          >
            &ldquo;
          </span>
          <div
            className="prose-cms relative"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(body || head?.bio || ""),
            }}
          />
        </div>
      </div>
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
    <Section
      eyebrow="Akses Cepat"
      title={section.title ?? "Layanan Cepat"}
      subtitle={section.subtitle}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.url}
            className="group flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[var(--shadow-md)]"
          >
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-xl text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-[var(--text-on-brand)]"
            >
              {item.icon ?? <IconDocument className="h-5 w-5" />}
            </span>
            <span className="text-sm font-medium leading-snug">
              {item.label}
            </span>
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
      eyebrow="Data"
      title={section.title ?? "Statistik Penduduk"}
      subtitle={section.subtitle ?? "Data agregat, tanpa identitas perorangan."}
      tone="muted"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <StatTile
            key={entry.label}
            value={formatNumber(entry.value)}
            label={entry.label}
            hint={[entry.unit, entry.period].filter(Boolean).join(" · ") || null}
          />
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

  if (posts.length === 0) {
    return (
      <Section
        eyebrow="Kabar Desa"
        title={section.title ?? "Berita Terbaru"}
        action={<MoreLink href="/berita" />}
      >
        <EmptyState
          title="Belum ada berita."
          hint="Berita akan tampil di sini setelah dipublikasikan dari panel admin."
        />
      </Section>
    );
  }

  // Editorial split: the newest item takes a large card and the rest run as a
  // compact list beside it. A uniform grid gives every story equal weight,
  // which is the wrong signal for a news feed.
  const [lead, ...others] = posts;
  const date = (iso: string | null) =>
    formatDate(iso, localeTag(village.locale), village.timezone);

  return (
    <Section
      eyebrow="Kabar Desa"
      title={section.title ?? "Berita Terbaru"}
      subtitle={section.subtitle}
      action={<MoreLink href="/berita" />}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card interactive className="flex flex-col">
          <Link href={`/berita/${lead.slug}`} className="block">
            <Thumb
              src={mediaUrl(lead.coverMediaId)}
              alt={lead.title}
              ratio="16/10"
              zoom
              priority
            />
          </Link>
          <div className="flex flex-1 flex-col p-6">
            <div className="flex flex-wrap items-center gap-2">
              {lead.categoryName ? <Badge>{lead.categoryName}</Badge> : null}
              <span className="text-xs text-[var(--text-muted)]">
                {date(lead.publishedAt)}
              </span>
            </div>
            <h3 className="mt-3 font-display text-xl font-bold leading-snug">
              <Link
                href={`/berita/${lead.slug}`}
                className="transition-colors hover:text-brand"
              >
                {lead.title}
              </Link>
            </h3>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
              {truncate(lead.excerpt, 190)}
            </p>
          </div>
        </Card>

        <ul className="flex flex-col gap-4">
          {others.slice(0, 4).map((post) => (
            <li key={post.id}>
              <Card interactive className="flex gap-4 p-3">
                <Link
                  href={`/berita/${post.slug}`}
                  className="w-28 shrink-0 sm:w-36"
                >
                  <Thumb
                    src={mediaUrl(post.coverMediaId)}
                    alt={post.title}
                    ratio="4/3"
                    className="rounded-lg"
                    zoom
                  />
                </Link>
                <div className="flex min-w-0 flex-col justify-center py-1 pr-2">
                  {post.categoryName ? (
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-brand">
                      {post.categoryName}
                    </span>
                  ) : null}
                  <h3 className="mt-1 font-semibold leading-snug">
                    <Link
                      href={`/berita/${post.slug}`}
                      className="transition-colors hover:text-brand"
                    >
                      {truncate(post.title, 80)}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    {date(post.publishedAt)}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
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

  if (events.length === 0) return null;

  return (
    <Section
      eyebrow="Jadwal"
      title={section.title ?? "Event Mendatang"}
      action={<MoreLink href="/event" />}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {events.map((event) => {
          const { day, month } = dayParts(
            event.startsAt,
            village.locale,
            village.timezone,
          );

          return (
            <Card key={event.id} interactive className="flex gap-5 p-5">
              <div className="grid h-16 w-16 shrink-0 place-content-center rounded-xl bg-brand text-center text-[var(--text-on-brand)] shadow-[var(--shadow-brand)]">
                <span className="font-display text-2xl font-bold leading-none">
                  {day}
                </span>
                <span className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wider opacity-90">
                  {month}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold leading-snug">
                  <Link
                    href={`/event/${event.slug}`}
                    className="transition-colors hover:text-brand"
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <IconClock className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(
                    event.startsAt,
                    localeTag(village.locale),
                    village.timezone,
                  )}
                </p>
                {event.location ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                    <IconPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
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
    <Section eyebrow="Agenda" title={section.title ?? "Agenda Desa"} tone="muted">
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {events.map((event) => {
            const { day, month } = dayParts(
              event.startsAt,
              village.locale,
              village.timezone,
            );

            return (
              <li
                key={event.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-[var(--surface-1)]"
              >
                <div className="grid h-12 w-12 shrink-0 place-content-center rounded-lg bg-brand/10 text-center text-brand">
                  <span className="text-base font-bold leading-none">{day}</span>
                  <span className="mt-0.5 text-[0.625rem] font-semibold uppercase">
                    {month}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/event/${event.slug}`}
                    className="font-medium transition-colors hover:text-brand"
                  >
                    {event.title}
                  </Link>
                  {event.location ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {event.location}
                    </p>
                  ) : null}
                </div>
                <IconArrowRight className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
              </li>
            );
          })}
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
    <Section
      eyebrow="Dokumentasi"
      title={section.title ?? "Galeri Foto"}
      action={<MoreLink href="/galeri" />}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <figure
            key={item.id}
            // The first tile spans two columns so the grid has rhythm instead
            // of reading as a contact sheet.
            className={`zoom-parent group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] ${
              index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
            }`}
          >
            <Thumb
              src={mediaUrl(item.mediaId)}
              alt={item.title ?? "Foto kegiatan desa"}
              ratio="1/1"
              zoom
            />
            {item.title ? (
              <figcaption className="media-scrim absolute inset-x-0 bottom-0 z-10 p-3">
                <span className="relative z-10 block text-xs font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {item.title}
                </span>
              </figcaption>
            ) : null}
          </figure>
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
    <Section
      eyebrow="Video"
      title={section.title ?? "Galeri Video"}
      action={<MoreLink href="/galeri" />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {albums.map((album) => (
          <Card key={album.id} interactive className="group">
            <Link href={`/galeri/${album.slug}`} className="relative block">
              <Thumb src={mediaUrl(album.coverMediaId)} alt={album.title} zoom />
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              >
                <IconPlay className="h-11 w-11 text-white" />
              </span>
            </Link>
            <div className="p-4">
              <p className="text-sm font-semibold leading-snug">{album.title}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
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
    <Section
      eyebrow="Profil"
      title={
        section.title ?? `Video Profil ${village.entityLabel} ${village.name}`
      }
      tone="muted"
    >
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-lg)]">
        {embed ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={embed}
              title={section.title ?? "Video profil desa"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
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
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Economy                                                                     */
/* -------------------------------------------------------------------------- */

export async function PotensiDesa({ village, section }: SectionProps) {
  const items = await listPotentials(
    village.id,
    configNumber(section.config, "limit", 6),
  );
  if (items.length === 0) return null;

  return (
    <Section
      eyebrow="Unggulan"
      title={section.title ?? "Potensi Desa"}
      subtitle={section.subtitle}
      action={<MoreLink href="/potensi" />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} interactive className="flex flex-col">
            <Thumb src={mediaUrl(item.coverMediaId)} alt={item.title} zoom />
            <div className="flex flex-1 flex-col p-5">
              <Badge tone="neutral">{item.sector}</Badge>
              <h3 className="mt-3 font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {truncate(item.description, 110)}
              </p>
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
    <Section
      eyebrow="Ekonomi Warga"
      title={section.title ?? "UMKM Desa"}
      subtitle={section.subtitle}
      action={<MoreLink href="/umkm" />}
      tone="muted"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} interactive className="flex flex-col">
            <Thumb
              src={mediaUrl(item.coverMediaId ?? item.logoMediaId)}
              alt={item.name}
              zoom
            />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"
                >
                  <IconStore className="h-4 w-4" />
                </span>
                {item.categoryName ? (
                  <Badge tone="neutral">{item.categoryName}</Badge>
                ) : null}
              </div>
              <h3 className="mt-3 font-semibold leading-snug">
                <Link
                  href={`/umkm/${item.slug}`}
                  className="transition-colors hover:text-brand"
                >
                  {item.name}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {truncate(item.description, 100)}
              </p>
              {item.whatsapp ? (
                <a
                  href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 self-start rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  <SocialIcon platform="whatsapp" className="h-4 w-4" />
                  Hubungi
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
    <Section
      eyebrow="Destinasi"
      title={section.title ?? "Wisata Desa"}
      subtitle={section.subtitle}
      action={<MoreLink href="/wisata" />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} interactive className="flex flex-col">
            <div className="relative">
              <Thumb src={mediaUrl(item.coverMediaId)} alt={item.name} zoom />
              <span className="absolute left-4 top-4 z-10">
                <Badge tone="onDark">{item.kind}</Badge>
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-semibold leading-snug">
                <Link
                  href={`/wisata/${item.slug}`}
                  className="transition-colors hover:text-brand"
                >
                  {item.name}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {truncate(item.description, 100)}
              </p>
              <p className="mt-4 border-t border-[var(--border)] pt-3.5 text-sm font-semibold">
                {item.ticketPrice
                  ? formatCurrency(item.ticketPrice)
                  : "Gratis masuk"}
              </p>
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

const APBDES_LABELS = {
  pendapatan: "Pendapatan",
  belanja: "Belanja",
  pembiayaan: "Pembiayaan",
} as const;

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
      eyebrow="Transparansi"
      title={section.title ?? `APBDes ${year}`}
      subtitle={section.subtitle ?? "Ringkasan anggaran dan realisasi."}
      action={<MoreLink href="/transparansi" label="Lihat rincian" />}
      tone="muted"
    >
      <div className="grid gap-5 sm:grid-cols-3">
        {(["pendapatan", "belanja", "pembiayaan"] as const).map((key) => {
          const pct = percentOf(actuals[key], totals[key]);

          return (
            <Card key={key} tone="raised" className="p-6">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {APBDES_LABELS[key]}
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold tracking-tight">
                {formatCurrency(totals[key])}
              </p>
              <div className="mt-5">
                <Meter
                  value={actuals[key]}
                  max={totals[key]}
                  label="Realisasi"
                  caption={`${pct}%`}
                />
              </div>
              <p className="mt-2.5 text-xs text-[var(--text-muted)]">
                {formatCurrency(actuals[key])} terealisasi
              </p>
            </Card>
          );
        })}
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
    <Section
      eyebrow="Pelayanan"
      title={section.title ?? "Layanan Surat Online"}
      subtitle={
        section.subtitle ??
        "Ajukan dari rumah, pantau statusnya dengan nomor tiket."
      }
      action={<MoreLink href="/layanan" />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.slice(0, 6).map((service) => (
          <Card key={service.id} interactive className="flex flex-col p-6">
            <span
              aria-hidden
              className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand"
            >
              <IconDocument className="h-5 w-5" />
            </span>
            <h3 className="font-semibold leading-snug">
              <Link
                href={`/layanan/${service.slug}`}
                className="transition-colors hover:text-brand"
              >
                {service.name}
              </Link>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
              {truncate(service.description, 100)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
              <Badge tone="neutral">
                <IconClock className="h-3 w-3" />
                {service.slaDays} hari kerja
              </Badge>
              <Badge tone={service.fee > 0 ? "warning" : "success"}>
                {service.fee > 0 ? formatCurrency(service.fee) : "Gratis"}
              </Badge>
            </div>
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
    <Section
      eyebrow="Formulir & Dokumen"
      title={section.title ?? "Pusat Unduhan"}
      action={<MoreLink href="/download" />}
    >
      <Card>
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-[var(--surface-1)]"
            >
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"
              >
                <IconDocument className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    {truncate(item.description, 110)}
                  </p>
                ) : null}
              </div>
              <a
                href={item.externalUrl ?? mediaUrl(item.mediaId) ?? "#"}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3.5 py-2 text-sm font-semibold transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
                {...(item.externalUrl
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : { download: true })}
              >
                <IconDownload className="h-4 w-4" />
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
  const faqs = await listFaqs(
    village.id,
    configNumber(section.config, "limit", 8),
  );
  if (faqs.length === 0) return null;

  return (
    <Section
      eyebrow="Bantuan"
      title={section.title ?? "Pertanyaan yang Sering Diajukan"}
      tone="muted"
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium [&::-webkit-details-marker]:hidden">
              {faq.question}
              <IconChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div
              className="prose-cms border-t border-[var(--border)] px-5 py-4 text-sm"
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
    <Section eyebrow="Lokasi" title={section.title ?? "Peta Lokasi"}>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-md)]">
        <iframe
          title={`Peta ${village.entityLabel} ${village.name}`}
          src={src}
          loading="lazy"
          className="aspect-[16/7] w-full border-0"
        />
      </div>
    </Section>
  );
}

export async function KontakSection({ village, section }: SectionProps) {
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  interface ContactCard {
    icon: ReactNode;
    label: string;
    value: string;
    href: string | null;
  }

  const cards: ContactCard[] = [];

  if (village.address) {
    cards.push({
      icon: <IconPin className="h-5 w-5" />,
      label: "Alamat Kantor",
      value: [village.address, region].filter(Boolean).join(", "),
      href: null,
    });
  }
  if (village.whatsapp) {
    cards.push({
      icon: <SocialIcon platform="whatsapp" className="h-5 w-5" />,
      label: "WhatsApp",
      value: village.whatsapp,
      href: `https://wa.me/${village.whatsapp.replace(/\D/g, "")}`,
    });
  }
  if (village.phone) {
    cards.push({
      icon: <IconPhone className="h-5 w-5" />,
      label: "Telepon",
      value: village.phone,
      href: `tel:${village.phone.replace(/\s/g, "")}`,
    });
  }
  if (village.email) {
    cards.push({
      icon: <IconMail className="h-5 w-5" />,
      label: "Email",
      value: village.email,
      href: `mailto:${village.email}`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <Section eyebrow="Hubungi Kami" title={section.title ?? "Kontak Kami"}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const body = (
              <>
                <span
                  aria-hidden
                  className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"
                >
                  {card.icon}
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {card.label}
                </p>
                <p className="mt-1 break-words font-medium leading-snug">
                  {card.value}
                </p>
              </>
            );

            return card.href ? (
              <a
                key={card.label}
                href={card.href}
                {...(card.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="hover-lift rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
              >
                {body}
              </a>
            ) : (
              <div
                key={card.label}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
              >
                {body}
              </div>
            );
          })}
        </div>

        <div className="brand-mesh flex flex-col justify-center rounded-[var(--radius-card)] border border-[var(--border-strong)] p-7 shadow-[var(--shadow-md)] lg:w-80">
          <span
            aria-hidden
            className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-[var(--text-on-brand)] shadow-[var(--shadow-brand)]"
          >
            <IconChat className="h-5 w-5" />
          </span>
          <p className="mt-5 font-display text-lg font-bold leading-snug">
            Ada keluhan atau masukan?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Sampaikan melalui kanal pengaduan resmi. Setiap laporan mendapat
            nomor tiket untuk dipantau.
          </p>
          <ButtonLink href="/pengaduan" className="mt-6 self-start">
            Kirim Pengaduan
            <IconArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
