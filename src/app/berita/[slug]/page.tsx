import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getViewer } from "@/lib/auth";
import { getPostBySlug, incrementPostViews, listPosts } from "@/lib/content";
import { formatDate, stripHtml, truncate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage().catch(() => null);
  if (!village) return {};

  const post = await getPostBySlug(village.id, slug);
  if (!post) return { title: "Tidak ditemukan" };

  const description =
    post.metaDescription ?? truncate(post.excerpt ?? stripHtml(post.body), 160);
  const image = mediaUrl(post.ogMediaId ?? post.coverMediaId);

  return {
    title: post.metaTitle ?? post.title,
    description,
    robots: post.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/berita/${post.slug}` },
    openGraph: {
      title: post.metaTitle ?? post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  const post = await getPostBySlug(village.id, slug);
  if (!post) notFound();

  const moduleId =
    post.type === "news" ? "berita" : post.type === "article" ? "artikel" : "pengumuman";
  if (!shouldRender(modules.get(moduleId), { viewer })) notFound();

  await incrementPostViews(post.id);

  const related = (
    await listPosts({ villageId: village.id, type: post.type, limit: 4 })
  ).filter((p) => p.id !== post.id);

  const locale = `${village.locale}-ID`;
  const showAuthor = shouldRender(modules.get("berita"), { viewer });

  // Schema.org NewsArticle. Emitted as JSON so no user-controlled string can
  // break out of the script element.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: post.authorName
      ? { "@type": "Person", name: post.authorName }
      : { "@type": "Organization", name: `${village.entityLabel} ${village.name}` },
    publisher: {
      "@type": "Organization",
      name: `${village.entityLabel} ${village.name}`,
    },
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        title={post.title}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Berita", href: "/berita" },
          { label: truncate(post.title, 40), href: `/berita/${post.slug}` },
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
          {post.categoryName ? <Badge>{post.categoryName}</Badge> : null}
          <span>{formatDate(post.publishedAt, locale, village.timezone)}</span>
          {showAuthor && post.authorName ? <span>· {post.authorName}</span> : null}
          <span>· {post.viewCount} kali dibaca</span>
        </div>

        {post.coverMediaId ? (
          <Thumb
            src={mediaUrl(post.coverMediaId)}
            alt={post.title}
            className="mt-6 rounded-xl"
          />
        ) : null}

        <div
          className="prose-cms mt-8"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }}
        />
      </article>

      {related.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-14">
          <h2 className="mb-5 text-xl font-bold">Berita Lainnya</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {related.slice(0, 3).map((item) => (
              <Card key={item.id} className="transition hover:border-brand">
                <Link href={`/berita/${item.slug}`}>
                  <Thumb src={mediaUrl(item.coverMediaId)} alt={item.title} />
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold leading-snug">
                    <Link href={`/berita/${item.slug}`} className="hover:text-brand">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {formatDate(item.publishedAt, locale, village.timezone)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
