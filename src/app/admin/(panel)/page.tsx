import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/env";
import { getVillageModules } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

interface Counts {
  posts: number;
  events: number;
  media: number;
  complaints: number;
  letters: number;
}

async function getCounts(villageId: string): Promise<Counts> {
  const db = getDb();
  const [posts, events, media, complaints, letters] = await db.batch<{ n: number }>([
    db
      .prepare("SELECT COUNT(*) AS n FROM posts WHERE village_id = ? AND deleted_at IS NULL")
      .bind(villageId),
    db
      .prepare("SELECT COUNT(*) AS n FROM events WHERE village_id = ? AND deleted_at IS NULL")
      .bind(villageId),
    db
      .prepare("SELECT COUNT(*) AS n FROM media WHERE village_id = ? AND deleted_at IS NULL")
      .bind(villageId),
    db
      .prepare("SELECT COUNT(*) AS n FROM complaints WHERE village_id = ? AND status != 'resolved'")
      .bind(villageId),
    db
      .prepare("SELECT COUNT(*) AS n FROM letter_requests WHERE village_id = ? AND status IN ('submitted','in_review')")
      .bind(villageId),
  ]);

  return {
    posts: posts.results[0]?.n ?? 0,
    events: events.results[0]?.n ?? 0,
    media: media.results[0]?.n ?? 0,
    complaints: complaints.results[0]?.n ?? 0,
    letters: letters.results[0]?.n ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const [counts, modules] = await Promise.all([
    getCounts(village.id),
    getVillageModules(village.id),
  ]);

  const all = [...modules.values()];
  const activeCount = all.filter((m) => m.enabled).length;
  const visibleCount = all.filter((m) => m.enabled && m.visible).length;

  const cards = [
    { label: "Berita & Artikel", value: counts.posts, href: "/admin/berita" },
    { label: "Event", value: counts.events, href: "/admin/berita" },
    { label: "Berkas Media", value: counts.media, href: "/admin/media" },
    { label: "Pengaduan Terbuka", value: counts.complaints, href: "/admin/pengaduan" },
    { label: "Surat Menunggu", value: counts.letters, href: "/admin/surat" },
    { label: "Modul Aktif", value: `${activeCount}/${all.length}`, href: "/admin/modul" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {visibleCount} modul tampil di situs publik dari {all.length} modul terpasang.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-[var(--border)] p-5 transition hover:border-brand"
          >
            <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Akses Anda</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Level akses: <strong>{viewer.level}</strong>
          {viewer.permissions.size > 0
            ? ` · ${viewer.permissions.size} izin granular`
            : ""}
        </p>
      </section>
    </div>
  );
}
