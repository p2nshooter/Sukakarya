import { describe, expect, it } from "vitest";

import {
  ACCESS_LEVELS,
  MODULE_CATALOG,
  MODULE_BY_ID,
  MODULE_PLACEMENTS,
} from "@/lib/modules/catalog";
import { SECTION_RENDERERS } from "@/components/sections/registry";

describe("module catalogue", () => {
  it("ships exactly 300 modules", () => {
    expect(MODULE_CATALOG).toHaveLength(300);
  });

  it("uses codes 1..300 with no gaps or duplicates", () => {
    const codes = MODULE_CATALOG.map((m) => m.code).sort((a, b) => a - b);
    expect(codes).toEqual(Array.from({ length: 300 }, (_, i) => i + 1));
  });

  it("has unique kebab-case ids", () => {
    const ids = MODULE_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("only uses declared placements and access levels", () => {
    for (const module of MODULE_CATALOG) {
      expect(MODULE_PLACEMENTS).toContain(module.placement);
      expect(ACCESS_LEVELS).toContain(module.defaultAccess);
    }
  });

  it("never marks a module visible while disabled", () => {
    for (const module of MODULE_CATALOG) {
      if (module.defaultVisible) expect(module.defaultEnabled).toBe(true);
    }
  });

  it("defaults admin-placement modules to a privileged access level", () => {
    for (const module of MODULE_CATALOG) {
      if (module.placement === "admin") {
        expect(module.defaultAccess).not.toBe("public");
      }
    }
  });

  it("exposes the same modules through the lookup map", () => {
    expect(MODULE_BY_ID.size).toBe(MODULE_CATALOG.length);
    for (const module of MODULE_CATALOG) {
      expect(MODULE_BY_ID.get(module.id)).toEqual(module);
    }
  });
});

describe("section renderers", () => {
  it("only registers renderers for modules that exist in the catalogue", () => {
    for (const moduleId of Object.keys(SECTION_RENDERERS)) {
      expect(MODULE_BY_ID.has(moduleId)).toBe(true);
    }
  });

  it("never registers a renderer for an admin-only module", () => {
    for (const moduleId of Object.keys(SECTION_RENDERERS)) {
      expect(MODULE_BY_ID.get(moduleId)!.placement).not.toBe("admin");
    }
  });
});
