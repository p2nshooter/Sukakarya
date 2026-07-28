import { getDb } from "@/lib/env";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { listPublishedPageSlugs } from "@/lib/page-builder";
import { ANONYMOUS } from "@/lib/access";
import { getCurrentVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

interface Entry {
  loc: string;
  lastmod?: string;
  priority: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sitemap for the tenant serving this hostname.
 *
 * Only routes whose module is publicly visible are listed, so a village that
 * switched off (say) tourism does not advertise a page that 404s.
 */
export async function GET(request: Request) {
  const village = await getCurrentVillage();
  if (!village) {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const modules = await getVillageModules(village.id);
  const visible = (id: string) => shouldRender(modules.get(id), { viewer: ANONYMOUS });

  const entries: Entry[] = [{ loc: "/", priority: "1.0" }];

  const staticRoutes: [moduleId: string, path: string, priority: string][] = [
    ["berita", "/berita", "0.9"],
    ["event", "/event", "0.8"],
    ["galeri-foto", "/galeri", "0.7"],
    ["transparansi", "/transparansi", "0.8"],
    ["ppid", "/ppid", "0.7"],
    ["umkm", "/umkm", "0.7"],
    ["wisata", "/wisata", "0.7"],
    ["download-center", "/download", "0.6"],
    ["direktori", "/direktori", "0.6"],
    ["pelayanan-online", "/layanan", "0.8"],
    ["pengaduan", "/pengaduan", "0.6"],
  ];

  for (const [moduleId, path, priority] of staticRoutes) {
    if (visible(moduleId)) entries.push({ loc: path, priority });
  }

  const db = getDb();
  const now = new Date().toISOString();

  if (visible("berita")) {
    const { results } = await db
      .prepare(
        `SELECT slug, updated_at FROM posts
         WHERE village_id = ? AND status = 'published' AND deleted_at IS NULL
           AND noindex = 0 AND (published_at IS NULL OR published_at <= ?)
         ORDER BY published_at DESC LIMIT 1000`,
      )
      .bind(village.id, now)
      .all<{ slug: string; updated_at: string }>();

    for (const row of results) {
      entries.push({
        loc: `/berita/${row.slug}`,
        lastmod: row.updated_at,
        priority: "0.7",
      });
    }
  }

  if (visible("event")) {
    const { results } = await db
      .prepare(
        `SELECT slug, updated_at FROM events
         WHERE village_id = ? AND status = 'published' AND deleted_at IS NULL
         ORDER BY starts_at DESC LIMIT 500`,
      )
      .bind(village.id)
      .all<{ slug: string; updated_at: string }>();

    for (const row of results) {
      entries.push({
        loc: `/event/${row.slug}`,
        lastmod: row.updated_at,
        priority: "0.6",
      });
    }
  }

  for (const page of await listPublishedPageSlugs(village.id)) {
    entries.push({
      loc: `/${page.slug}`,
      lastmod: page.updatedAt,
      priority: "0.6",
    });
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (entry) =>
          `  <url><loc>${escapeXml(origin + entry.loc)}</loc>` +
          (entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "") +
          `<priority>${entry.priority}</priority></url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
