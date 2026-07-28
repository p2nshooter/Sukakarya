import { cache } from "react";

import { canAccess, type AccessLevel, type Viewer } from "@/lib/access";
import { getDb } from "@/lib/env";
import { MODULE_CATALOG, type ModulePlacement } from "@/lib/modules/catalog";

export type DeviceClass = "all" | "desktop" | "tablet" | "mobile";

export interface ResolvedModule {
  id: string;
  code: number;
  name: string;
  title: string;
  category: string;
  placement: ModulePlacement;
  enabled: boolean;
  visible: boolean;
  accessLevel: AccessLevel;
  device: DeviceClass;
  sortOrder: number;
  publishAt: string | null;
  expireAt: string | null;
  config: Record<string, unknown>;
  isCore: boolean;
}

interface ModuleRow {
  id: string;
  code: number;
  name: string;
  category: string;
  placement: ModulePlacement;
  is_core: number;
  enabled: number | null;
  visible: number | null;
  access_level: AccessLevel | null;
  device: DeviceClass | null;
  sort_order: number | null;
  publish_at: string | null;
  expire_at: string | null;
  title_override: string | null;
  config: string | null;
}

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    // A malformed config must not take the whole page down.
    return {};
  }
}

/**
 * Loads the module state for a village.
 *
 * A village row in `module_settings` overrides the catalogue default; where no
 * row exists the platform default applies. That means provisioning a new
 * village needs no bulk insert - it inherits sensible defaults immediately.
 */
export const getVillageModules = cache(
  async (villageId: string): Promise<Map<string, ResolvedModule>> => {
    const { results } = await getDb()
      .prepare(
        `SELECT m.id, m.code, m.name, m.category, m.placement, m.is_core,
                COALESCE(ms.enabled, m.default_enabled)       AS enabled,
                COALESCE(ms.visible, m.default_visible)       AS visible,
                COALESCE(ms.access_level, m.default_access)   AS access_level,
                COALESCE(ms.device, 'all')                    AS device,
                COALESCE(ms.sort_order, m.default_sort)       AS sort_order,
                ms.publish_at, ms.expire_at, ms.title_override, ms.config
         FROM modules m
         LEFT JOIN module_settings ms
           ON ms.module_id = m.id AND ms.village_id = ?
         ORDER BY sort_order, m.code`,
      )
      .bind(villageId)
      .all<ModuleRow>();

    const map = new Map<string, ResolvedModule>();
    for (const row of results) {
      map.set(row.id, {
        id: row.id,
        code: row.code,
        name: row.name,
        title: row.title_override || row.name,
        category: row.category,
        placement: row.placement,
        enabled: Boolean(row.enabled),
        visible: Boolean(row.visible),
        accessLevel: row.access_level ?? "public",
        device: row.device ?? "all",
        sortOrder: row.sort_order ?? row.code,
        publishAt: row.publish_at,
        expireAt: row.expire_at,
        config: parseConfig(row.config),
        isCore: Boolean(row.is_core),
      });
    }
    return map;
  },
);

/**
 * True when the module's schedule window covers `now`. `publish_at` in the
 * future hides it; `expire_at` in the past hides it. Both are ISO strings in
 * UTC, so lexical comparison is also chronological.
 */
export function isWithinSchedule(
  module: Pick<ResolvedModule, "publishAt" | "expireAt">,
  now: Date = new Date(),
): boolean {
  const iso = now.toISOString();
  if (module.publishAt && module.publishAt > iso) return false;
  if (module.expireAt && module.expireAt <= iso) return false;
  return true;
}

export function matchesDevice(
  module: Pick<ResolvedModule, "device">,
  device: DeviceClass,
): boolean {
  return module.device === "all" || device === "all" || module.device === device;
}

export interface RenderContext {
  viewer: Viewer;
  device?: DeviceClass;
  now?: Date;
}

/**
 * The single gate every public surface goes through. A module renders only when
 * it is enabled, marked visible, inside its schedule window, allowed on the
 * current device, and permitted for the viewer.
 */
export function shouldRender(
  module: ResolvedModule | undefined,
  ctx: RenderContext,
): boolean {
  if (!module) return false;
  if (!module.enabled || !module.visible) return false;
  if (!isWithinSchedule(module, ctx.now)) return false;
  if (!matchesDevice(module, ctx.device ?? "all")) return false;
  return canAccess(ctx.viewer, module.accessLevel);
}

/** Enabled check only - for features that are not rendered sections. */
export function isEnabled(module: ResolvedModule | undefined): boolean {
  return Boolean(module?.enabled);
}

export function modulesByPlacement(
  modules: Map<string, ResolvedModule>,
  placement: ModulePlacement,
  ctx: RenderContext,
): ResolvedModule[] {
  return [...modules.values()]
    .filter((m) => m.placement === placement && shouldRender(m, ctx))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Catalogue size, asserted by the test suite. */
export const MODULE_COUNT = MODULE_CATALOG.length;
