import { describe, expect, it } from "vitest";
import { samePlace, verifyAgainstVillage } from "@/lib/ktp";
import type { KtpReading } from "@/lib/ktp";
import type { Village } from "@/lib/village";

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

/* -------------------------------------------------------------------------- */

/**
 * The rule these tests exist for: registration is for residents of this
 * village, and a card issued in another regency has to be refused. It is the
 * one decision on the registration screen that cannot be allowed to drift, so
 * it is pinned here rather than left to a browser check nobody runs.
 */

const sukakarya: Village = {
  id: "vil_demo",
  slug: "sukakarya",
  domain: null,
  name: "Sukakarya",
  entityLabel: "Desa",
  district: "Sukakarya",
  regency: "Kabupaten Bekasi",
  province: "Jawa Barat",
  postalCode: "17530",
  country: "ID",
  latitude: null,
  longitude: null,
  mapZoom: 14,
  address: null,
  phone: null,
  whatsapp: null,
  email: null,
  logoMediaId: null,
  faviconMediaId: null,
  primaryColor: "#166534",
  secondaryColor: "#0f172a",
  accentColor: "#f59e0b",
  locale: "id",
  timezone: "Asia/Jakarta",
  status: "active",
};

function card(over: Partial<KtpReading> = {}): KtpReading {
  return {
    name: "WARGA UJI",
    nik: "3216010101900001",
    village: "SUKAKARYA",
    district: "KEC. SUKAKARYA",
    regency: "KAB. BEKASI",
    province: "JAWA BARAT",
    ...over,
  };
}

describe("verifyAgainstVillage", () => {
  it("accepts a card issued in this village", () => {
    const verdict = verifyAgainstVillage(card(), sukakarya);
    expect(verdict.result).toBe("match");
  });

  it("refuses a card from another regency", () => {
    const verdict = verifyAgainstVillage(
      card({ regency: "KAB. KARAWANG", village: "SUKAKARYA" }),
      sukakarya,
    );
    expect(verdict.result).toBe("mismatch");
    // The regency has to be named in the refusal, otherwise the applicant is
    // told no without being told which of the two places was wrong.
    expect(verdict.message).toContain("Kabupaten Bekasi");
  });

  it("refuses a same-named village in the wrong regency", () => {
    // There is more than one Sukakarya in Indonesia. Matching the village name
    // alone would let a resident of another regency straight through, which is
    // exactly what the regency anchor exists to stop.
    const verdict = verifyAgainstVillage(
      card({ village: "SUKAKARYA", regency: "KAB. GARUT" }),
      sukakarya,
    );
    expect(verdict.result).toBe("mismatch");
  });

  it("refuses another village inside the right regency", () => {
    const verdict = verifyAgainstVillage(
      card({ village: "SUKAMAJU" }),
      sukakarya,
    );
    expect(verdict.result).toBe("mismatch");
  });

  it("queues an unreadable card instead of refusing it", () => {
    // A photograph the reader could not parse is not evidence that the person
    // lives elsewhere. It goes to an officer, it does not get turned away.
    for (const reading of [null, card({ nik: null }), card({ nik: "123" })]) {
      expect(verifyAgainstVillage(reading, sukakarya).result).toBe("unreadable");
    }
  });

  it("never reports the NIK back in the message shown to the applicant", () => {
    const verdict = verifyAgainstVillage(
      card({ regency: "KAB. KARAWANG" }),
      sukakarya,
    );
    expect(verdict.message).not.toContain("3216010101900001");
  });

  it("falls back to the village name when the village has no regency set", () => {
    // A village that has not filled in its regency yet must still screen on
    // something, rather than accepting every card in the country.
    const noRegency: Village = { ...sukakarya, regency: null };
    expect(verifyAgainstVillage(card(), noRegency).result).toBe("match");
    expect(
      verifyAgainstVillage(card({ village: "SUKAMAJU" }), noRegency).result,
    ).toBe("mismatch");
  });
});
