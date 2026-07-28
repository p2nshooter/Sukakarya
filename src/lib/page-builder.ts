import { cache } from "react";

import { getDb } from "@/lib/env";
import type { PageSection } from "@/components/sections/types";

interface SectionRow {
  id: string;
  module_id: string;
  title: string | null;
  subtitle: string | null;
  variant: string;
  config: string;
  sort_order: number;
}

/**
 * Loads the ordered section list for a page.
 *
 * A village with no rows for a page gets an empty layout rather than a
 * hardcoded fallback: the seed provisions the default homepage, and from then
 * on the layout is entirely the operator's.
 */
export const getPageSections = cache(
  async (villageId: string, pageSlug = "home"): Promise<PageSection[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT id, module_id, title, subtitle, variant, config, sort_order
         FROM page_sections
         WHERE village_id = ? AND page_slug = ? AND visible = 1
         ORDER BY sort_order, id`,
      )
      .bind(villageId, pageSlug)
      .all<SectionRow>();

    return results.map((row) => {
      let config: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(row.config);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          config = parsed as Record<string, unknown>;
        }
      } catch {
        // A broken config on one section must not blank the whole page.
      }

      return {
        id: row.id,
        moduleId: row.module_id,
        title: row.title,
        subtitle: row.subtitle,
        variant: row.variant,
        config,
        sortOrder: row.sort_order,
      };
    });
  },
);

export interface AdminPageSection extends PageSection {
  visible: boolean;
}

/**
 * Admin variant of `getPageSections`: returns hidden sections too, so an
 * operator can see and re-enable what they switched off.
 */
export async function getPageSectionsForAdmin(
  villageId: string,
  pageSlug = "home",
): Promise<AdminPageSection[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT id, module_id, title, subtitle, variant, config, sort_order, visible
       FROM page_sections
       WHERE village_id = ? AND page_slug = ?
       ORDER BY sort_order, id`,
    )
    .bind(villageId, pageSlug)
    .all<SectionRow & { visible: number }>();

  return results.map((row) => {
    let config: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(row.config);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>;
      }
    } catch {
      /* a broken config must not hide the row from the operator */
    }

    return {
      id: row.id,
      moduleId: row.module_id,
      title: row.title,
      subtitle: row.subtitle,
      variant: row.variant,
      config,
      sortOrder: row.sort_order,
      visible: Boolean(row.visible),
    };
  });
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  template: string;
  coverMediaId: string | null;
  accessLevel: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogMediaId: string | null;
  noindex: boolean;
  updatedAt: string;
}

export async function getCmsPage(
  villageId: string,
  slug: string,
): Promise<CmsPage | null> {
  const now = new Date().toISOString();
  const row = await getDb()
    .prepare(
      `SELECT id, slug, title, excerpt, body, template, cover_media_id,
              access_level, meta_title, meta_description, og_media_id, noindex,
              updated_at
       FROM pages
       WHERE village_id = ? AND slug = ? AND status = 'published'
         AND deleted_at IS NULL
         AND (published_at IS NULL OR published_at <= ?)
       LIMIT 1`,
    )
    .bind(villageId, slug, now)
    .first<{
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      body: string | null;
      template: string;
      cover_media_id: string | null;
      access_level: string;
      meta_title: string | null;
      meta_description: string | null;
      og_media_id: string | null;
      noindex: number;
      updated_at: string;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    template: row.template,
    coverMediaId: row.cover_media_id,
    accessLevel: row.access_level,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    ogMediaId: row.og_media_id,
    noindex: Boolean(row.noindex),
    updatedAt: row.updated_at,
  };
}

/** Slugs of all published pages, for the sitemap. */
export async function listPublishedPageSlugs(
  villageId: string,
): Promise<{ slug: string; updatedAt: string }[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT slug, updated_at FROM pages
       WHERE village_id = ? AND status = 'published' AND deleted_at IS NULL
         AND noindex = 0
       ORDER BY sort_order, slug`,
    )
    .bind(villageId)
    .all<{ slug: string; updated_at: string }>();

  return results.map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}
