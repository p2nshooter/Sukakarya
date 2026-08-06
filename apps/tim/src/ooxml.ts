import { xmlEscape, zip } from "./zip";

/**
 * Word and Excel writers.
 *
 * Both formats are a ZIP of XML parts, so the same archive writer serves both.
 * Only the parts a reader actually requires are written - a document, its
 * relationships and a content-type map - which keeps the output small and
 * leaves nothing to go stale.
 *
 * The point of producing these rather than only PDF: a village secretary
 * usually has to edit the list before it is signed, and a PDF cannot be edited.
 */

export type Align = "left" | "center" | "right";

export interface DocColumn {
  label: string;
  /** Share of the table width, in percent. */
  width: number;
  align?: Align;
}

export interface DocTable {
  caption?: string;
  columns: DocColumn[];
  rows: string[][];
  /** Row height in twips, so a signature column has room to sign in. */
  minRowHeight?: number;
}

export interface DocumentSpec {
  title: string;
  subtitle?: string;
  /** Lines of the letterhead, largest first. */
  letterhead: string[];
  meta: [string, string][];
  tables: DocTable[];
  signature?: { place: string; role: string; name: string };
  footer?: string;
  landscape?: boolean;
}

const BRAND = "0D6B52";
const RULE = "D9D3C7";

const CONTENT_TYPES_DOCX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS_DOCX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
<w:sz w:val="20"/><w:szCs w:val="20"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal">
<w:name w:val="Normal"/><w:qFormat/>
</w:style>
</w:styles>`;

/** One run of text. Word needs `xml:space` or it eats leading spaces. */
function run(text: string, options: { bold?: boolean; size?: number;
  color?: string; caps?: boolean } = {}): string {
  const properties = [
    options.bold ? "<w:b/>" : "",
    options.caps ? "<w:caps/>" : "",
    options.size ? `<w:sz w:val="${options.size * 2}"/>` : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("");

  return (
    `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ""}` +
    `<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`
  );
}

function paragraph(
  content: string,
  options: { align?: Align; spaceAfter?: number; spaceBefore?: number } = {},
): string {
  const alignment =
    options.align && options.align !== "left"
      ? `<w:jc w:val="${options.align}"/>`
      : "";
  const spacing =
    `<w:spacing w:before="${options.spaceBefore ?? 0}" ` +
    `w:after="${options.spaceAfter ?? 60}"/>`;
  return `<w:p><w:pPr>${spacing}${alignment}</w:pPr>${content}</w:p>`;
}

function cell(
  content: string,
  widthPct: number,
  options: { align?: Align; fill?: string; bold?: boolean; size?: number;
    color?: string } = {},
): string {
  const shading = options.fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.fill}"/>`
    : "";

  return (
    `<w:tc><w:tcPr><w:tcW w:w="${Math.round(widthPct * 50)}" w:type="pct"/>` +
    `${shading}<w:vAlign w:val="center"/>` +
    `<w:tcMar><w:top w:w="50" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/>` +
    `<w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>` +
    `</w:tcPr>` +
    paragraph(
      run(content, {
        bold: options.bold,
        size: options.size ?? 9,
        color: options.color,
      }),
      { align: options.align, spaceAfter: 0 },
    ) +
    `</w:tc>`
  );
}

function table(spec: DocTable): string {
  const borders =
    `<w:tblBorders>` +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map(
        (edge) =>
          `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="${RULE}"/>`,
      )
      .join("") +
    `</w:tblBorders>`;

  const header =
    `<w:tr><w:trPr><w:tblHeader/></w:trPr>` +
    spec.columns
      .map((column) =>
        cell(column.label, column.width, {
          align: column.align,
          fill: BRAND,
          bold: true,
          color: "FFFFFF",
          size: 8.5,
        }),
      )
      .join("") +
    `</w:tr>`;

  const height = spec.minRowHeight
    ? `<w:trPr><w:trHeight w:val="${spec.minRowHeight}" w:hRule="atLeast"/></w:trPr>`
    : "";

  const body =
    spec.rows.length > 0
      ? spec.rows
          .map(
            (row) =>
              `<w:tr>${height}` +
              row
                .map((value, index) =>
                  cell(String(value ?? ""), spec.columns[index].width, {
                    align: spec.columns[index].align,
                  }),
                )
                .join("") +
              `</w:tr>`,
          )
          .join("")
      : `<w:tr>${cell("Tidak ada data untuk saringan ini.", 100, {
          align: "center",
        })}</w:tr>`;

  const caption = spec.caption
    ? paragraph(run(spec.caption, { bold: true, size: 10 }), {
        spaceBefore: 200,
        spaceAfter: 60,
      })
    : "";

  return (
    caption +
    `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${borders}` +
    `<w:tblLayout w:type="fixed"/></w:tblPr>${header}${body}</w:tbl>`
  );
}

export async function buildDocx(spec: DocumentSpec): Promise<Uint8Array> {
  const body: string[] = [];

  // Letterhead
  spec.letterhead.forEach((line, index) => {
    body.push(
      paragraph(
        run(line, {
          bold: index === 0,
          size: index === 0 ? 13 : 9.5,
          caps: index === 0,
          color: index === 0 ? BRAND : "5B554C",
        }),
        { align: "center", spaceAfter: index === spec.letterhead.length - 1 ? 40 : 0 },
      ),
    );
  });

  body.push(
    `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="18" w:space="4" ` +
      `w:color="${BRAND}"/></w:pBdr><w:spacing w:after="220"/></w:pPr></w:p>`,
  );

  body.push(
    paragraph(run(spec.title, { bold: true, size: 13, caps: true }), {
      align: "center",
      spaceAfter: spec.subtitle ? 20 : 160,
    }),
  );

  if (spec.subtitle) {
    body.push(
      paragraph(run(spec.subtitle, { size: 9, color: "6B645B" }), {
        align: "center",
        spaceAfter: 160,
      }),
    );
  }

  for (const [label, value] of spec.meta) {
    body.push(
      paragraph(
        run(`${label.padEnd(18, " ")}: `, { bold: true, size: 9 }) +
          run(value, { size: 9 }),
        { spaceAfter: 20 },
      ),
    );
  }

  if (spec.meta.length > 0) body.push(paragraph("", { spaceAfter: 160 }));

  for (const spec_table of spec.tables) body.push(table(spec_table));

  if (spec.signature) {
    body.push(paragraph("", { spaceAfter: 320 }));
    // A right-aligned signature block, the shape every official Indonesian
    // list ends with.
    body.push(
      paragraph(run(spec.signature.place, { size: 9 }), {
        align: "right",
        spaceAfter: 20,
      }),
    );
    body.push(
      paragraph(run(spec.signature.role, { size: 9 }), {
        align: "right",
        spaceAfter: 700,
      }),
    );
    body.push(
      paragraph(run(spec.signature.name, { bold: true, size: 10 }), {
        align: "right",
        spaceAfter: 0,
      }),
    );
  }

  if (spec.footer) {
    body.push(
      paragraph(run(spec.footer, { size: 7.5, color: "9C948A" }), {
        spaceBefore: 260,
      }),
    );
  }

  // A4: 11906 x 16838 twips, swapped when landscape.
  const pageWidth = spec.landscape ? 16838 : 11906;
  const pageHeight = spec.landscape ? 11906 : 16838;
  const sectPr =
    `<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"` +
    `${spec.landscape ? ' w:orient="landscape"' : ""}/>` +
    `<w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="990" ` +
    `w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body.join("")}${sectPr}</w:body></w:document>`;

  return zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES_DOCX },
    { name: "_rels/.rels", data: ROOT_RELS_DOCX },
    { name: "word/_rels/document.xml.rels", data: DOC_RELS },
    { name: "word/styles.xml", data: STYLES },
    { name: "word/document.xml", data: document },
  ]);
}

/* -------------------------------------------------------------------------- */
/* Excel                                                                       */
/* -------------------------------------------------------------------------- */

const CONTENT_TYPES_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

/** Two cell formats: index 0 plain, index 1 the bold header on brand fill. */
const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF${BRAND}"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
</cellXfs>
</styleSheet>`;

function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - remainder) / 26);
  }
  return name;
}

export interface SheetSpec {
  name: string;
  columns: { label: string; width?: number }[];
  rows: (string | number | null)[][];
}

export async function buildXlsx(sheet: SheetSpec): Promise<Uint8Array> {
  const cols = sheet.columns
    .map(
      (column, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${
          column.width ?? 18
        }" customWidth="1"/>`,
    )
    .join("");

  const cellXml = (
    value: string | number | null,
    rowIndex: number,
    colIndex: number,
    style: number,
  ): string => {
    const ref = `${columnName(colIndex)}${rowIndex}`;
    if (value === null || value === "") {
      return `<c r="${ref}" s="${style}"/>`;
    }
    // Numbers are written as numbers so Excel can total a column, but only
    // when the text round-trips exactly - a leading zero on an ID number or a
    // phone number must survive, so those stay text.
    if (
      typeof value === "number" ||
      (/^-?\d+(\.\d+)?$/.test(String(value)) &&
        String(Number(value)) === String(value))
    ) {
      return `<c r="${ref}" s="${style}"><v>${Number(value)}</v></c>`;
    }
    return (
      `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">` +
      `${xmlEscape(String(value))}</t></is></c>`
    );
  };

  const headerRow =
    `<row r="1" ht="20" customHeight="1">` +
    sheet.columns
      .map((column, index) => cellXml(column.label, 1, index, 1))
      .join("") +
    `</row>`;

  const bodyRows = sheet.rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 2}">` +
        row.map((value, colIndex) =>
          cellXml(value, rowIndex + 2, colIndex, 0),
        ).join("") +
        `</row>`,
    )
    .join("");

  const lastColumn = columnName(Math.max(sheet.columns.length - 1, 0));
  const lastRow = sheet.rows.length + 1;

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${lastColumn}${lastRow}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${headerRow}${bodyRows}</sheetData>
<autoFilter ref="A1:${lastColumn}${lastRow}"/>
</worksheet>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xmlEscape(sheet.name.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  return zip([
    { name: "[Content_Types].xml", data: CONTENT_TYPES_XLSX },
    { name: "_rels/.rels", data: ROOT_RELS_XLSX },
    { name: "xl/_rels/workbook.xml.rels", data: WORKBOOK_RELS },
    { name: "xl/styles.xml", data: XLSX_STYLES },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/worksheets/sheet1.xml", data: worksheet },
  ]);
}
