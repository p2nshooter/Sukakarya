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
import { getMediaById, listMedia, mediaUrl } from "@/lib/media";
import { filterNav, getMenu } from "@/lib/navigation";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { getVillageSettings } from "@/lib/village";

import { VideoHero } from "@/components/video-hero";
import { VillageScene } from "@/components/village-scene";
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
  IconUsers,
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
/* Video banner                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The welcome clip that opens the homepage, above the hero.
 *
 * It is a section like any other, so an operator can retitle it, hide it, move
 * it below the hero, or switch the whole module off from Tata Letak - none of
 * which would be possible if the video were pinned into the page component.
 *
 * The clip is chosen by `mediaId` in the section config, and falls back to the
 * most recently uploaded video in the media library. Replacing the video is
 * therefore an upload, not a deployment.
 */
export async function VideoBanner({ village, section }: SectionProps) {
  const configuredId = configString(section.config, "mediaId");
  const video = configuredId
    ? await getMediaById(configuredId, village.id)
    : (await listMedia({ villageId: village.id, kind: "video", limit: 1 }))[0];

  if (!video) return null;

  const posterId = configString(section.config, "posterMediaId");
  const fallbackId = configString(section.config, "webmMediaId");
  const label =
    section.title ?? `Video sambutan ${village.entityLabel} ${village.name}`;

  // A village-level switch rather than a section one: the point of the stamp is
  // to mark the whole installation as a demonstration, and an operator who
  // turns it off should not have to remember which sections carried it.
  const settings = await getVillageSettings(village.id, "site.");
  const stamp = settings["site.demo_stamp"] === "1" ? "DEMO WEBSITE" : null;

  return (
    <VideoHero
      src={mediaUrl(video.id)!}
      fallbackSrc={mediaUrl(fallbackId || null)}
      poster={mediaUrl(posterId || null)}
      label={label}
      stamp={stamp}
      description={
        video.altText ??
        section.subtitle ??
        `Video sambutan ${village.entityLabel} ${village.name}.`
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export async function HeroBanner({ village, section }: SectionProps) {
  const [banners, penduduk, wilayah] = await Promise.all([
    listBanners(village.id, "hero"),
    listStatistics(village.id, "penduduk"),
    listStatistics(village.id, "wilayah"),
  ]);

  const [primary, ...rest] = banners;
  const cover = mediaUrl(primary?.mediaId ?? null);

  const region = [village.district, village.regency].filter(Boolean).join(", ");

  // The village name is set in the accent colour on its own line, so the
  // greeting reads as a masthead rather than a sentence. Falls back to the
  // banner or section title when an operator has written their own headline.
  const customHeading = primary?.title ?? section.title ?? null;

  // Five figures at most: the strip is a glance, not a report, and the full
  // dataset still has its own section further down the page. Zero-valued rows
  // are dropped - a village that has not filled in a figure yet should show
  // one fewer tile, not a tile reading "0".
  const stats = [...penduduk, ...wilayah]
    .filter((entry) => entry.value > 0)
    .slice(0, 5);

  // The hero is dark either way - a photograph when the village has uploaded
  // one, the drawn village office when it has not - so the copy is styled for
  // a dark backdrop unconditionally and never has to switch schemes.

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {cover ? (
          <>
            <img
              src={cover}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            {/* Two overlays: a brand-tinted wash that ties any photograph to
                the tenant's colour, and a left-weighted gradient so the column
                the words sit in is always the darkest part of the frame. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-brand-900/75"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-transparent"
            />
          </>
        ) : (
          <>
            {/* The scene is composed with the building in the right third, which
                works when the headline sits beside it. On a phone the words run
                the full width and `slice` crops the illustration towards its
                centre, so the roof ends up cutting straight through the
                paragraph. Below `sm` the scene is confined to the lower part of
                the hero, where it reads as a backdrop instead. */}
            <VillageScene
              villageName={village.name}
              entityLabel={village.entityLabel}
              className="absolute inset-x-0 bottom-0 -z-20 h-[58%] w-full sm:inset-0 sm:h-full"
            />
            {/* A left-to-right scrim protects text that sits on the left. Full
                width text needs the gradient to run top-to-bottom instead. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/58 to-black/42 sm:bg-gradient-to-r sm:from-black/62 sm:via-black/28 sm:to-transparent"
            />
          </>
        )}

        <Container>
          <div
            className={`hero-in min-w-0 max-w-3xl text-white ${
              stats.length > 0
                ? "pb-28 pt-16 sm:pb-32 sm:pt-24 lg:pt-28"
                : "py-16 sm:py-24 lg:py-28"
            }`}
          >
            {region ? (
              <p className="mb-5 flex min-w-0 max-w-full items-center gap-2 self-start rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-sm sm:inline-flex sm:text-xs">
                <IconPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{region}</span>
              </p>
            ) : null}

            {customHeading ? (
              <h1 className="text-[length:var(--text-display)] font-extrabold leading-[1.03] tracking-[-0.03em]">
                {customHeading}
              </h1>
            ) : (
              <h1 className="font-display leading-[0.98] tracking-[-0.035em]">
                <span className="block text-[length:var(--text-h2)] font-semibold opacity-90">
                  Selamat Datang di {village.entityLabel}
                </span>
                <span className="mt-1 block break-words text-[length:var(--text-display)] font-extrabold uppercase text-brand-accent">
                  {village.name}
                </span>
              </h1>
            )}

            {primary?.subtitle || section.subtitle ? (
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                {primary?.subtitle ?? section.subtitle}
              </p>
            ) : null}

            {/* Equal full-width buttons on a phone; a thumb should not have to
                aim at two differently sized targets. */}
            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <ButtonLink
                href={primary?.linkUrl ?? "/layanan"}
                size="lg"
                variant="onDark"
                className="w-full sm:w-auto"
              >
                {primary?.linkLabel ?? "Ajukan Surat Online"}
                <IconArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink
                href="/profil"
                size="lg"
                variant="ghost"
                // A transparent outline button lands on top of the illustration
                // on a phone, where the roof and the signboard show straight
                // through the label. A dark translucent fill keeps the gold
                // readable without hiding the scene behind it.
                className="w-full border border-brand-accent/70 bg-black/35 text-brand-accent backdrop-blur-[2px] hover:bg-white/10 sm:w-auto sm:bg-transparent sm:backdrop-blur-none"
              >
                Profil Desa
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Figures lifted out of the statistics section and floated across the
          hero boundary. It is the first thing a visitor wants from a village
          site and it gives the fold depth without another dark band. */}
      {stats.length > 0 ? (
        <Container className="relative z-10 -mt-20 sm:-mt-24">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--border)] shadow-[var(--shadow-lg)] sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((entry) => (
              <div
                key={entry.label}
                className="flex min-w-0 items-center gap-3 bg-[var(--surface)] px-4 py-5"
              >
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"
                >
                  <IconUsers className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <dd className="font-display text-xl font-bold leading-none tabular-nums">
                    {formatNumber(entry.value)}
                  </dd>
                  <dt className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    {entry.label}
                  </dt>
                </div>
              </div>
            ))}
          </dl>
        </Container>
      ) : null}

      {/* Secondary hero banners become a highlight strip. It sits outside the
          hero because that section clips its own overflow, which would slice
          the top off any card overlapping its boundary. */}
      {rest.length > 0 ? (
        <Container className={`relative z-10 ${stats.length > 0 ? "mt-6" : "-mt-10"}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 3).map((banner) => (
              <div
                key={banner.id}
                className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)]"
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
                    className="mt-3 inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-brand"
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
                  className="mt-4 inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-brand"
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

export async function QuickMenu({ village, viewer, section }: SectionProps) {
  // The header and footer both run their menus through filterNav; this one did
  // not, so a tile whose module is hidden still rendered - which is how a link
  // to a disabled page reached the homepage - and a tile bound to a staff-only
  // module would have been shown to anonymous visitors.
  const [raw, modules] = await Promise.all([
    getMenu(village.id, "quick"),
    getVillageModules(village.id),
  ]);

  const items = filterNav(raw, viewer, (id) =>
    shouldRender(modules.get(id), { viewer }),
  );
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
                className="inline-block py-0.5 transition-colors hover:text-brand"
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
                      className="inline-block py-0.5 transition-colors hover:text-brand"
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
                    className="inline-block py-0.5 transition-colors hover:text-brand"
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
      <div className="tile-reveal grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
  // Three sources, most explicit first: a video chosen for this section, an
  // embed URL, then the newest video in the gallery. The config route is what
  // makes the section editable - the operator uploads a file in Media and
  // points the section at it, with no deployment involved.
  const configuredId = configString(section.config, "mediaId");
  const chosen = configuredId
    ? await getMediaById(configuredId, village.id)
    : null;

  const [item] = chosen
    ? []
    : await listGalleryItems({ villageId: village.id, kind: "video", limit: 1 });
  const embed = configString(section.config, "embedUrl") || item?.embedUrl;

  const fileId = chosen?.id ?? item?.mediaId ?? null;
  if (!embed && !fileId) return null;

  const posterId = configString(section.config, "posterMediaId");
  const webmId = configString(section.config, "webmMediaId");

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
          /* Controls rather than autoplay: this one sits far down the page, so
             a clip that started itself would be sound and motion the reader
             never asked for. */
          <video
            controls
            preload="metadata"
            poster={mediaUrl(posterId || null) ?? undefined}
            className="aspect-video w-full bg-black"
          >
            <source src={mediaUrl(fileId)!} type="video/mp4" />
            {webmId ? (
              <source src={mediaUrl(webmId)!} type="video/webm" />
            ) : null}
          </video>
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
                  className="inline-block py-0.5 transition-colors hover:text-brand"
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
                  className="inline-block py-0.5 transition-colors hover:text-brand"
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
                className="inline-block py-0.5 transition-colors hover:text-brand"
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
