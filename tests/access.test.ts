import { describe, expect, it } from "vitest";

import {
  ANONYMOUS,
  canAccess,
  hasPermission,
  isAccessLevel,
  isDevice,
  levelFromRoles,
  type Viewer,
} from "@/lib/access";
import {
  isWithinSchedule,
  matchesDevice,
  shouldRender,
  type ResolvedModule,
} from "@/lib/modules/registry";

function viewer(partial: Partial<Viewer> = {}): Viewer {
  return {
    userId: "usr_1",
    villageId: "vil_1",
    level: "citizen",
    permissions: new Set(),
    ...partial,
  };
}

function module(partial: Partial<ResolvedModule> = {}): ResolvedModule {
  return {
    id: "berita",
    code: 24,
    name: "Berita",
    title: "Berita",
    category: "berita",
    placement: "page",
    enabled: true,
    visible: true,
    accessLevel: "public",
    device: "all",
    sortOrder: 0,
    publishAt: null,
    expireAt: null,
    config: {},
    isCore: false,
    ...partial,
  };
}

describe("access levels", () => {
  it("treats anonymous as public-only", () => {
    expect(canAccess(ANONYMOUS, "public")).toBe(true);
    expect(canAccess(ANONYMOUS, "authenticated")).toBe(false);
    expect(canAccess(ANONYMOUS, "admin")).toBe(false);
  });

  it("grants everything at or below the viewer's rank", () => {
    const admin = viewer({ level: "admin" });
    expect(canAccess(admin, "public")).toBe(true);
    expect(canAccess(admin, "staff")).toBe(true);
    expect(canAccess(admin, "admin")).toBe(true);
    expect(canAccess(admin, "super_admin")).toBe(false);
  });

  it("takes the highest level across a viewer's roles", () => {
    expect(levelFromRoles(["warga"])).toBe("citizen");
    expect(levelFromRoles(["warga", "operator"])).toBe("staff");
    expect(levelFromRoles(["operator", "admin"])).toBe("admin");
    expect(levelFromRoles(["super_admin", "warga"])).toBe("super_admin");
  });

  it("ignores unknown role slugs rather than escalating", () => {
    expect(levelFromRoles(["tidak_dikenal"])).toBe("authenticated");
  });

  it("lets super admins bypass the permission table", () => {
    expect(hasPermission(viewer({ level: "super_admin" }), "apa.saja")).toBe(true);
    expect(hasPermission(viewer({ level: "admin" }), "apa.saja")).toBe(false);
    expect(
      hasPermission(
        viewer({ level: "admin", permissions: new Set(["news.write"]) }),
        "news.write",
      ),
    ).toBe(true);
  });

  it("validates enum inputs coming from forms", () => {
    expect(isAccessLevel("staff")).toBe(true);
    expect(isAccessLevel("root")).toBe(false);
    expect(isDevice("mobile")).toBe(true);
    expect(isDevice("watch")).toBe(false);
  });
});

describe("module render gate", () => {
  const now = new Date("2026-06-15T00:00:00.000Z");

  it("renders an enabled, visible, public module", () => {
    expect(shouldRender(module(), { viewer: ANONYMOUS, now })).toBe(true);
  });

  it("hides a disabled or invisible module", () => {
    expect(shouldRender(module({ enabled: false }), { viewer: ANONYMOUS, now })).toBe(false);
    expect(shouldRender(module({ visible: false }), { viewer: ANONYMOUS, now })).toBe(false);
  });

  it("hides a module the viewer may not see", () => {
    expect(
      shouldRender(module({ accessLevel: "staff" }), { viewer: ANONYMOUS, now }),
    ).toBe(false);
    expect(
      shouldRender(module({ accessLevel: "staff" }), {
        viewer: viewer({ level: "staff" }),
        now,
      }),
    ).toBe(true);
  });

  it("returns false for an unknown module id", () => {
    expect(shouldRender(undefined, { viewer: ANONYMOUS, now })).toBe(false);
  });

  it("respects the publish window", () => {
    expect(
      isWithinSchedule({ publishAt: "2026-07-01T00:00:00.000Z", expireAt: null }, now),
    ).toBe(false);
    expect(
      isWithinSchedule({ publishAt: "2026-01-01T00:00:00.000Z", expireAt: null }, now),
    ).toBe(true);
    expect(
      isWithinSchedule({ publishAt: null, expireAt: "2026-01-01T00:00:00.000Z" }, now),
    ).toBe(false);
    expect(isWithinSchedule({ publishAt: null, expireAt: null }, now)).toBe(true);
  });

  it("treats an expiry exactly at now as expired", () => {
    expect(
      isWithinSchedule({ publishAt: null, expireAt: now.toISOString() }, now),
    ).toBe(false);
  });

  it("matches device targeting", () => {
    expect(matchesDevice({ device: "all" }, "mobile")).toBe(true);
    expect(matchesDevice({ device: "mobile" }, "mobile")).toBe(true);
    expect(matchesDevice({ device: "desktop" }, "mobile")).toBe(false);
  });
});
