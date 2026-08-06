/**
 * A PDF writer.
 *
 * The original application produced its PDF by opening the browser print dialog
 * and asking the operator to choose "Save as PDF". That is not a download - it
 * depends on the browser, it is different on every phone, and on most Android
 * browsers it does not offer PDF at all. This module writes the file on the
 * server so the button produces a real PDF everywhere.
 *
 * It uses the base-14 fonts, which every reader has built in, so nothing has to
 * be embedded and a fifty-page roster stays under a hundred kilobytes.
 */

/** A4 in points (1/72"), the paper every Indonesian office prints on. */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

export type Align = "left" | "center" | "right";

/**
 * Helvetica advance widths, in 1/1000 em, for the printable ASCII range.
 *
 * Needed for wrapping and centring: without real metrics a centred title sits
 * visibly off and long names run past their column instead of wrapping.
 */
// prettier-ignore
const W_REGULAR = [
  278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
  556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,
];

// prettier-ignore
const W_BOLD = [
  278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
  975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
  667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
  333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
  611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,
];

/**
 * Folds text down to what WinAnsi can represent.
 *
 * Indonesian is plain Latin, so this only ever fires on punctuation pasted from
 * a word processor - curly quotes, en dashes - which would otherwise render as
 * a wrong glyph rather than the character the operator typed.
 */
const FOLD: Record<string, string> = {
  "‘": "'", "’": "'", "‚": ",", "“": '"', "”": '"',
  "–": "-", "—": "-", "…": "...", " ": " ",
  "•": "-", "→": "->", "×": "x",
};

function toWinAnsi(text: string): string {
  let out = "";
  for (const char of text) {
    const folded = FOLD[char] ?? char;
    for (const c of folded) {
      const code = c.charCodeAt(0);
      out += code <= 255 ? c : "?";
    }
  }
  return out;
}

export function textWidth(text: string, size: number, bold = false): number {
  const table = bold ? W_BOLD : W_REGULAR;
  let total = 0;
  const folded = toWinAnsi(text);
  for (let i = 0; i < folded.length; i += 1) {
    const code = folded.charCodeAt(i);
    // Anything outside the measured range is Latin-1 accented text, which in
    // Helvetica is close enough to a lowercase letter to use one width.
    total += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (total * size) / 1000;
}

/** Greedy wrap. Words longer than the box are broken rather than overflowed. */
export function wrapText(
  text: string,
  size: number,
  maxWidth: number,
  bold = false,
): string[] {
  if (!text) return [""];
  const lines: string[] = [];

  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, bold) <= maxWidth || !line) {
        if (textWidth(candidate, size, bold) <= maxWidth) {
          line = candidate;
          continue;
        }
        // A single word that does not fit: break it at the character.
        let chunk = "";
        for (const char of word) {
          if (textWidth(chunk + char, size, bold) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        line = chunk;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

function escapeString(text: string): string {
  return toWinAnsi(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function n(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

export interface TextOptions {
  size?: number;
  bold?: boolean;
  align?: Align;
  color?: [number, number, number];
  /** Width of the box the text is aligned within. Required for centre/right. */
  width?: number;
}

export interface Column {
  label: string;
  /** Share of the content width, in percent. The set should total 100. */
  width: number;
  align?: Align;
}

export interface TableOptions {
  columns: Column[];
  rows: string[][];
  size?: number;
  headerFill?: [number, number, number];
  zebra?: boolean;
  /** Minimum row height, used so a signature column has room to sign in. */
  minRowHeight?: number;
  emptyMessage?: string;
}

/**
 * Page-aware document builder.
 *
 * Content streams are assembled as plain strings and the whole file is built in
 * WinAnsi, so a byte offset is a character index and the cross-reference table
 * can be computed without a second encoding pass.
 */
export class Pdf {
  readonly width: number;
  readonly height: number;
  readonly margin: number;

  private pages: string[] = [];
  private current: string[] = [];
  private cursor: number;
  private onNewPage: ((pdf: Pdf) => void) | null = null;

  constructor(options: { landscape?: boolean; margin?: number } = {}) {
    this.width = options.landscape ? A4_HEIGHT : A4_WIDTH;
    this.height = options.landscape ? A4_WIDTH : A4_HEIGHT;
    this.margin = options.margin ?? 42;
    this.cursor = this.height - this.margin;
  }

  get contentWidth(): number {
    return this.width - this.margin * 2;
  }

  get y(): number {
    return this.cursor;
  }

  set y(value: number) {
    this.cursor = value;
  }

  /** Runs on every page after the first - used for repeating headers. */
  setPageHeader(fn: ((pdf: Pdf) => void) | null): void {
    this.onNewPage = fn;
  }

  newPage(): void {
    this.pages.push(this.current.join("\n"));
    this.current = [];
    this.cursor = this.height - this.margin;
    if (this.onNewPage) this.onNewPage(this);
  }

  /** Starts a new page if `needed` points would run past the bottom margin. */
  ensure(needed: number): void {
    if (this.cursor - needed < this.margin + 24) this.newPage();
  }

  move(delta: number): void {
    this.cursor -= delta;
  }

  text(value: string, x: number, options: TextOptions = {}): number {
    const size = options.size ?? 10;
    const bold = options.bold ?? false;
    const align = options.align ?? "left";
    const box = options.width ?? this.contentWidth;

    let left = x;
    if (align !== "left") {
      const w = textWidth(value, size, bold);
      left = align === "center" ? x + (box - w) / 2 : x + box - w;
    }

    const color = options.color;
    const parts = [
      "BT",
      color ? `${n(color[0])} ${n(color[1])} ${n(color[2])} rg` : "0 0 0 rg",
      `/${bold ? "F2" : "F1"} ${n(size)} Tf`,
      `1 0 0 1 ${n(left)} ${n(this.cursor)} Tm`,
      `(${escapeString(value)}) Tj`,
      "ET",
    ];
    this.current.push(parts.join("\n"));
    return textWidth(value, size, bold);
  }

  /** Writes wrapped text at the cursor and advances past it. */
  paragraph(value: string, options: TextOptions & { leading?: number } = {}): void {
    const size = options.size ?? 10;
    const leading = options.leading ?? size * 1.35;
    const box = options.width ?? this.contentWidth;

    for (const line of wrapText(value, size, box, options.bold)) {
      this.ensure(leading);
      this.move(leading);
      this.text(line, this.margin, { ...options, width: box });
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, weight = 0.6,
       color: [number, number, number] = [0.78, 0.75, 0.7]): void {
    this.current.push(
      `${n(color[0])} ${n(color[1])} ${n(color[2])} RG ${n(weight)} w ` +
        `${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`,
    );
  }

  rect(x: number, y: number, w: number, h: number,
       fill: [number, number, number]): void {
    this.current.push(
      `${n(fill[0])} ${n(fill[1])} ${n(fill[2])} rg ` +
        `${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`,
    );
  }

  /**
   * A bordered table that breaks across pages and repeats its header row.
   *
   * Cells wrap, so a long name grows its row instead of colliding with the next
   * column - the failure that makes most hand-rolled PDF tables unusable.
   */
  table(options: TableOptions): void {
    const size = options.size ?? 8.5;
    const padX = 4;
    const padY = 4;
    const leading = size * 1.25;
    const minHeight = options.minRowHeight ?? 0;

    // Declared widths are normalised rather than trusted. A recap table has as
    // many columns as the roster has RTs, so the set cannot be hand-totalled to
    // 100 - and a set that totals 74 would otherwise draw a header bar wider
    // than its own columns.
    const declared = options.columns.reduce((sum, c) => sum + c.width, 0) || 1;
    const widths = options.columns.map(
      (column) => (column.width / declared) * this.contentWidth,
    );

    // Header labels wrap on the same rule as the cells, so "RT 001" in a narrow
    // column stacks instead of running into its neighbour.
    const headerLines = options.columns.map((column, index) =>
      wrapText(column.label, size, widths[index] - padX * 2, true),
    );
    const headerHeight =
      Math.max(...headerLines.map((lines) => lines.length), 1) * leading +
      padY * 2;

    // Never calls `ensure`: it is invoked either on a page already checked for
    // room, or from `newPage`, where re-entering the page break would recurse.
    const drawHeader = () => {
      this.move(headerHeight);
      const top = this.cursor + headerHeight;

      this.rect(this.margin, this.cursor, this.contentWidth, headerHeight,
        options.headerFill ?? [0.09, 0.29, 0.22]);

      let x = this.margin;
      options.columns.forEach((column, index) => {
        const saved = this.cursor;
        headerLines[index].forEach((line, lineIndex) => {
          this.cursor = top - padY - size * 0.82 - lineIndex * leading;
          this.text(line, x + padX, {
            size,
            bold: true,
            align: column.align ?? "left",
            width: widths[index] - padX * 2,
            color: [1, 1, 1],
          });
        });
        this.cursor = saved;
        x += widths[index];
      });

      this.line(this.margin, top, this.margin + this.contentWidth, top, 0.6);
    };

    // A header stranded at the foot of a page with no row under it is worse
    // than a page break, so require room for both before starting.
    this.ensure(headerHeight + Math.max(minHeight, leading + padY * 2));
    drawHeader();
    this.setPageHeader(drawHeader);

    if (options.rows.length === 0) {
      const height = leading + padY * 2;
      this.ensure(height);
      this.move(height);
      const saved = this.cursor;
      this.cursor = this.cursor + padY + size * 0.22;
      this.text(options.emptyMessage ?? "Tidak ada data.", this.margin, {
        size,
        align: "center",
        width: this.contentWidth,
        color: [0.42, 0.39, 0.36],
      });
      this.cursor = saved;
    }

    options.rows.forEach((row, rowIndex) => {
      const cells = row.map((value, index) =>
        wrapText(String(value ?? ""), size, widths[index] - padX * 2),
      );
      const lines = Math.max(...cells.map((c) => c.length), 1);
      const height = Math.max(lines * leading + padY * 2, minHeight);

      this.ensure(height);
      this.move(height);
      const top = this.cursor + height;

      if (options.zebra !== false && rowIndex % 2 === 1) {
        this.rect(this.margin, this.cursor, this.contentWidth, height,
          [0.97, 0.96, 0.94]);
      }

      let x = this.margin;
      cells.forEach((cellLines, index) => {
        const saved = this.cursor;
        cellLines.forEach((line, lineIndex) => {
          this.cursor = top - padY - size * 0.82 - lineIndex * leading;
          this.text(line, x + padX, {
            size,
            align: options.columns[index].align ?? "left",
            width: widths[index] - padX * 2,
          });
        });
        this.cursor = saved;

        // Column separator, drawn short of the row edges so the grid reads as
        // a table rather than a cage.
        if (index > 0) {
          this.line(x, this.cursor, x, top, 0.4, [0.86, 0.84, 0.8]);
        }
        x += widths[index];
      });

      this.line(this.margin, this.cursor, this.margin + this.contentWidth,
        this.cursor, 0.4, [0.86, 0.84, 0.8]);
    });

    this.setPageHeader(null);
  }

  /** Serialises the document. */
  build(): Uint8Array {
    const tail = this.current.join("\n");
    const streams = tail.length > 0 ? [...this.pages, tail] : [...this.pages];
    if (streams.length === 0) streams.push("");
    const pageCount = streams.length;

    const objects: string[] = [];
    const add = (body: string): number => {
      objects.push(body);
      return objects.length; // 1-based object numbers
    };

    // 1: Catalog, 2: Pages, 3: F1, 4: F2, then page/content pairs.
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(""); // placeholder for Pages, filled once kids are known
    add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica " +
        "/Encoding /WinAnsiEncoding >>",
    );
    add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold " +
        "/Encoding /WinAnsiEncoding >>",
    );

    const pageRefs: number[] = [];
    for (let i = 0; i < pageCount; i += 1) {
      const content = streams[i] ?? "";
      const contentRef = add(
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      );
      const pageRef = add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(this.width)} ${n(
          this.height,
        )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
          `/Contents ${contentRef} 0 R >>`,
      );
      pageRefs.push(pageRef);
    }

    objects[1] =
      `<< /Type /Pages /Count ${pageCount} /Kids [` +
      `${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] >>`;

    let file = "%PDF-1.4\n%âãÏÓ\n";
    const offsets: number[] = [];

    objects.forEach((body, index) => {
      offsets.push(file.length);
      file += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefStart = file.length;
    file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      file += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    file +=
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefStart}\n%%EOF\n`;

    // Every character is Latin-1 by construction, so the byte length matches
    // the string length the offsets above were measured against.
    const bytes = new Uint8Array(file.length);
    for (let i = 0; i < file.length; i += 1) {
      bytes[i] = file.charCodeAt(i) & 0xff;
    }
    return bytes;
  }
}
