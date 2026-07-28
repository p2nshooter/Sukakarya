import { cache } from "react";

import { canAccess, type AccessLevel, type Viewer } from "@/lib/access";
import { getDb } from "@/lib/env";

export interface NavItem {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  target: "_self" | "_blank";
  moduleId: string | null;
  accessLevel: AccessLevel;
  children: NavItem[];
}

interface MenuItemRow {
  id: string;
  parent_id: string | null;
  label: string;
  url: string;
  icon: string | null;
  target: "_self" | "_blank";
  module_id: string | null;
  access_level: AccessLevel;
  sort_order: number;
}

/**
 * Loads a named menu as a two-level tree.
 *
 * Menus live entirely in the database, so a village operator rearranges the
 * navigation from the admin panel and nothing needs to be redeployed.
 */
export const getMenu = cache(
  async (villageId: string, slug: string): Promise<NavItem[]> => {
    const { results } = await getDb()
      .prepare(
        `SELECT mi.id, mi.parent_id, mi.label, mi.url, mi.icon, mi.target,
                mi.module_id, mi.access_level, mi.sort_order
         FROM menu_items mi
         JOIN menus m ON m.id = mi.menu_id
         WHERE m.village_id = ? AND m.slug = ? AND mi.visible = 1
         ORDER BY mi.sort_order, mi.label`,
      )
      .bind(villageId, slug)
      .all<MenuItemRow>();

    const byId = new Map<string, NavItem>();
    for (const row of results) {
      byId.set(row.id, {
        id: row.id,
        label: row.label,
        url: row.url,
        icon: row.icon,
        target: row.target,
        moduleId: row.module_id,
        accessLevel: row.access_level,
        children: [],
      });
    }

    const roots: NavItem[] = [];
    for (const row of results) {
      const node = byId.get(row.id)!;
      const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  },
);

/**
 * Removes entries the viewer may not see, and entries whose backing module is
 * switched off. A parent whose children are all filtered out but which has no
 * destination of its own is dropped too, so no dead dropdowns are rendered.
 */
export function filterNav(
  items: NavItem[],
  viewer: Viewer,
  isModuleVisible: (moduleId: string) => boolean,
): NavItem[] {
  const result: NavItem[] = [];

  for (const item of items) {
    if (!canAccess(viewer, item.accessLevel)) continue;
    if (item.moduleId && !isModuleVisible(item.moduleId)) continue;

    const children = filterNav(item.children, viewer, isModuleVisible);
    const isPlaceholder = item.url === "#" || item.url === "";

    if (isPlaceholder && children.length === 0) continue;

    result.push({ ...item, children });
  }

  return result;
}
