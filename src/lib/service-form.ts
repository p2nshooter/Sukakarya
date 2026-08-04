/**
 * Dynamic form engine for letter services.
 *
 * Each row in `services` carries a `form_schema` JSON array describing the
 * fields a citizen must fill in. That keeps the request form data-driven: a
 * village adds a new letter type from the admin panel and it gets a working
 * form immediately, with no code change and no redeploy.
 *
 * Everything a citizen submits lands in `letter_requests.payload`, which is
 * staff-visible only. Nothing here is ever rendered on a public page - the
 * tracking page exposes status alone.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "tel",
  "email",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface ServiceField {
  /** Stable key used for the form control name and the payload property. */
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  hint?: string;
  /** Options for `select`; ignored otherwise. */
  options?: string[];
  maxLength?: number;
}

/** Fields every service asks for, prepended to whatever the schema defines. */
export const BASE_FIELDS: ServiceField[] = [
  {
    name: "applicantName",
    label: "Nama Lengkap Pemohon",
    type: "text",
    required: true,
    placeholder: "Sesuai dokumen kependudukan",
    maxLength: 120,
  },
  {
    name: "contact",
    label: "Nomor WhatsApp atau Email",
    type: "text",
    required: true,
    hint: "Dipakai petugas untuk mengabari status pengajuan Anda.",
    maxLength: 120,
  },
];

const MAX_FIELDS = 40;
const DEFAULT_MAX_LENGTH = 500;
const HARD_MAX_LENGTH = 4000;

function isFieldType(value: unknown): value is FieldType {
  return (
    typeof value === "string" && (FIELD_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Parses a stored `form_schema` into fields.
 *
 * Tolerant by design: a malformed entry is dropped rather than throwing, so one
 * bad row in the admin panel cannot take the whole service page down. An
 * entirely unparseable schema yields an empty list, and the service still works
 * with just the base fields.
 */
export function parseFormSchema(raw: string | null | undefined): ServiceField[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const fields: ServiceField[] = [];
  const seen = new Set<string>();

  for (const entry of parsed.slice(0, MAX_FIELDS)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;

    const name = typeof record.name === "string" ? record.name.trim() : "";
    // The name becomes a form control name and a payload key, so keep it to a
    // conservative character set and never let it collide with a base field.
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(name)) continue;
    if (seen.has(name)) continue;
    if (BASE_FIELDS.some((base) => base.name === name)) continue;
    seen.add(name);

    const label =
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim().slice(0, 120)
        : name;

    const type = isFieldType(record.type) ? record.type : "text";

    const options =
      type === "select" && Array.isArray(record.options)
        ? record.options
            .filter((o): o is string => typeof o === "string")
            .map((o) => o.trim())
            .filter(Boolean)
            .slice(0, 50)
        : undefined;

    // A select with no options cannot be answered, so degrade it to free text
    // rather than rendering an empty dropdown.
    const resolvedType: FieldType =
      type === "select" && (!options || options.length === 0) ? "text" : type;

    const maxLength =
      typeof record.maxLength === "number" && Number.isFinite(record.maxLength)
        ? Math.min(Math.max(Math.trunc(record.maxLength), 1), HARD_MAX_LENGTH)
        : undefined;

    fields.push({
      name,
      label,
      type: resolvedType,
      required: record.required === true,
      placeholder:
        typeof record.placeholder === "string"
          ? record.placeholder.slice(0, 120)
          : undefined,
      hint: typeof record.hint === "string" ? record.hint.slice(0, 200) : undefined,
      options,
      maxLength,
    });
  }

  return fields;
}

export interface ValidationResult {
  values: Record<string, string>;
  errors: Record<string, string>;
}

/**
 * Validates submitted values against the schema.
 *
 * Returns both the cleaned values and per-field errors so the page can re-render
 * the form with what the citizen typed still in place - losing a filled-in form
 * to a single validation error is the fastest way to lose the citizen too.
 */
export function validateSubmission(
  fields: ServiceField[],
  formData: FormData,
): ValidationResult {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = formData.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    const limit = field.maxLength ?? DEFAULT_MAX_LENGTH;

    values[field.name] = value.slice(0, limit);

    if (field.required && !value) {
      errors[field.name] = `${field.label} wajib diisi.`;
      continue;
    }
    if (!value) continue;

    if (value.length > limit) {
      errors[field.name] = `${field.label} maksimal ${limit} karakter.`;
      continue;
    }

    switch (field.type) {
      case "number":
        if (!/^-?\d+([.,]\d+)?$/.test(value)) {
          errors[field.name] = `${field.label} harus berupa angka.`;
        }
        break;
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          errors[field.name] = `${field.label} harus berupa tanggal.`;
        }
        break;
      case "email":
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
          errors[field.name] = `${field.label} bukan alamat email yang sah.`;
        }
        break;
      case "tel":
        if (!/^[0-9+()\-.\s]{6,20}$/.test(value)) {
          errors[field.name] = `${field.label} bukan nomor telepon yang sah.`;
        }
        break;
      case "select":
        if (field.options && !field.options.includes(value)) {
          errors[field.name] = `${field.label} bukan pilihan yang tersedia.`;
        }
        break;
      default:
        break;
    }
  }

  return { values, errors };
}

/** Human-readable status labels for the tracking page and the admin queue. */
export const LETTER_STATUS: Record<
  string,
  { label: string; tone: "info" | "warning" | "success" | "danger" | "neutral"; description: string }
> = {
  submitted: {
    label: "Diterima",
    tone: "info",
    description: "Pengajuan sudah masuk dan menunggu diperiksa petugas.",
  },
  in_review: {
    label: "Diproses",
    tone: "warning",
    description: "Petugas sedang memeriksa kelengkapan berkas Anda.",
  },
  approved: {
    label: "Disetujui",
    tone: "success",
    description: "Pengajuan disetujui dan surat sedang disiapkan.",
  },
  completed: {
    label: "Selesai",
    tone: "success",
    description: "Surat sudah selesai dan siap diambil di kantor desa.",
  },
  rejected: {
    label: "Ditolak",
    tone: "danger",
    description: "Pengajuan tidak dapat diproses. Silakan hubungi kantor desa.",
  },
  cancelled: {
    label: "Dibatalkan",
    tone: "neutral",
    description: "Pengajuan dibatalkan.",
  },
};

/** Ordered pipeline used to draw the progress tracker. */
export const LETTER_PIPELINE = [
  "submitted",
  "in_review",
  "approved",
  "completed",
] as const;
