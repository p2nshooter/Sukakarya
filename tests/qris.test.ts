import { describe, expect, it } from "vitest";
import { crc16, isQrisPayload, parseEmv, toDynamicQris } from "@/lib/qris";

/**
 * A static QRIS payload of the shape Indonesian merchants actually get. The
 * merchant identifiers are invented, but the structure, tag order and checksum
 * are real - the CRC below is computed by the same algorithm a scanner uses, so
 * a mistake in the converter shows up here rather than at somebody's payment.
 */
function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

function staticPayload(): string {
  // Built with a real encoder rather than typed out, so the lengths cannot
  // drift from the values - a hand-written fixture with a wrong length tests
  // the parser's error path by accident instead of the converter.
  const body =
    tlv("00", "01") +
    tlv("01", "11") +
    tlv(
      "26",
      tlv("00", "COM.DANA.WWW") +
        tlv("01", "936009110022334455") +
        tlv("02", "200330011223345") +
        tlv("03", "UMI"),
    ) +
    tlv(
      "51",
      tlv("00", "ID.CO.QRIS.WWW") +
        tlv("02", "ID2023211223345") +
        tlv("03", "UMI"),
    ) +
    tlv("52", "5812") +
    tlv("53", "360") +
    tlv("58", "ID") +
    tlv("59", "DESA SUKAKARYA") +
    tlv("60", "BEKASI") +
    tlv("61", "17530");
  return `${body}6304${crc16(`${body}6304`)}`;
}

describe("crc16", () => {
  it("computes the CCITT-FALSE variant EMVCo specifies", () => {
    // The canonical check value for CRC-16/CCITT-FALSE.
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("parseEmv", () => {
  it("reads tag, length and value", () => {
    const fields = parseEmv("000201010211");
    expect(fields).toEqual([
      { tag: "00", value: "01" },
      { tag: "01", value: "11" },
    ]);
  });

  it("refuses a payload whose length runs past the end", () => {
    // Says 20 characters follow, supplies four. A half-read payment code must
    // never reach somebody about to pay.
    expect(parseEmv("002012ab")).toBeNull();
  });

  it("refuses junk", () => {
    expect(parseEmv("bukan qris")).toBeNull();
    expect(parseEmv("")).toBeNull();
  });
});

describe("toDynamicQris", () => {
  const source = staticPayload();

  it("produces a payload whose own checksum validates", () => {
    const dynamic = toDynamicQris(source, 15000)!;
    expect(dynamic).not.toBeNull();

    // Exactly what a scanner does: strip the last four characters and check
    // them against a CRC of everything before.
    const body = dynamic.slice(0, -4);
    const stated = dynamic.slice(-4);
    expect(crc16(body)).toBe(stated);
  });

  it("marks the code dynamic", () => {
    const fields = parseEmv(toDynamicQris(source, 15000)!)!;
    expect(fields.find((f) => f.tag === "01")?.value).toBe("12");
  });

  it("carries the amount in tag 54", () => {
    const fields = parseEmv(toDynamicQris(source, 15000)!)!;
    expect(fields.find((f) => f.tag === "54")?.value).toBe("15000");
  });

  it("keeps the merchant identifiers untouched", () => {
    // The whole point: the money must go where the village's own QR sent it.
    const before = parseEmv(source)!;
    const after = parseEmv(toDynamicQris(source, 15000)!)!;
    for (const tag of ["26", "51", "52", "53", "58", "59", "60"]) {
      expect(after.find((f) => f.tag === tag)?.value).toBe(
        before.find((f) => f.tag === tag)?.value,
      );
    }
  });

  it("keeps tags in ascending order", () => {
    // Scanners are not required to tolerate out-of-order tags.
    const tags = parseEmv(toDynamicQris(source, 15000)!)!.map((f) =>
      Number(f.tag),
    );
    expect([...tags]).toEqual([...tags].sort((a, b) => a - b));
  });

  it("replaces an amount already present rather than adding a second", () => {
    const withAmount = toDynamicQris(source, 5000)!;
    const twice = toDynamicQris(withAmount, 15000)!;
    const fields = parseEmv(twice)!.filter((f) => f.tag === "54");
    expect(fields).toHaveLength(1);
    expect(fields[0].value).toBe("15000");
  });

  it("never rounds a fee up", () => {
    // A village must not charge more than the amount it published.
    const fields = parseEmv(toDynamicQris(source, 15000.9)!)!;
    expect(fields.find((f) => f.tag === "54")?.value).toBe("15000");
  });

  it("returns null rather than a broken code", () => {
    expect(toDynamicQris("bukan qris sama sekali", 15000)).toBeNull();
    expect(toDynamicQris("", 15000)).toBeNull();
    // A free service has nothing to pay, so there is no code to show.
    expect(toDynamicQris(source, 0)).toBeNull();
    expect(toDynamicQris(source, -1)).toBeNull();
  });
});

describe("isQrisPayload", () => {
  it("accepts a real payload and rejects a wrong paste", () => {
    expect(isQrisPayload(staticPayload())).toBe(true);
    expect(isQrisPayload("https://qris.example/pay/123")).toBe(false);
    expect(isQrisPayload("")).toBe(false);
  });
});
