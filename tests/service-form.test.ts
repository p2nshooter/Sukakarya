import { describe, expect, it } from "vitest";

import {
  BASE_FIELDS,
  LETTER_PIPELINE,
  LETTER_STATUS,
  parseFormSchema,
  validateSubmission,
} from "@/lib/service-form";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

describe("parseFormSchema", () => {
  it("reads a well-formed schema", () => {
    const fields = parseFormSchema(
      JSON.stringify([
        { name: "keperluan", label: "Keperluan", type: "text", required: true },
        {
          name: "jenis",
          label: "Jenis",
          type: "select",
          options: ["A", "B"],
        },
      ]),
    );

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({ name: "keperluan", required: true });
    expect(fields[1].options).toEqual(["A", "B"]);
  });

  it("returns nothing for absent or unparseable input rather than throwing", () => {
    // A broken schema must not be able to take a service page down.
    expect(parseFormSchema(null)).toEqual([]);
    expect(parseFormSchema("")).toEqual([]);
    expect(parseFormSchema("{not json")).toEqual([]);
    expect(parseFormSchema('{"a":1}')).toEqual([]);
  });

  it("drops entries whose name could not be a safe form key", () => {
    const fields = parseFormSchema(
      JSON.stringify([
        { name: "9lead", label: "Digit first" },
        { name: "has space", label: "Space" },
        { name: "has-dash", label: "Dash" },
        { name: "__proto__", label: "Prototype" },
        { name: "ok_one", label: "Fine" },
      ]),
    );

    expect(fields.map((f) => f.name)).toEqual(["ok_one"]);
  });

  it("refuses names that would collide with the base fields", () => {
    const fields = parseFormSchema(
      JSON.stringify([
        { name: "applicantName", label: "Impostor" },
        { name: "contact", label: "Impostor" },
        { name: "keperluan", label: "Fine" },
      ]),
    );

    expect(fields.map((f) => f.name)).toEqual(["keperluan"]);
  });

  it("drops duplicates, keeping the first definition", () => {
    const fields = parseFormSchema(
      JSON.stringify([
        { name: "a", label: "First" },
        { name: "a", label: "Second" },
      ]),
    );

    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe("First");
  });

  it("degrades an optionless select to text instead of rendering an empty dropdown", () => {
    const [field] = parseFormSchema(
      JSON.stringify([{ name: "x", label: "X", type: "select", options: [] }]),
    );

    expect(field.type).toBe("text");
  });

  it("falls back to text for an unknown type", () => {
    const [field] = parseFormSchema(
      JSON.stringify([{ name: "x", label: "X", type: "file" }]),
    );

    expect(field.type).toBe("text");
  });

  it("caps the number of fields", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      name: `f${i}`,
      label: `F${i}`,
    }));

    expect(parseFormSchema(JSON.stringify(many))).toHaveLength(40);
  });
});

describe("validateSubmission", () => {
  const fields = parseFormSchema(
    JSON.stringify([
      { name: "keperluan", label: "Keperluan", type: "text", required: true },
      { name: "jumlah", label: "Jumlah", type: "number" },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "surel", label: "Surel", type: "email" },
      { name: "telepon", label: "Telepon", type: "tel" },
      { name: "jenis", label: "Jenis", type: "select", options: ["A", "B"] },
      { name: "catatan", label: "Catatan", type: "textarea", maxLength: 10 },
    ]),
  );

  it("accepts a complete, valid submission", () => {
    const { errors, values } = validateSubmission(
      fields,
      form({
        keperluan: "Perbankan",
        jumlah: "12",
        tanggal: "2026-01-31",
        surel: "warga@example.com",
        telepon: "0812-3456-7890",
        jenis: "A",
        catatan: "singkat",
      }),
    );

    expect(errors).toEqual({});
    expect(values.keperluan).toBe("Perbankan");
  });

  it("reports a missing required field", () => {
    const { errors } = validateSubmission(fields, form({}));
    expect(errors.keperluan).toContain("wajib diisi");
  });

  it("treats whitespace as empty for a required field", () => {
    const { errors } = validateSubmission(fields, form({ keperluan: "   " }));
    expect(errors.keperluan).toBeDefined();
  });

  it("leaves optional fields alone when blank", () => {
    const { errors } = validateSubmission(fields, form({ keperluan: "X" }));
    expect(errors).toEqual({});
  });

  it("rejects malformed values per type", () => {
    const { errors } = validateSubmission(
      fields,
      form({
        keperluan: "X",
        jumlah: "dua belas",
        tanggal: "31 Januari",
        surel: "bukan-email",
        telepon: "abc",
      }),
    );

    expect(Object.keys(errors).sort()).toEqual([
      "jumlah",
      "surel",
      "tanggal",
      "telepon",
    ]);
  });

  it("rejects a select value outside its option list", () => {
    // The dropdown is only a hint; the server decides what is acceptable.
    const { errors } = validateSubmission(
      fields,
      form({ keperluan: "X", jenis: "Z" }),
    );

    expect(errors.jenis).toBeDefined();
  });

  it("truncates values to the declared maximum length", () => {
    const { values } = validateSubmission(
      fields,
      form({ keperluan: "X", catatan: "jauh melebihi batas sepuluh" }),
    );

    expect(values.catatan).toHaveLength(10);
  });

  it("returns the submitted values alongside errors so the form can be redrawn", () => {
    const { values } = validateSubmission(
      fields,
      form({ keperluan: "", jumlah: "7" }),
    );

    expect(values.jumlah).toBe("7");
  });
});

describe("status vocabulary", () => {
  it("labels every pipeline stage", () => {
    for (const stage of LETTER_PIPELINE) {
      expect(LETTER_STATUS[stage]).toBeDefined();
    }
  });

  it("covers every status the database allows", () => {
    const allowed = [
      "submitted",
      "in_review",
      "approved",
      "rejected",
      "completed",
      "cancelled",
    ];

    for (const status of allowed) {
      expect(LETTER_STATUS[status]).toBeDefined();
    }
  });

  it("keeps the terminal failure states out of the progress pipeline", () => {
    expect(LETTER_PIPELINE).not.toContain("rejected");
    expect(LETTER_PIPELINE).not.toContain("cancelled");
  });

  it("asks for a name and a contact on every service", () => {
    expect(BASE_FIELDS.map((f) => f.name)).toEqual(["applicantName", "contact"]);
    expect(BASE_FIELDS.every((f) => f.required)).toBe(true);
  });
});
