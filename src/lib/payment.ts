import QRCode from "qrcode";

import { toDynamicQris } from "@/lib/qris";
import { getVillageSettings } from "@/lib/village";

/**
 * Paying for a letter.
 *
 * Two things are needed and they do different jobs. The QR carries the amount
 * and the village's merchant identifiers, so scanning it pays the right sum to
 * the right account. The payment code carries nothing - it exists so the
 * officer reading the village's e-wallet statement can tell which of yesterday's
 * eleven transfers of Rp 15.000 belongs to which request.
 *
 * There is no automatic confirmation. Knowing that a payment landed requires an
 * account with the payment provider and a webhook from them; without that the
 * only honest thing is for an officer to mark it paid, and to say so plainly on
 * screen rather than leaving a resident waiting for a status that will never
 * change by itself.
 */

export const QRIS_SETTING = "payment.qris_payload";
export const EWALLET_SETTING = "payment.ewallet_note";

/**
 * Characters that cannot be confused when read aloud over the phone or copied
 * off a screen: no O/0, no I/1, no S/5. The code is quoted by a resident to a
 * clerk often enough that this matters more than the extra entropy.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRTUVWXY2346789";

/** A short reference for one request, e.g. `BYR-7K3QF2`. */
export function newPaymentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `BYR-${code}`;
}

export interface PaymentDetails {
  /** The village's QRIS, rebuilt to carry this exact amount. Null when the
   *  village has not configured one, or the amount is zero. */
  qrisPayload: string | null;
  /** That payload as an inline SVG, ready to render. */
  qrSvg: string | null;
  /** Free text from settings: the DANA number, the bank account, and so on. */
  ewalletNote: string | null;
}

/**
 * Builds what the resident needs to pay `amount` for this village.
 *
 * A village with no QRIS configured still gets the e-wallet note and the
 * payment code, which is enough to transfer manually - so payment is never
 * blocked on a setting an operator has not filled in yet.
 */
export async function buildPaymentDetails(
  villageId: string,
  amount: number,
): Promise<PaymentDetails> {
  const settings = await getVillageSettings(villageId, "payment.");
  const source = settings[QRIS_SETTING]?.trim() ?? "";
  const ewalletNote = settings[EWALLET_SETTING]?.trim() || null;

  const qrisPayload = source ? toDynamicQris(source, amount) : null;

  let qrSvg: string | null = null;
  if (qrisPayload) {
    // Level M is what QRIS itself specifies. `margin: 1` keeps the quiet zone
    // the spec requires without wasting space on a phone screen.
    qrSvg = await QRCode.toString(qrisPayload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
    });
  }

  return { qrisPayload, qrSvg, ewalletNote };
}
