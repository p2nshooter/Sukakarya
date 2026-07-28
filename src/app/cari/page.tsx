import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/env";
import { formatDate, truncate } from "@/lib/format";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pencarian" };

interface SearchHit {
  kind: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

/**
 * Cross-content search over published rows.
 *
 * D1 has no full-text index configured here, so this is a bounded LIKE scan
 * with an escaped pattern. Adequate for a village-sized corpus; if a tenant
 * outgrows it, the query is the only thing that needs replacing.
 */
async function search(villageId: string, query: string): Promise<SearchHit[]> {
  // Escape LIKE wildcards so a user typing "%" does not match everything.
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const now = new Date().toISOString();

  const { results } = await getDb()
    .prepare(
      `SELECT 'berita' AS kind, slug, title, excerpt, published_at
       FROM posts
       WHERE village_id = ?1 AND status = 'published' AND deleted_at IS NULL
         AND (published_at IS NULL OR published_at <= ?2)
         AND (title LIKE ?3 ESCAPE '\\' OR excerpt LIKE ?3 ESCAPE '\\')
       UNION ALL
       SELECT 'event' AS kind, slug, title, description AS excerpt, starts_at
       FROM events
       WHERE village_id = ?1 AND status = 'published' AND deleted_at IS NULL
         AND (title LIKE ?3 ESCAPE '\\' OR description LIKE ?3 ESCAPE '\\')
       UNION ALL
       SELECT 'halaman' AS kind, slug, title, excerpt, published_at
       FROM pages
       WHERE village_id = ?1 AND status = 'published' AND deleted_at IS NULL
         AND (title LIKE ?3 ESCAPE '\\' OR excerpt LIKE ?3 ESCAPE '\\')
       ORDER BY published_at DESC
       LIMIT 40`,
    )
    .bind(villageId, now, pattern)
    .all<SearchHit>();

  return results;
}

const HREF_PREFIX: Record<string, string> = {
  berita: "/berita/",
  event: "/event/",
  halaman: "/",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("search"), { viewer })) notFound();

  const query = (params.q ?? "").trim();
  const hits = query.length >= 2 ? await search(village.id, query) : [];
  const locale = `${village.locale}-ID`;

  return (
    <SiteShell>
      <PageHeader
        title="Pencarian"
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Pencarian", href: "/cari" },
        ]}
      />

      <div className="mx-auto max-w-3xl px-4 py-10">
        <form role="search" className="flex flex-wrap gap-3">
          <label htmlFor="q" className="sr-only">
            Kata kunci
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Cari berita, event atau halaman…"
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Cari
          </button>
        </form>

        {query.length > 0 && query.length < 2 ? (
          <p className="mt-6 text-sm text-[var(--text-muted)]">
            Masukkan minimal 2 karakter.
          </p>
        ) : null}

        {query.length >= 2 ? (
          <div className="mt-8">
            <p className="text-sm text-[var(--text-muted)]">
              {hits.length} hasil untuk “{query}”.
            </p>

            {hits.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Tidak ada hasil yang cocok." />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.slug}`}>
                    <Card className="p-4">
                      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        {hit.kind}
                      </p>
                      <h2 className="mt-1 font-semibold">
                        <Link
                          href={`${HREF_PREFIX[hit.kind] ?? "/"}${hit.slug}`}
                          className="hover:text-brand"
                        >
                          {hit.title}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {truncate(hit.excerpt, 150)}
                      </p>
                      {hit.published_at ? (
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          {formatDate(hit.published_at, locale, village.timezone)}
                        </p>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
