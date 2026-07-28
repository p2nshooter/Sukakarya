/**
 * Allowlist HTML sanitiser for CMS-authored bodies.
 *
 * Editor content is written by authenticated staff, but staff accounts get
 * compromised and roles get over-granted, so nothing authored in the CMS is
 * trusted at render time. Anything not on the allowlist is dropped, including
 * every `on*` handler, `<script>`, `<style>`, `<iframe>` and any URL scheme
 * other than http/https/mailto/tel and relative paths.
 *
 * Implemented without a DOM: Workers have no DOMParser at render time.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "sub", "sup",
  "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "span", "div",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  "*": new Set(["class"]),
};

const VOID_TAGS = new Set(["br", "hr", "img"]);

/**
 * Tags that implicitly close a still-open sibling, per the HTML parsing rules.
 * Without this an author writing `<p>a<p>b` would get nested paragraphs, which
 * is invalid and lays out differently than they intended.
 */
const IMPLIED_END: Record<string, readonly string[]> = {
  p: ["p"],
  li: ["li"],
  td: ["td", "th"],
  th: ["td", "th"],
  tr: ["tr", "td", "th"],
};

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#|\.\/)/i;

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  // Reject control characters used to smuggle `javascript:` past naive checks.
  if (/[\u0000-\u0020]/.test(trimmed)) return false;
  return SAFE_URL.test(trimmed);
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeAttributes(tag: string, rawAttrs: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  const global = ALLOWED_ATTRS["*"];
  const out: string[] = [];

  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";

    if (name.startsWith("on")) continue; // event handlers, always
    if (!allowed?.has(name) && !global.has(name)) continue;

    if ((name === "href" || name === "src") && !isSafeUrl(value)) continue;

    out.push(`${name}="${escapeAttr(value)}"`);
  }

  // Anchors that open a new tab must not hand the opener over.
  if (tag === "a") {
    const hasBlankTarget = out.some((a) => a === 'target="_blank"');
    if (hasBlankTarget && !out.some((a) => a.startsWith("rel="))) {
      out.push('rel="noopener noreferrer"');
    }
  }
  if (tag === "img" && !out.some((a) => a.startsWith("loading="))) {
    out.push('loading="lazy"');
  }

  return out.length > 0 ? ` ${out.join(" ")}` : "";
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  // Drop entire elements whose *content* is dangerous, not just their tags.
  let html = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[^>]*\/?>/gi, "");

  const openStack: string[] = [];
  const out: string[] = [];
  const tokenPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  let lastIndex = 0;
  let token: RegExpExecArray | null;

  while ((token = tokenPattern.exec(html)) !== null) {
    out.push(escapeText(html.slice(lastIndex, token.index)));
    lastIndex = tokenPattern.lastIndex;

    const tag = token[1].toLowerCase();
    const isClosing = token[0].startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) continue; // drop the tag, keep the text around it

    if (isClosing) {
      const openIndex = openStack.lastIndexOf(tag);
      if (openIndex === -1) continue; // stray close tag
      // Close anything left open inside it, so output stays well-formed.
      while (openStack.length > openIndex) {
        out.push(`</${openStack.pop()}>`);
      }
      continue;
    }

    const implied = IMPLIED_END[tag];
    while (
      implied &&
      openStack.length > 0 &&
      implied.includes(openStack[openStack.length - 1])
    ) {
      out.push(`</${openStack.pop()}>`);
    }

    const attrs = sanitizeAttributes(tag, token[2] ?? "");
    if (VOID_TAGS.has(tag)) {
      out.push(`<${tag}${attrs} />`);
    } else {
      out.push(`<${tag}${attrs}>`);
      openStack.push(tag);
    }
  }

  out.push(escapeText(html.slice(lastIndex)));

  while (openStack.length > 0) {
    out.push(`</${openStack.pop()}>`);
  }

  return out.join("");
}
