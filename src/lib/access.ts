import { ACCESS_LEVELS, type AccessLevel } from "@/lib/modules/catalog";

export type { AccessLevel };
export { ACCESS_LEVELS };

/** Mutable copy for rendering `<select>` options. */
export const ACCESS_LEVEL_OPTIONS: AccessLevel[] = [...ACCESS_LEVELS];

export function isAccessLevel(value: string): value is AccessLevel {
  return (ACCESS_LEVELS as readonly string[]).includes(value);
}

export const DEVICE_OPTIONS = ["all", "desktop", "tablet", "mobile"] as const;

export function isDevice(
  value: string,
): value is (typeof DEVICE_OPTIONS)[number] {
  return (DEVICE_OPTIONS as readonly string[]).includes(value);
}

/**
 * Ordered from least to most privileged. A viewer satisfies a requirement when
 * their rank is greater than or equal to the required rank.
 */
const RANK: Record<AccessLevel, number> = {
  public: 0,
  authenticated: 1,
  citizen: 2,
  staff: 3,
  admin: 4,
  super_admin: 5,
};

export interface Viewer {
  userId: string | null;
  villageId: string | null;
  /** Highest access level granted by the viewer's roles. */
  level: AccessLevel;
  permissions: ReadonlySet<string>;
}

export const ANONYMOUS: Viewer = {
  userId: null,
  villageId: null,
  level: "public",
  permissions: new Set(),
};

export function canAccess(viewer: Viewer, required: AccessLevel): boolean {
  return RANK[viewer.level] >= RANK[required];
}

export function isStaff(viewer: Viewer): boolean {
  return canAccess(viewer, "staff");
}

export function hasPermission(viewer: Viewer, permission: string): boolean {
  // Super admins bypass the permission table entirely.
  if (viewer.level === "super_admin") return true;
  return viewer.permissions.has(permission);
}

/** Maps a set of role slugs to the single highest access level they grant. */
export function levelFromRoles(roleSlugs: readonly string[]): AccessLevel {
  let level: AccessLevel = "authenticated";
  for (const slug of roleSlugs) {
    const candidate = ROLE_LEVEL[slug];
    if (candidate && RANK[candidate] > RANK[level]) level = candidate;
  }
  return level;
}

export const ROLE_LEVEL: Record<string, AccessLevel> = {
  super_admin: "super_admin",
  admin: "admin",
  kepala_desa: "admin",
  sekretaris_desa: "admin",
  operator: "staff",
  editor: "staff",
  perangkat_desa: "staff",
  warga: "citizen",
};
