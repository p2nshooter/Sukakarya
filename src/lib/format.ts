/** Locale-aware formatting helpers. Default locale comes from the village row. */

export function formatDate(
  value: string | null | undefined,
  locale = "id-ID",
  timeZone = "Asia/Jakarta",
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
  locale = "id-ID",
  timeZone = "Asia/Jakarta",
): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatCurrency(
  value: number,
  locale = "id-ID",
  currency = "IDR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale = "id-ID"): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Percentage of `actual` against `budget`, clamped and safe when budget is 0. */
export function percentOf(actual: number, budget: number): number {
  if (!budget) return 0;
  return Math.min(Math.round((actual / budget) * 100), 999);
}

export function truncate(text: string | null | undefined, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

/**
 * Strips tags so an HTML body can be reused as a meta description.
 * Not a sanitiser - never feed the result back into `dangerouslySetInnerHTML`.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
