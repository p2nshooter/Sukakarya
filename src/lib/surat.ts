import { listOfficials } from "@/lib/content";
import { getDb } from "@/lib/env";
import type { Village } from "@/lib/village";

/**
 * Turns a service's letter template into the finished wording of one letter.
 *
 * Substitution is deliberately dumb: find `{{name}}`, put a value there, never
 * look at the result again. A template is written by an operator, and an
 * operator who types `{{nama_desa}}` inside the address is not asking for that
 * address to be re-scanned for more placeholders. One pass also means a value
 * that happens to contain braces cannot expand into anything.
 */

export interface LetterRow {
  id: string;
  ticket: string;
  applicant_name: string;
  contact: string | null;
  payload: string;
  created_at: string;
  service_name: string;
  letter_template: string | null;
  valid_days: number;
}

export async function getLetterForPrint(
  id: string,
  villageId: string,
): Promise<LetterRow | null> {
  return getDb()
    .prepare(
      // `submitted_at`, aliased. The column on letter_requests has always been
      // called submitted_at; this query asked for created_at and so every
      // attempt to print a letter answered 500 - the one screen in the panel
      // that no test opened, because opening it needs a letter to exist first.
      `SELECT lr.id, lr.ticket, lr.applicant_name, lr.contact, lr.payload,
              lr.submitted_at AS created_at, s.name AS service_name,
              s.letter_template, s.valid_days
         FROM letter_requests lr
         JOIN services s ON s.id = lr.service_id
        WHERE lr.id = ? AND lr.village_id = ?
        LIMIT 1`,
    )
    .bind(id, villageId)
    .first<LetterRow>();
}

function formatDate(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale.includes("-") ? locale : `${locale}-ID`, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** Answers the applicant gave. Never trusted as markup - only ever as text. */
function applicantAnswers(payload: string): Record<string, string> {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")]),
    );
  } catch {
    return {};
  }
}

export async function buildLetterValues(
  letter: LetterRow,
  village: Village,
): Promise<Record<string, string>> {
  // The head of village is read at print time rather than stored on the
  // request. A letter printed today should carry today's office holder, and
  // this is the join that stops a reprint from resurrecting a predecessor.
  const [head] = await listOfficials(village.id, "pemerintah_desa");

  const issued = new Date();
  const expires =
    letter.valid_days > 0
      ? new Date(issued.getTime() + letter.valid_days * 86_400_000)
      : null;

  const locale = village.locale;
  const zone = village.timezone;

  return {
    // Answers first, so a village that names a form field `nama_desa` cannot
    // shadow the village's own name below.
    ...applicantAnswers(letter.payload),

    nomor_surat: "",
    nomor_tiket: letter.ticket,
    nama_desa: village.name,
    sebutan_desa: village.entityLabel,
    kecamatan: village.district ?? "",
    kabupaten: village.regency ?? "",
    provinsi: village.province ?? "",
    // The three above joined, with the empty ones dropped. Written out
    // separately in a template they produce "Kecamatan , , ," on any village
    // that has not filled its address in yet - which is every village on the
    // day it installs this.
    wilayah_desa: [
      village.district ? `Kecamatan ${village.district}` : "",
      village.regency ?? "",
      village.province ?? "",
    ]
      .filter(Boolean)
      .join(", "),
    alamat_desa: village.address ?? "",
    nama_kepala_desa: head?.fullName ?? "",
    jabatan_kepala_desa: head?.position ?? `Kepala ${village.entityLabel}`,
    nama_pemohon: letter.applicant_name,
    kontak_pemohon: letter.contact ?? "",
    jenis_surat: letter.service_name,
    tanggal_surat: formatDate(issued.toISOString(), locale, zone),
    tanggal_pengajuan: formatDate(letter.created_at, locale, zone),
    berlaku_sampai: expires
      ? formatDate(expires.toISOString(), locale, zone)
      : "Tidak ada batas waktu",
  };
}

/** One pass, longest name first so `{{nama_desa}}` beats a stray `{{nama}}`. */
export function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (whole, key) =>
    key in values ? values[key] : whole,
  );
}
