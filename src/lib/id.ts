/** Identifier and slug helpers. All ids are opaque, sortable-ish strings. */

const TICKET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1

export function newId(prefix?: string): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Human-readable, case-insensitive ticket for public tracking pages, e.g.
 * `PGD-7K3M-92QX`. Uses an alphabet without visually ambiguous characters so a
 * citizen can copy it off a printed receipt without mistakes.
 */
export function newTicket(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(
    bytes,
    (b) => TICKET_ALPHABET[b % TICKET_ALPHABET.length],
  );
  return `${prefix}-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function slugify(input: string, fallback = "item"): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

/** Adds a short random suffix so slugs stay unique inside a village. */
export function uniqueSlug(input: string, fallback = "item"): string {
  const base = slugify(input, fallback);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}
