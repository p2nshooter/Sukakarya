import { getEnv } from "@/lib/env";
import { stripHtml, truncate } from "@/lib/format";

/**
 * Editorial AI assistance for the admin panel.
 *
 * Deliberately provider-agnostic. The endpoint, key and model all come from
 * Worker secrets, and the request body is the OpenAI-compatible
 * `/chat/completions` shape that every major gateway - including ulyah.com,
 * the default configured here - accepts. Pointing this at a different provider
 * is a `wrangler secret put`, not a code change.
 *
 * Three rules hold everywhere in this file:
 *
 *  1. It is optional. With no key configured every helper reports "disabled"
 *     and the panel simply does not offer the button. Nothing in the CMS
 *     depends on the model being reachable.
 *  2. It never blocks a save. Every call is time-boxed and every failure comes
 *     back as a value, not an exception, so a slow or broken provider can never
 *     wedge an editor mid-article.
 *  3. It only ever sees content the village intends to publish. Citizen data -
 *     letter payloads, complaint contacts, anything from `letter_requests` or
 *     `complaints` - must never be passed to these helpers.
 */

const DEFAULT_BASE_URL = "https://ulyah.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 25_000;
const MAX_INPUT_CHARS = 12_000;

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Reads the configuration from the Worker environment.
 *
 * Returns null when no key is set, which is the signal every caller uses to
 * decide whether the feature exists at all.
 */
export function getAiConfig(): AiConfig | null {
  const env = getEnv() as CloudflareEnv & {
    AI_API_KEY?: string;
    AI_BASE_URL?: string;
    AI_MODEL?: string;
  };

  const apiKey = env.AI_API_KEY?.trim();
  if (!apiKey) return null;

  // Trailing slashes would produce `//chat/completions` on some gateways.
  const baseUrl = (env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return { baseUrl, apiKey, model: env.AI_MODEL?.trim() || DEFAULT_MODEL };
}

export function isAiEnabled(): boolean {
  return getAiConfig() !== null;
}

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "disabled" | "timeout" | "provider" | "empty"; message: string };

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function chat(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<AiResult> {
  const config = getAiConfig();
  if (!config) {
    return {
      ok: false,
      reason: "disabled",
      message: "Fitur AI belum diaktifkan. Setel secret AI_API_KEY.",
    };
  }

  // AbortSignal.timeout is available on the Workers runtime and cancels the
  // in-flight request rather than merely abandoning the promise.
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 900,
        stream: false,
      }),
      signal,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      reason: timedOut ? "timeout" : "provider",
      message: timedOut
        ? "Layanan AI tidak merespons tepat waktu. Coba lagi."
        : "Tidak dapat menghubungi layanan AI.",
    };
  }

  if (!response.ok) {
    // The upstream body can echo the prompt or the key; never surface it.
    return {
      ok: false,
      reason: "provider",
      message: `Layanan AI menolak permintaan (HTTP ${response.status}).`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      reason: "provider",
      message: "Balasan layanan AI tidak dapat dibaca.",
    };
  }

  const text = extractText(payload);
  if (!text) {
    return {
      ok: false,
      reason: "empty",
      message: "Layanan AI tidak mengembalikan teks.",
    };
  }

  return { ok: true, text };
}

/** Pulls the assistant message out of a chat-completions response. */
function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content.trim() : "";
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                       */
/* -------------------------------------------------------------------------- */

const HOUSE_STYLE = [
  "Kamu adalah asisten redaksi untuk situs resmi pemerintah desa di Indonesia.",
  "Tulis dalam Bahasa Indonesia yang baku, jelas, dan ringkas.",
  "Gunakan sudut pandang institusi desa, bukan orang pertama tunggal.",
  "Jangan mengarang fakta, angka, tanggal, nama orang, atau nama tempat.",
  "Jika informasi kurang, tulis kalimat umum yang aman dan biarkan redaksi melengkapinya.",
  "Jangan pernah menulis data pribadi warga seperti NIK, nomor KK, alamat rumah, atau nomor telepon pribadi.",
].join(" ");

export const AI_TASKS = [
  "draft",
  "improve",
  "summarize",
  "seo",
  "alt",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export function isAiTask(value: string): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value);
}

/** Trims and de-formats caller input before it reaches the provider. */
function prepare(input: string): string {
  return truncate(stripHtml(input).replace(/\s+/g, " ").trim(), MAX_INPUT_CHARS);
}

export interface AiRequest {
  task: AiTask;
  /** Article title, or the subject the draft is about. */
  title?: string;
  /** Existing body text, for improve/summarize/seo. */
  body?: string;
  /** Village name, so drafts read as though they belong to this tenant. */
  villageLabel?: string;
}

export async function runAiTask(request: AiRequest): Promise<AiResult> {
  const title = prepare(request.title ?? "");
  const body = prepare(request.body ?? "");
  const where = request.villageLabel ? ` di ${request.villageLabel}` : "";

  switch (request.task) {
    case "draft": {
      if (!title) {
        return {
          ok: false,
          reason: "empty",
          message: "Isi judul terlebih dahulu agar AI punya konteks.",
        };
      }
      return chat(
        [
          { role: "system", content: HOUSE_STYLE },
          {
            role: "user",
            content:
              `Buat draf artikel berita desa${where} dengan judul "${title}".\n` +
              `Panjang 3 sampai 5 paragraf. Keluarkan HTML sederhana ` +
              `menggunakan tag <p> saja, tanpa <html>, <head>, atau <body>. ` +
              `Jangan menambahkan judul di dalam isi.`,
          },
        ],
        { maxTokens: 1100 },
      );
    }

    case "improve": {
      if (!body) {
        return {
          ok: false,
          reason: "empty",
          message: "Tidak ada isi artikel untuk dirapikan.",
        };
      }
      return chat(
        [
          { role: "system", content: HOUSE_STYLE },
          {
            role: "user",
            content:
              `Rapikan ejaan, tanda baca, dan alur kalimat teks berikut tanpa ` +
              `mengubah fakta atau menambah informasi baru. Pertahankan panjang ` +
              `yang kurang lebih sama. Keluarkan HTML dengan tag <p> saja.\n\n${body}`,
          },
        ],
        { maxTokens: 1200, temperature: 0.3 },
      );
    }

    case "summarize": {
      if (!body) {
        return {
          ok: false,
          reason: "empty",
          message: "Tidak ada isi artikel untuk diringkas.",
        };
      }
      return chat(
        [
          { role: "system", content: HOUSE_STYLE },
          {
            role: "user",
            content:
              `Ringkas teks berikut menjadi satu paragraf ringkasan maksimal ` +
              `40 kata sebagai teks biasa tanpa tag HTML.\n\n${body}`,
          },
        ],
        { maxTokens: 220, temperature: 0.4 },
      );
    }

    case "seo": {
      if (!title && !body) {
        return {
          ok: false,
          reason: "empty",
          message: "Isi judul atau isi artikel terlebih dahulu.",
        };
      }
      return chat(
        [
          { role: "system", content: HOUSE_STYLE },
          {
            role: "user",
            content:
              `Buat meta description untuk halaman berjudul "${title}". ` +
              `Maksimal 155 karakter, satu kalimat, teks biasa tanpa tanda kutip ` +
              `dan tanpa tag HTML.\n\nIsi halaman:\n${body || title}`,
          },
        ],
        { maxTokens: 120, temperature: 0.4 },
      );
    }

    case "alt": {
      if (!title) {
        return {
          ok: false,
          reason: "empty",
          message: "Isi keterangan gambar terlebih dahulu.",
        };
      }
      return chat(
        [
          { role: "system", content: HOUSE_STYLE },
          {
            role: "user",
            content:
              `Tulis teks alternatif (alt text) untuk gambar dengan keterangan ` +
              `"${title}". Maksimal 120 karakter, deskriptif, teks biasa. ` +
              `Jangan awali dengan "Gambar" atau "Foto".`,
          },
        ],
        { maxTokens: 90, temperature: 0.4 },
      );
    }
  }
}
