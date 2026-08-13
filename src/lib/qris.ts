/**
 * Turns a village's own static QRIS code into a dynamic one carrying an amount.
 *
 * QRIS is Bank Indonesia's national QR standard, built on the EMVCo merchant
 * QR spec. A payable code is not something software can invent: it carries the
 * merchant's NMID, issued by a licensed payment provider, and a scanner
 * validates the checksum before it will pay anything. Generating one from
 * nothing would produce a QR that looks legitimate and sends money nowhere -
 * on a village government's site that is not a bug, it is a trap.
 *
 * So the village pastes the static QRIS it already has from its own merchant
 * account, once, in Pengaturan Desa. This converts that string into a dynamic
 * code for one specific request:
 *
 *   - tag 01, the initiation method, changes from "11" (static, payer types the
 *     amount) to "12" (dynamic, amount fixed by the code);
 *   - tag 54 carries the amount, inserted in tag order;
 *   - tag 63, the CRC, is recomputed over everything before it.
 *
 * The merchant identifiers are copied through untouched, so the money goes
 * exactly where the village's own QR already sent it.
 */

/**
 * Tidies a pasted payload without altering it.
 *
 * Line breaks and tabs are artifacts of copying out of a PDF or a chat message
 * and never appear inside a QRIS field. A plain space is a different matter:
 * merchant names carry them - "DESA SUKAKARYA" is fourteen characters, and
 * stripping its space leaves a value one shorter than the length that precedes
 * it, which breaks the payload from that point on. Every real village QR would
 * have been mangled by removing spaces here.
 */
function normalise(payload: string): string {
  return payload.replace(/[\r\n\t]/g, "").trim();
}

/** One tag-length-value field of an EMVCo payload. */
interface Field {
  tag: string;
  value: string;
}

/**
 * EMVCo is `TTLLvalue`: two digits of tag, two of length, then the value.
 * Returns null for anything that does not parse, because a half-read payment
 * code must never be shown to somebody about to pay.
 */
export function parseEmv(payload: string): Field[] | null {
  const fields: Field[] = [];
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const tag = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(length)) return null;

    const start = i + 4;
    const end = start + length;
    if (end > payload.length) return null;

    fields.push({ tag, value: payload.slice(start, end) });
    i = end;
  }

  return fields.length > 0 ? fields : null;
}

/**
 * CRC-16/CCITT-FALSE: polynomial 0x1021, initial value 0xFFFF, no reflection
 * and no final xor. This is the variant EMVCo specifies; the other CRC-16s
 * produce a code every scanner rejects.
 */
export function crc16(input: string): string {
  let crc = 0xffff;

  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function encode(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

/**
 * Rebuilds `payload` as a dynamic code for `amount` rupiah.
 *
 * Returns null when the input is not a QRIS payload at all, so a village that
 * pastes the wrong thing gets no QR rather than a broken one.
 */
export function toDynamicQris(payload: string, amount: number): string | null {
  const clean = normalise(payload);
  if (!clean) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const fields = parseEmv(clean);
  if (!fields) return null;

  // A QRIS payload always opens with the format indicator and closes with the
  // checksum. Anything without both is not one.
  if (fields[0]?.tag !== "00") return null;
  if (!fields.some((f) => f.tag === "63")) return null;

  const rebuilt: Field[] = [];
  for (const field of fields) {
    if (field.tag === "63") continue; // recomputed at the end
    if (field.tag === "54") continue; // replaced below
    if (field.tag === "01") {
      rebuilt.push({ tag: "01", value: "12" });
      continue;
    }
    rebuilt.push(field);
  }

  // Some static codes omit the initiation method entirely, which means static
  // by default. A dynamic code has to state it.
  if (!rebuilt.some((f) => f.tag === "01")) {
    rebuilt.splice(1, 0, { tag: "01", value: "12" });
  }

  // Rupiah has no minor units in practice, and QRIS carries the amount as a
  // plain decimal string. Fractions are dropped rather than rounded up: a
  // village must never charge more than the fee it published.
  const value = String(Math.floor(amount));

  // Tags travel in ascending order, so the amount goes before the first tag
  // greater than 54 - country code (58) in every real payload.
  const at = rebuilt.findIndex((f) => Number(f.tag) > 54);
  const amountField: Field = { tag: "54", value };
  if (at === -1) rebuilt.push(amountField);
  else rebuilt.splice(at, 0, amountField);

  const body = rebuilt.map((f) => encode(f.tag, f.value)).join("");

  // The CRC covers the payload including its own tag and length ("6304"),
  // which is why those four characters are appended before hashing.
  const withCrcHeader = `${body}6304`;
  return `${withCrcHeader}${crc16(withCrcHeader)}`;
}

/** True when the string looks like a QRIS payload the converter can use. */
export function isQrisPayload(payload: string): boolean {
  const fields = parseEmv(normalise(payload));
  if (!fields) return false;
  return fields[0]?.tag === "00" && fields.some((f) => f.tag === "63");
}
