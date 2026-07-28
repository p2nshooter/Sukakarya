import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { countPosts, listPosts, type PostSummary } from "@/lib/content";
import { formatDate, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

const PER_PAGE = 9;

const TYPE_LABEL: Record<string, { title: string; module: string }> = {
  news: { title: "Berita", module: "berita" },
  article: { title: "Artikel", module: "artikel" },
  announcement: { title: "Pengumuman", module: "pengumuman" },
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Berita" };
}

export default async function BeritaIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipe?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  const type = (params.tipe ?? "news") as PostSummary["type"];
  const meta = TYPE_LABEL[type];
  if (!meta) notFound();

  if (!shouldRender(modules.get(meta.module), { viewer })) notFound();

  const page = Math.max(Number(params.page ?? "1") || 1, 1);
  const [posts, total] = await Promise.all([
    listPosts({
      villageId: village.id,
      type,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }),
    countPosts({ villageId: village.id, type }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PER_PAGE), 1);
  const locale = `${village.locale}-ID`;

  return (
    <SiteShell>
      <PageHeader
        title={meta.title}
        description={`Informasi terbaru dari ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: meta.title, href: `/berita?tipe=${type}` },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav aria-label="Jenis konten" className="mb-6 flex flex-wrap gap-2">
          {Object.entries(TYPE_LABEL).map(([key, value]) =>
            shouldRender(modules.get(value.module), { viewer }) ? (
              <Link
                key={key}
                href={`/berita?tipe=${key}`}
                aria-current={key === type ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  key === type
                    ? "border-brand bg-brand text-white"
                    : "border-[var(--border)] hover:border-brand"
                }`}
              >
                {value.title}
              </Link>
            ) : null,
          )}
        </nav>

        {posts.length === 0 ? (
          <EmptyState title={`Belum ada ${meta.title.toLowerCase()}.`} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card key={post.id} className="flex flex-col transition hover:border-brand">
                <Link href={`/berita/${post.slug}`}>
                  <Thumb src={mediaUrl(post.coverMediaId)} alt={post.title} />
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  {post.categoryName ? <Badge>{post.categoryName}</Badge> : null}
                  <h2 className="mt-2 font-semibold leading-snug">
                    <Link href={`/berita/${post.slug}`} className="hover:text-brand">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">
                    {truncate(post.excerpt, 130)}
                  </p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    {formatDate(post.publishedAt, locale, village.timezone)}
                    {post.authorName ? ` · ${post.authorName}` : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Navigasi halaman" className="mt-10 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/berita?tipe=${type}&page=${n}`}
                aria-current={n === page ? "page" : undefined}
                className={`rounded-md border px-3.5 py-2 text-sm ${
                  n === page
                    ? "border-brand bg-brand text-white"
                    : "border-[var(--border)] hover:border-brand"
                }`}
              >
                {n}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </SiteShell>
  );
}
