import { getDb } from "@/lib/env";

/**
 * Read helpers for public content.
 *
 * Every query is village-scoped and applies the publication window, so a caller
 * cannot accidentally leak a draft or a scheduled item by forgetting a filter.
 */

export interface PostSummary {
  id: string;
  slug: string;
  type: "news" | "article" | "announcement";
  title: string;
  excerpt: string | null;
  coverMediaId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  publishedAt: string | null;
  viewCount: number;
  isFeatured: boolean;
  isPinned: boolean;
}

export interface Post extends PostSummary {
  body: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogMediaId: string | null;
  noindex: boolean;
  updatedAt: string;
}

interface PostRow {
  id: string;
  slug: string;
  type: PostSummary["type"];
  title: string;
  excerpt: string | null;
  body?: string | null;
  cover_media_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  author_name: string | null;
  published_at: string | null;
  view_count: number;
  is_featured: number;
  is_pinned: number;
  meta_title?: string | null;
  meta_description?: string | null;
  og_media_id?: string | null;
  noindex?: number;
  updated_at?: string;
}

function toPostSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    excerpt: row.excerpt,
    coverMediaId: row.cover_media_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    authorName: row.author_name,
    publishedAt: row.published_at,
    viewCount: row.view_count,
    isFeatured: Boolean(row.is_featured),
    isPinned: Boolean(row.is_pinned),
  };
}

const POST_LIST_COLUMNS = `p.id, p.slug, p.type, p.title, p.excerpt,
  p.cover_media_id, c.name AS category_name, c.slug AS category_slug,
  p.author_name, p.published_at, p.view_count, p.is_featured, p.is_pinned`;

export async function listPosts(params: {
  villageId: string;
  type?: PostSummary["type"];
  categorySlug?: string;
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PostSummary[]> {
  const now = new Date().toISOString();
  const limit = Math.min(Math.max(params.limit ?? 9, 1), 60);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions = [
    "p.village_id = ?",
    "p.status = 'published'",
    "p.deleted_at IS NULL",
    "(p.published_at IS NULL OR p.published_at <= ?)",
    "(p.expire_at IS NULL OR p.expire_at > ?)",
  ];
  const binds: unknown[] = [params.villageId, now, now];

  if (params.type) {
    conditions.push("p.type = ?");
    binds.push(params.type);
  }
  if (params.categorySlug) {
    conditions.push("c.slug = ?");
    binds.push(params.categorySlug);
  }
  if (params.featuredOnly) {
    conditions.push("p.is_featured = 1");
  }

  binds.push(limit, offset);

  const { results } = await getDb()
    .prepare(
      `SELECT ${POST_LIST_COLUMNS}
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY p.is_pinned DESC, p.published_at DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...binds)
    .all<PostRow>();

  return results.map(toPostSummary);
}

export async function countPosts(params: {
  villageId: string;
  type?: PostSummary["type"];
}): Promise<number> {
  const now = new Date().toISOString();
  const sql = params.type
    ? `SELECT COUNT(*) AS n FROM posts p
       WHERE p.village_id = ? AND p.type = ?
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND (p.published_at IS NULL OR p.published_at <= ?)`
    : `SELECT COUNT(*) AS n FROM posts p
       WHERE p.village_id = ?
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND (p.published_at IS NULL OR p.published_at <= ?)`;

  const stmt = params.type
    ? getDb().prepare(sql).bind(params.villageId, params.type, now)
    : getDb().prepare(sql).bind(params.villageId, now);

  const row = await stmt.first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getPostBySlug(
  villageId: string,
  slug: string,
): Promise<Post | null> {
  const now = new Date().toISOString();
  const row = await getDb()
    .prepare(
      `SELECT ${POST_LIST_COLUMNS}, p.body, p.meta_title, p.meta_description,
              p.og_media_id, p.noindex, p.updated_at
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.village_id = ? AND p.slug = ?
         AND p.status = 'published' AND p.deleted_at IS NULL
         AND (p.published_at IS NULL OR p.published_at <= ?)
         AND (p.expire_at IS NULL OR p.expire_at > ?)
       LIMIT 1`,
    )
    .bind(villageId, slug, now, now)
    .first<PostRow>();

  if (!row) return null;

  return {
    ...toPostSummary(row),
    body: row.body ?? null,
    metaTitle: row.meta_title ?? null,
    metaDescription: row.meta_description ?? null,
    ogMediaId: row.og_media_id ?? null,
    noindex: Boolean(row.noindex),
    updatedAt: row.updated_at ?? "",
  };
}

/** Fire-and-forget view counter. Failure must never break a page render. */
export async function incrementPostViews(postId: string): Promise<void> {
  try {
    await getDb()
      .prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?")
      .bind(postId)
      .run();
  } catch {
    /* counters are advisory */
  }
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverMediaId: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  organizer: string | null;
  categoryName: string | null;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_media_id: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  organizer: string | null;
  category_name: string | null;
}

function toEvent(row: EventRow): EventSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverMediaId: row.cover_media_id,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: Boolean(row.all_day),
    organizer: row.organizer,
    categoryName: row.category_name,
  };
}

export async function listEvents(params: {
  villageId: string;
  upcomingOnly?: boolean;
  limit?: number;
}): Promise<EventSummary[]> {
  const now = new Date().toISOString();
  const limit = Math.min(Math.max(params.limit ?? 6, 1), 60);

  const conditions = [
    "e.village_id = ?",
    "e.status = 'published'",
    "e.deleted_at IS NULL",
  ];
  const binds: unknown[] = [params.villageId];

  if (params.upcomingOnly) {
    conditions.push("COALESCE(e.ends_at, e.starts_at) >= ?");
    binds.push(now);
  }
  binds.push(limit);

  const { results } = await getDb()
    .prepare(
      `SELECT e.id, e.slug, e.title, e.description, e.cover_media_id, e.location,
              e.starts_at, e.ends_at, e.all_day, e.organizer,
              c.name AS category_name
       FROM events e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY e.starts_at ${params.upcomingOnly ? "ASC" : "DESC"}
       LIMIT ?`,
    )
    .bind(...binds)
    .all<EventRow>();

  return results.map(toEvent);
}

export async function getEventBySlug(
  villageId: string,
  slug: string,
): Promise<EventSummary | null> {
  const row = await getDb()
    .prepare(
      `SELECT e.id, e.slug, e.title, e.description, e.cover_media_id, e.location,
              e.starts_at, e.ends_at, e.all_day, e.organizer,
              c.name AS category_name
       FROM events e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.village_id = ? AND e.slug = ? AND e.status = 'published'
         AND e.deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(villageId, slug)
    .first<EventRow>();

  return row ? toEvent(row) : null;
}

export interface Banner {
  id: string;
  placement: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  mediaId: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  severity: "info" | "success" | "warning" | "danger";
}

export async function listBanners(
  villageId: string,
  placement: string,
): Promise<Banner[]> {
  const now = new Date().toISOString();
  const { results } = await getDb()
    .prepare(
      `SELECT id, placement, title, subtitle, body, media_id, link_url,
              link_label, severity
       FROM banners
       WHERE village_id = ? AND placement = ? AND visible = 1
         AND (publish_at IS NULL OR publish_at <= ?)
         AND (expire_at IS NULL OR expire_at > ?)
       ORDER BY sort_order, created_at DESC`,
    )
    .bind(villageId, placement, now, now)
    .all<{
      id: string;
      placement: string;
      title: string | null;
      subtitle: string | null;
      body: string | null;
      media_id: string | null;
      link_url: string | null;
      link_label: string | null;
      severity: Banner["severity"];
    }>();

  return results.map((r) => ({
    id: r.id,
    placement: r.placement,
    title: r.title,
    subtitle: r.subtitle,
    body: r.body,
    mediaId: r.media_id,
    linkUrl: r.link_url,
    linkLabel: r.link_label,
    severity: r.severity,
  }));
}

export interface StatisticEntry {
  label: string;
  value: number;
  unit: string;
  period: string | null;
}

export async function listStatistics(
  villageId: string,
  dataset: string,
): Promise<StatisticEntry[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT label, value, unit, period FROM statistics
       WHERE village_id = ? AND dataset = ? AND visible = 1
       ORDER BY sort_order, label`,
    )
    .bind(villageId, dataset)
    .all<StatisticEntry>();
  return results;
}

export interface Official {
  id: string;
  fullName: string;
  position: string;
  unit: string;
  photoMediaId: string | null;
  bio: string | null;
}

export async function listOfficials(
  villageId: string,
  unit?: string,
): Promise<Official[]> {
  const sql = unit
    ? `SELECT id, full_name, position, unit, photo_media_id, bio FROM officials
       WHERE village_id = ? AND unit = ? AND visible = 1 ORDER BY sort_order`
    : `SELECT id, full_name, position, unit, photo_media_id, bio FROM officials
       WHERE village_id = ? AND visible = 1 ORDER BY sort_order`;

  const stmt = unit
    ? getDb().prepare(sql).bind(villageId, unit)
    : getDb().prepare(sql).bind(villageId);

  const { results } = await stmt.all<{
    id: string;
    full_name: string;
    position: string;
    unit: string;
    photo_media_id: string | null;
    bio: string | null;
  }>();

  return results.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    position: r.position,
    unit: r.unit,
    photoMediaId: r.photo_media_id,
    bio: r.bio,
  }));
}

export interface ApbdesRow {
  section: "pendapatan" | "belanja" | "pembiayaan";
  category: string;
  item: string;
  budgetAmount: number;
  actualAmount: number;
}

export async function listApbdes(
  villageId: string,
  fiscalYear?: number,
): Promise<{ year: number | null; rows: ApbdesRow[] }> {
  const yearRow = fiscalYear
    ? { y: fiscalYear }
    : await getDb()
        .prepare(
          `SELECT MAX(fiscal_year) AS y FROM apbdes
           WHERE village_id = ? AND status = 'published'`,
        )
        .bind(villageId)
        .first<{ y: number | null }>();

  const year = yearRow?.y ?? null;
  if (!year) return { year: null, rows: [] };

  const { results } = await getDb()
    .prepare(
      `SELECT section, category, item, budget_amount, actual_amount
       FROM apbdes
       WHERE village_id = ? AND fiscal_year = ? AND status = 'published'
       ORDER BY section, sort_order, item`,
    )
    .bind(villageId, year)
    .all<{
      section: ApbdesRow["section"];
      category: string;
      item: string;
      budget_amount: number;
      actual_amount: number;
    }>();

  return {
    year,
    rows: results.map((r) => ({
      section: r.section,
      category: r.category,
      item: r.item,
      budgetAmount: r.budget_amount,
      actualAmount: r.actual_amount,
    })),
  };
}

export interface AlbumSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverMediaId: string | null;
  kind: string;
  itemCount: number;
}

export async function listAlbums(params: {
  villageId: string;
  kind?: string;
  limit?: number;
}): Promise<AlbumSummary[]> {
  const limit = Math.min(Math.max(params.limit ?? 8, 1), 60);
  const conditions = ["a.village_id = ?", "a.status = 'published'", "a.deleted_at IS NULL"];
  const binds: unknown[] = [params.villageId];

  if (params.kind) {
    conditions.push("a.kind = ?");
    binds.push(params.kind);
  }
  binds.push(limit);

  const { results } = await getDb()
    .prepare(
      `SELECT a.id, a.slug, a.title, a.description, a.cover_media_id, a.kind,
              (SELECT COUNT(*) FROM gallery_items gi
               WHERE gi.album_id = a.id AND gi.visible = 1) AS item_count
       FROM albums a
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.sort_order, a.published_at DESC, a.created_at DESC
       LIMIT ?`,
    )
    .bind(...binds)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      cover_media_id: string | null;
      kind: string;
      item_count: number;
    }>();

  return results.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    coverMediaId: r.cover_media_id,
    kind: r.kind,
    itemCount: r.item_count,
  }));
}

export interface GalleryItem {
  id: string;
  title: string | null;
  caption: string | null;
  mediaId: string | null;
  embedUrl: string | null;
  kind: string;
}

export async function listGalleryItems(params: {
  villageId: string;
  albumId?: string;
  kind?: string;
  limit?: number;
}): Promise<GalleryItem[]> {
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 120);
  const conditions = ["gi.village_id = ?", "gi.visible = 1"];
  const binds: unknown[] = [params.villageId];

  if (params.albumId) {
    conditions.push("gi.album_id = ?");
    binds.push(params.albumId);
  }
  if (params.kind) {
    conditions.push("gi.kind = ?");
    binds.push(params.kind);
  }
  binds.push(limit);

  const { results } = await getDb()
    .prepare(
      `SELECT gi.id, gi.title, gi.caption, gi.media_id, gi.embed_url, gi.kind
       FROM gallery_items gi
       WHERE ${conditions.join(" AND ")}
       ORDER BY gi.sort_order, gi.created_at DESC
       LIMIT ?`,
    )
    .bind(...binds)
    .all<{
      id: string;
      title: string | null;
      caption: string | null;
      media_id: string | null;
      embed_url: string | null;
      kind: string;
    }>();

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    caption: r.caption,
    mediaId: r.media_id,
    embedUrl: r.embed_url,
    kind: r.kind,
  }));
}

export interface DownloadItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  mediaId: string | null;
  externalUrl: string | null;
  categoryName: string | null;
}

export async function listDownloads(params: {
  villageId: string;
  limit?: number;
}): Promise<DownloadItem[]> {
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 100);
  const { results } = await getDb()
    .prepare(
      `SELECT d.id, d.slug, d.title, d.description, d.media_id, d.external_url,
              c.name AS category_name
       FROM downloads d
       LEFT JOIN categories c ON c.id = d.category_id
       WHERE d.village_id = ? AND d.status = 'published'
         AND d.deleted_at IS NULL AND d.access_level = 'public'
       ORDER BY d.sort_order, d.created_at DESC
       LIMIT ?`,
    )
    .bind(params.villageId, limit)
    .all<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      media_id: string | null;
      external_url: string | null;
      category_name: string | null;
    }>();

  return results.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    mediaId: r.media_id,
    externalUrl: r.external_url,
    categoryName: r.category_name,
  }));
}

export interface UmkmSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoMediaId: string | null;
  coverMediaId: string | null;
  whatsapp: string | null;
  address: string | null;
  categoryName: string | null;
}

export async function listUmkm(params: {
  villageId: string;
  limit?: number;
}): Promise<UmkmSummary[]> {
  const limit = Math.min(Math.max(params.limit ?? 6, 1), 60);
  const { results } = await getDb()
    .prepare(
      `SELECT u.id, u.slug, u.name, u.description, u.logo_media_id,
              u.cover_media_id, u.whatsapp, u.address, c.name AS category_name
       FROM umkm u
       LEFT JOIN categories c ON c.id = u.category_id
       WHERE u.village_id = ? AND u.status = 'published' AND u.deleted_at IS NULL
       ORDER BY u.is_featured DESC, u.name
       LIMIT ?`,
    )
    .bind(params.villageId, limit)
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      logo_media_id: string | null;
      cover_media_id: string | null;
      whatsapp: string | null;
      address: string | null;
      category_name: string | null;
    }>();

  return results.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    logoMediaId: r.logo_media_id,
    coverMediaId: r.cover_media_id,
    whatsapp: r.whatsapp,
    address: r.address,
    categoryName: r.category_name,
  }));
}

export interface TourismSummary {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  coverMediaId: string | null;
  address: string | null;
  openHours: string | null;
  ticketPrice: number | null;
}

export async function listTourism(params: {
  villageId: string;
  kind?: string;
  limit?: number;
}): Promise<TourismSummary[]> {
  const limit = Math.min(Math.max(params.limit ?? 6, 1), 60);
  const conditions = [
    "village_id = ?",
    "status = 'published'",
    "deleted_at IS NULL",
  ];
  const binds: unknown[] = [params.villageId];

  if (params.kind) {
    conditions.push("kind = ?");
    binds.push(params.kind);
  }
  binds.push(limit);

  const { results } = await getDb()
    .prepare(
      `SELECT id, slug, name, kind, description, cover_media_id, address,
              open_hours, ticket_price
       FROM tourism
       WHERE ${conditions.join(" AND ")}
       ORDER BY is_featured DESC, name
       LIMIT ?`,
    )
    .bind(...binds)
    .all<{
      id: string;
      slug: string;
      name: string;
      kind: string;
      description: string | null;
      cover_media_id: string | null;
      address: string | null;
      open_hours: string | null;
      ticket_price: number | null;
    }>();

  return results.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    description: r.description,
    coverMediaId: r.cover_media_id,
    address: r.address,
    openHours: r.open_hours,
    ticketPrice: r.ticket_price,
  }));
}

export interface PotentialItem {
  id: string;
  sector: string;
  title: string;
  description: string | null;
  coverMediaId: string | null;
  metricLabel: string | null;
  metricValue: string | null;
}

export async function listPotentials(
  villageId: string,
  limit = 8,
): Promise<PotentialItem[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT id, sector, title, description, cover_media_id, metric_label,
              metric_value
       FROM potentials
       WHERE village_id = ? AND visible = 1
       ORDER BY sort_order, title LIMIT ?`,
    )
    .bind(villageId, Math.min(Math.max(limit, 1), 60))
    .all<{
      id: string;
      sector: string;
      title: string;
      description: string | null;
      cover_media_id: string | null;
      metric_label: string | null;
      metric_value: string | null;
    }>();

  return results.map((r) => ({
    id: r.id,
    sector: r.sector,
    title: r.title,
    description: r.description,
    coverMediaId: r.cover_media_id,
    metricLabel: r.metric_label,
    metricValue: r.metric_value,
  }));
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export async function listFaqs(villageId: string, limit = 10): Promise<FaqItem[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT id, question, answer, category FROM faqs
       WHERE village_id = ? AND visible = 1
       ORDER BY sort_order, question LIMIT ?`,
    )
    .bind(villageId, Math.min(Math.max(limit, 1), 100))
    .all<FaqItem>();
  return results;
}

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  requirements: string | null;
  slaDays: number;
  requiresLogin: boolean;
  fee: number;
}

export async function listServices(villageId: string): Promise<ServiceItem[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT id, slug, name, description, requirements, sla_days,
              requires_login, fee
       FROM services
       WHERE village_id = ? AND status = 'published' AND visible = 1
       ORDER BY sort_order, name`,
    )
    .bind(villageId)
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      requirements: string | null;
      sla_days: number;
      requires_login: number;
      fee: number;
    }>();

  return results.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    requirements: r.requirements,
    slaDays: r.sla_days,
    requiresLogin: Boolean(r.requires_login),
    fee: r.fee,
  }));
}

export interface DirectoryEntry {
  id: string;
  type: string;
  name: string;
  description: string | null;
  address: string | null;
  contact: string | null;
}

export async function listDirectory(params: {
  villageId: string;
  type?: string;
  limit?: number;
}): Promise<DirectoryEntry[]> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const sql = params.type
    ? `SELECT id, type, name, description, address, contact FROM directory_entries
       WHERE village_id = ? AND type = ? AND visible = 1
       ORDER BY sort_order, name LIMIT ?`
    : `SELECT id, type, name, description, address, contact FROM directory_entries
       WHERE village_id = ? AND visible = 1
       ORDER BY type, sort_order, name LIMIT ?`;

  const stmt = params.type
    ? getDb().prepare(sql).bind(params.villageId, params.type, limit)
    : getDb().prepare(sql).bind(params.villageId, limit);

  const { results } = await stmt.all<DirectoryEntry>();
  return results;
}

export interface PpidItem {
  id: string;
  classification: string;
  title: string;
  summary: string | null;
  mediaId: string | null;
  period: string | null;
}

export async function listPpid(params: {
  villageId: string;
  classification?: string;
}): Promise<PpidItem[]> {
  const sql = params.classification
    ? `SELECT id, classification, title, summary, media_id, period FROM ppid_items
       WHERE village_id = ? AND classification = ? AND status = 'published'
       ORDER BY sort_order, created_at DESC`
    : `SELECT id, classification, title, summary, media_id, period FROM ppid_items
       WHERE village_id = ? AND status = 'published'
       ORDER BY classification, sort_order, created_at DESC`;

  const stmt = params.classification
    ? getDb().prepare(sql).bind(params.villageId, params.classification)
    : getDb().prepare(sql).bind(params.villageId);

  const { results } = await stmt.all<{
    id: string;
    classification: string;
    title: string;
    summary: string | null;
    media_id: string | null;
    period: string | null;
  }>();

  return results.map((r) => ({
    id: r.id,
    classification: r.classification,
    title: r.title,
    summary: r.summary,
    mediaId: r.media_id,
    period: r.period,
  }));
}

export interface RegulationItem {
  id: string;
  type: string;
  number: string | null;
  year: number | null;
  title: string;
  summary: string | null;
  mediaId: string | null;
}

export async function listRegulations(params: {
  villageId: string;
  type?: string;
  limit?: number;
}): Promise<RegulationItem[]> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const sql = params.type
    ? `SELECT id, type, number, year, title, summary, media_id FROM regulations
       WHERE village_id = ? AND type = ? AND status = 'published'
       ORDER BY year DESC, number DESC LIMIT ?`
    : `SELECT id, type, number, year, title, summary, media_id FROM regulations
       WHERE village_id = ? AND status = 'published'
       ORDER BY type, year DESC LIMIT ?`;

  const stmt = params.type
    ? getDb().prepare(sql).bind(params.villageId, params.type, limit)
    : getDb().prepare(sql).bind(params.villageId, limit);

  const { results } = await stmt.all<{
    id: string;
    type: string;
    number: string | null;
    year: number | null;
    title: string;
    summary: string | null;
    media_id: string | null;
  }>();

  return results.map((r) => ({
    id: r.id,
    type: r.type,
    number: r.number,
    year: r.year,
    title: r.title,
    summary: r.summary,
    mediaId: r.media_id,
  }));
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string | null;
}

export async function listSocialLinks(villageId: string): Promise<SocialLink[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT platform, url, label FROM social_links
       WHERE village_id = ? AND visible = 1 ORDER BY sort_order, platform`,
    )
    .bind(villageId)
    .all<SocialLink>();
  return results;
}
