import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { listEvents } from "@/lib/content";
import { formatDateTime, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Event & Agenda" };

export default async function EventIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ arsip?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("event"), { viewer })) notFound();

  const showArchive = params.arsip === "1";
  const events = await listEvents({
    villageId: village.id,
    upcomingOnly: !showArchive,
    limit: 30,
  });

  const locale = `${village.locale}-ID`;

  return (
    <SiteShell>
      <PageHeader
        title="Event & Agenda"
        description={`Kegiatan dan agenda ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Event", href: "/event" },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav aria-label="Filter event" className="mb-6 flex gap-2">
          <Link
            href="/event"
            aria-current={!showArchive ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              !showArchive
                ? "border-brand bg-brand text-white"
                : "border-[var(--border)] hover:border-brand"
            }`}
          >
            Mendatang
          </Link>
          <Link
            href="/event?arsip=1"
            aria-current={showArchive ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              showArchive
                ? "border-brand bg-brand text-white"
                : "border-[var(--border)] hover:border-brand"
            }`}
          >
            Arsip
          </Link>
        </nav>

        {events.length === 0 ? (
          <EmptyState title="Belum ada event." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="flex flex-col transition hover:border-brand">
                <Link href={`/event/${event.slug}`}>
                  <Thumb src={mediaUrl(event.coverMediaId)} alt={event.title} />
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-semibold leading-snug">
                    <Link href={`/event/${event.slug}`} className="hover:text-brand">
                      {event.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-brand">
                    {formatDateTime(event.startsAt, locale, village.timezone)}
                  </p>
                  {event.location ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {event.location}
                    </p>
                  ) : null}
                  <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                    {truncate(event.description, 110)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
