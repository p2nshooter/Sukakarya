import { describe, expect, it } from "vitest";
import { samePlace } from "@/lib/ktp";

describe("samePlace", () => {
  it("ignores the administrative prefix a KTP prints", () => {
    expect(samePlace("KAB. BEKASI", "Bekasi")).toBe(true);
    expect(samePlace("KABUPATEN BEKASI", "Bekasi")).toBe(true);
    expect(samePlace("DESA SUKAKARYA", "Sukakarya")).toBe(true);
    expect(samePlace("KEC. LURAGUNG", "Luragung")).toBe(true);
  });

  it("still separates two different places", () => {
    expect(samePlace("KAB. BEKASI", "Karawang")).toBe(false);
    expect(samePlace("DESA SUKAMAJU", "Sukakarya")).toBe(false);
  });

  it("treats a missing side as no match rather than a match", () => {
    expect(samePlace(null, "Bekasi")).toBe(false);
    expect(samePlace("Bekasi", null)).toBe(false);
    expect(samePlace("", "")).toBe(false);
  });

  it("does not let a stripped-to-nothing name match everything", () => {
    // "KAB." normalises to the empty string; without the length guard it would
    // equal any other name that also normalised away.
    expect(samePlace("KAB.", "KEC.")).toBe(false);
  });
});
