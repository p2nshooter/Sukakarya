import { cache } from "react";
import { headers } from "next/headers";

import { getDb, getDefaultVillageSlug } from "@/lib/env";

export interface Village {
  id: string;
  slug: string;
  domain: string | null;
  name: string;
  entityLabel: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  mapZoom: number;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  locale: string;
  timezone: string;
  status: "active" | "suspended" | "maintenance";
}

interface VillageRow {
  id: string;
  slug: string;
  domain: string | null;
  name: string;
  entity_label: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  map_zoom: number;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_media_id: string | null;
  favicon_media_id: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  locale: string;
  timezone: string;
  status: Village["status"];
}

function toVillage(row: VillageRow): Village {
  return {
    id: row.id,
    slug: row.slug,
    domain: row.domain,
    name: row.name,
    entityLabel: row.entity_label,
    district: row.district,
    regency: row.regency,
    province: row.province,
    postalCode: row.postal_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    mapZoom: row.map_zoom,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    logoMediaId: row.logo_media_id,
    faviconMediaId: row.favicon_media_id,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    locale: row.locale,
    timezone: row.timezone,
    status: row.status,
  };
}

const SELECT_VILLAGE = `
  SELECT id, slug, domain, name, entity_label, district, regency, province,
         postal_code, country, latitude, longitude, map_zoom, address, phone,
         whatsapp, email, logo_media_id, favicon_media_id, primary_color,
         secondary_color, accent_color, locale, timezone, status
  FROM villages
`;

/**
 * Strips the port and any `www.` prefix so that `www.desa.id:8787` and
 * `desa.id` resolve to the same tenant.
 */
export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  return host.trim().toLowerCase().split(":")[0].replace(/^www\./, "");
}

export async function findVillageByHost(host: string): Promise<Village | null> {
  const hostname = normalizeHostname(host);
  if (!hostname) return null;

  const row = await getDb()
    .prepare(`${SELECT_VILLAGE} WHERE domain = ? AND status != 'suspended' LIMIT 1`)
    .bind(hostname)
    .first<VillageRow>();

  return row ? toVillage(row) : null;
}

export async function findVillageBySlug(slug: string): Promise<Village | null> {
  const row = await getDb()
    .prepare(`${SELECT_VILLAGE} WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first<VillageRow>();

  return row ? toVillage(row) : null;
}

/**
 * Resolves the tenant for the current request.
 *
 * Resolution order:
 *   1. hostname matched against `villages.domain` (custom domain per village)
 *   2. the `DEFAULT_VILLAGE_SLUG` deployment variable
 *
 * The application never assumes a specific village anywhere - swapping the
 * variable, or pointing a new domain at the Worker, is all it takes to serve a
 * different one.
 *
 * Wrapped in React's `cache` so a render pass hits D1 once.
 */
export const getCurrentVillage = cache(async (): Promise<Village | null> => {
  const headerList = await headers();
  const host = headerList.get("host");

  const byDomain = await findVillageByHost(host ?? "");
  if (byDomain) return byDomain;

  return findVillageBySlug(getDefaultVillageSlug());
});

/**
 * Same as `getCurrentVillage` but throws when the deployment is not configured
 * yet. Use in routes that cannot render anything meaningful without a tenant.
 */
export async function requireVillage(): Promise<Village> {
  const village = await getCurrentVillage();
  if (!village) {
    throw new Error(
      `No village resolved for this request. Seed a village row and set ` +
        `DEFAULT_VILLAGE_SLUG (currently "${getDefaultVillageSlug()}").`,
    );
  }
  return village;
}

/** Reads namespaced per-village settings as a plain object. */
export async function getVillageSettings(
  villageId: string,
  prefix?: string,
): Promise<Record<string, string>> {
  const sql = prefix
    ? "SELECT key, value FROM village_settings WHERE village_id = ? AND key LIKE ?"
    : "SELECT key, value FROM village_settings WHERE village_id = ?";
  const stmt = prefix
    ? getDb().prepare(sql).bind(villageId, `${prefix}%`)
    : getDb().prepare(sql).bind(villageId);

  const { results } = await stmt.all<{ key: string; value: string | null }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value ?? ""]));
}
