import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("keeps allowed formatting", () => {
    const html = "<p>Halo <strong>warga</strong> desa</p>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("drops script elements together with their contents", () => {
    const out = sanitizeHtml('<p>aman</p><script>alert("xss")</script>');
    expect(out).not.toContain("alert");
    expect(out).not.toContain("<script");
    expect(out).toContain("aman");
  });

  it("drops style, iframe, object and svg payloads", () => {
    for (const tag of ["style", "iframe", "object", "embed", "svg", "math"]) {
      const out = sanitizeHtml(`<${tag}>berbahaya</${tag}><p>ok</p>`);
      expect(out).not.toContain(`<${tag}`);
      expect(out).not.toContain("berbahaya");
      expect(out).toContain("ok");
    }
  });

  it("strips every event handler attribute", () => {
    const out = sanitizeHtml('<p onclick="steal()" onmouseover="x()">teks</p>');
    expect(out).toBe("<p>teks</p>");
  });

  it("rejects javascript: and data: urls", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">klik</a>')).toBe(
      "<a>klik</a>",
    );
    expect(sanitizeHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">')).toBe(
      '<img loading="lazy" />',
    );
  });

  it("rejects urls that hide the scheme behind control characters", () => {
    const out = sanitizeHtml('<a href="java	script:alert(1)">klik</a>');
    expect(out).toBe("<a>klik</a>");
  });

  it("keeps safe absolute and relative urls", () => {
    expect(sanitizeHtml('<a href="/berita">berita</a>')).toContain('href="/berita"');
    expect(sanitizeHtml('<a href="https://desa.example">situs</a>')).toContain(
      'href="https://desa.example"',
    );
    expect(sanitizeHtml('<a href="mailto:a@b.co">surel</a>')).toContain("mailto:");
  });

  it("adds rel=noopener to links that open a new tab", () => {
    const out = sanitizeHtml('<a href="https://a.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("escapes stray angle brackets in text", () => {
    expect(sanitizeHtml("5 < 10 & 10 > 5")).toBe("5 &lt; 10 &amp; 10 &gt; 5");
  });

  it("closes tags left open by the author", () => {
    expect(sanitizeHtml("<p>satu<p>dua")).toBe("<p>satu</p><p>dua</p>");
  });

  it("ignores stray closing tags", () => {
    expect(sanitizeHtml("</p>teks")).toBe("teks");
  });

  it("unwraps disallowed tags but keeps their text", () => {
    expect(sanitizeHtml("<marquee>bergerak</marquee>")).toBe("bergerak");
  });

  it("returns an empty string for null input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
  });
});
