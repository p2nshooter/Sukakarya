import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getEventBySlug } from "@/lib/content";
import { formatDateTime, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage().catch(() => null);
  if (!village) return {};

  const event = await getEventBySlug(village.id, slug);
  if (!event) return { title: "Tidak ditemukan" };

  return {
    title: event.title,
    description: truncate(event.description, 160),
    alternates: { canonical: `/event/${event.slug}` },
    openGraph: {
      title: event.title,
      description: truncate(event.description, 160),
      type: "article",
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();
  const event = await getEventBySlug(village.id, slug);
  if (!event) notFound();

  const locale = `${village.locale}-ID`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    location: event.location
      ? { "@type": "Place", name: event.location }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: event.organizer ?? `${village.entityLabel} ${village.name}`,
    },
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        title={event.title}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Event", href: "/event" },
          { label: truncate(event.title, 40), href: `/event/${event.slug}` },
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-10">
        {event.coverMediaId ? (
          <Thumb
            src={mediaUrl(event.coverMediaId)}
            alt={event.title}
            className="mb-8 rounded-xl"
          />
        ) : null}

        <Card className="mb-8 grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              Waktu
            </p>
            <p className="mt-1 font-medium">
              {formatDateTime(event.startsAt, locale, village.timezone)}
            </p>
            {event.endsAt ? (
              <p className="text-sm text-[var(--text-muted)]">
                s/d {formatDateTime(event.endsAt, locale, village.timezone)}
              </p>
            ) : null}
          </div>
          {event.location ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Lokasi
              </p>
              <p className="mt-1 font-medium">{event.location}</p>
            </div>
          ) : null}
          {event.organizer ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Penyelenggara
              </p>
              <p className="mt-1 font-medium">{event.organizer}</p>
            </div>
          ) : null}
        </Card>

        <div
          className="prose-cms"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
        />
      </article>
    </SiteShell>
  );
}
