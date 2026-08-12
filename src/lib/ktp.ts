import { getAiConfig } from "@/lib/ai";
import type { Village } from "@/lib/village";

/**
 * Reading an Indonesian KTP and deciding whether its holder lives here.
 *
 * Two rules shape everything below.
 *
 * The first is what is read. A KTP prints religion, blood type, marital status
 * and occupation. None of them bear on the only question being asked - does
 * this person live in this village - so none are requested. Asking a model for
 * a field and then discarding it still means that field travelled to a third
 * party and sat in someone's logs.
 *
 * The second is what happens when the answer is unclear. A blurred photograph,
 * a card held at an angle, a village whose name is spelled differently on the
 * card than in the database: none of these mean the applicant is lying. They
 * are marked `unreadable` and sent to a human, never auto-rejected. The failure
 * that matters here is refusing a resident their own village's services, not
 * making an operator look at a queue.
 */

export interface KtpReading {
  name: string | null;
  nik: string | null;
  village: string | null;
  district: string | null;
  regency: string | null;
  province: string | null;
}

export type MatchResult = "match" | "mismatch" | "unreadable";

export interface KtpVerdict {
  reading: KtpReading;
  result: MatchResult;
  /** Shown to the applicant, so it says what to do rather than what failed. */
  message: string;
}

const FIELDS = ["nama", "nik", "desa_kelurahan", "kecamatan", "kabupaten_kota", "provinsi"];

/**
 * Asks the configured vision model for six fields and nothing else.
 *
 * Written against the OpenAI-compatible endpoint directly rather than through
 * `runAiTask`, which is built for text-only editorial tasks and has no way to
 * carry an image. Keeping the vision payload here means the article helpers
 * cannot accidentally be handed a photograph of someone's identity card.
 */
export async function readKtp(
  imageDataUrl: string,
): Promise<KtpReading | null> {
  const config = getAiConfig();
  if (!config) return null;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "Anda membaca foto KTP Indonesia. Keluarkan HANYA JSON dengan kunci: " +
            FIELDS.join(", ") +
            ". Gunakan null bila sebuah nilai tidak terbaca dengan jelas. " +
            "Jangan menebak. Jangan mengeluarkan kolom lain apa pun, termasuk " +
            "agama, golongan darah, status perkawinan dan pekerjaan.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Baca kartu ini." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";

  // Models wrap JSON in prose or fences often enough that trusting the shape
  // outright would fail on a good read.
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const value = (key: string) => {
      const text = parsed[key];
      return typeof text === "string" && text.trim() ? text.trim() : null;
    };
    return {
      name: value("nama"),
      nik: value("nik")?.replace(/\D/g, "") || null,
      village: value("desa_kelurahan"),
      district: value("kecamatan"),
      regency: value("kabupaten_kota"),
      province: value("provinsi"),
    };
  } catch {
    return null;
  }
}

/**
 * Loose comparison of two place names.
 *
 * A card reads "KAB. BEKASI" where the database holds "Bekasi", and "DESA
 * SUKAKARYA" against "Sukakarya". Comparing those literally would reject every
 * genuine resident, so the administrative prefixes are stripped and the rest
 * folded to bare letters before comparing.
 */
export function samePlace(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const normalise = (text: string) =>
    text
      .toLowerCase()
      .replace(/\b(kab|kabupaten|kota|kec|kecamatan|desa|kelurahan|kel|prov|provinsi)\b\.?/g, "")
      .replace(/[^a-z]/g, "");
  const left = normalise(a);
  const right = normalise(b);
  return left.length > 2 && left === right;
}

export function verifyAgainstVillage(
  reading: KtpReading | null,
  village: Village,
): KtpVerdict {
  const empty: KtpReading = {
    name: null,
    nik: null,
    village: null,
    district: null,
    regency: null,
    province: null,
  };

  if (!reading || !reading.nik || reading.nik.length !== 16) {
    return {
      reading: reading ?? empty,
      result: "unreadable",
      message:
        "Foto KTP belum terbaca jelas. Coba potret ulang dengan cahaya cukup " +
        "dan seluruh kartu masuk dalam bingkai. Pengajuan Anda tetap kami " +
        "terima dan akan diperiksa petugas.",
    };
  }

  // The regency is the anchor. Village names repeat across Indonesia - there is
  // a Sukakarya in several regencies - so matching the village alone would let
  // a resident of another regency through.
  const regencyMatches = samePlace(reading.regency, village.regency);
  const villageMatches = samePlace(reading.village, village.name);

  if (village.regency && !regencyMatches) {
    return {
      reading,
      result: "mismatch",
      message:
        `Pendaftaran hanya untuk warga ${village.entityLabel} ${village.name}` +
        `${village.regency ? `, ${village.regency}` : ""}. ` +
        `KTP Anda tercatat di ${reading.regency ?? "wilayah lain"}.`,
    };
  }

  if (!villageMatches) {
    return {
      reading,
      result: "mismatch",
      message:
        `Pendaftaran hanya untuk warga ${village.entityLabel} ${village.name}. ` +
        `KTP Anda tercatat di ${reading.village ?? "desa lain"}.`,
    };
  }

  return {
    reading,
    result: "match",
    message: "Data KTP cocok dengan wilayah desa. Menunggu verifikasi petugas.",
  };
}

/**
 * Salted hash of the NIK.
 *
 * The salt is the village id rather than a secret: the purpose is only to stop
 * the same card being queued twice in one village, and a table of hashes that
 * cannot be joined across villages is a smaller prize than one that can.
 */
export async function hashNik(nik: string, villageId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${villageId}:${nik}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
