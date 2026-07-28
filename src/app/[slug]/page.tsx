import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { canAccess, isAccessLevel } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { truncate, stripHtml } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getCmsPage, getPageSections } from "@/lib/page-builder";
import { getVillageModules } from "@/lib/modules/registry";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireVillage } from "@/lib/village";

import { SectionList } from "@/components/section-list";
import { SiteShell } from "@/components/site-shell";
import { PageHeader, Thumb } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Catch-all for CMS pages.
 *
 * Static routes (`/berita`, `/event`, …) take precedence in Next's router, so
 * this only handles slugs an operator created in the admin panel: profil,
 * sejarah, visi-misi, struktur organisasi and anything else they add later.
 *
 * A page can carry both a rich-text body and its own ordered sections, so an
 * operator can, for example, put a text introduction above a gallery block.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage().catch(() => null);
  if (!village) return {};

  const page = await getCmsPage(village.id, slug);
  if (!page) return { title: "Tidak ditemukan" };

  const description =
    page.metaDescription ?? truncate(page.excerpt ?? stripHtml(page.body), 160);
  const image = mediaUrl(page.ogMediaId ?? page.coverMediaId);

  return {
    title: page.metaTitle ?? page.title,
    description,
    robots: page.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.metaTitle ?? page.title,
      description,
      type: "article",
      images: image ? [image] : undefined,
    },
  };
}

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const village = await requireVillage();
  const viewer = await getViewer();

  const page = await getCmsPage(village.id, slug);
  if (!page) notFound();

  const required = isAccessLevel(page.accessLevel) ? page.accessLevel : "public";
  if (!canAccess(viewer, required)) notFound();

  const [modules, sections] = await Promise.all([
    getVillageModules(village.id),
    getPageSections(village.id, page.slug),
  ]);

  return (
    <SiteShell>
      <PageHeader
        title={page.title}
        description={page.excerpt}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: page.title, href: `/${page.slug}` },
        ]}
      />

      {page.coverMediaId ? (
        <div className="mx-auto max-w-4xl px-4 pt-8">
          <Thumb
            src={mediaUrl(page.coverMediaId)}
            alt={page.title}
            className="rounded-xl"
          />
        </div>
      ) : null}

      {page.body ? (
        <article className="mx-auto max-w-3xl px-4 py-10">
          <div
            className="prose-cms"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }}
          />
        </article>
      ) : null}

      <SectionList
        sections={sections}
        village={village}
        viewer={viewer}
        modules={modules}
      />
    </SiteShell>
  );
}
