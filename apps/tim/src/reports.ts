import { audit, type Session } from "./auth";
import { Pdf } from "./pdf";
import { buildDocx, buildXlsx, type DocTable } from "./ooxml";

/**
 * Reports.
 *
 * The original application had four printed documents and produced all of them
 * the same way: build HTML into a hidden div, call `window.print()`, and hope
 * the operator's browser offered "Save as PDF". On a phone it usually does not,
 * and nothing at all was downloadable as Word or Excel.
 *
 * Here each report is defined once as data - a title, some meta lines, a set of
 * tables, a signature block - and five renderers turn that one definition into
 * PDF, Word, Excel, CSV or a print-ready page. Adding a sixth report means
 * writing one builder, not five.
 *
 * NIK is the reason this file is careful. A report is the easiest way for a
 * roster to leave the building, so the column is masked to its last four digits
 * unless an admin explicitly asks for it, and every download is audited with
 * whether it carried full numbers.
 */

interface Env {
  DB: D1Database;
  ARCHIVE: R2Bucket;
}

export const REPORT_KINDS = {
  daftar: {
    title: "DAFTAR ANGGOTA",
    description: "Daftar lengkap dengan kolom tanda tangan.",
    landscape: false,
  },
  hadir: {
    title: "DAFTAR HADIR KEGIATAN",
    description: "Absensi kegiatan, dengan kolom kegiatan, tanggal dan tempat.",
    landscape: false,
  },
  rekap: {
    title: "REKAPITULASI ANGGOTA",
    description: "Ringkasan jumlah per dusun, RT, TPS, jabatan dan status.",
    landscape: false,
  },
  kartu: {
    title: "KARTU ANGGOTA",
    description: "Kartu siap potong, delapan per halaman A4.",
    landscape: false,
  },
  kontak: {
    title: "DAFTAR KONTAK",
    description: "Nama, jabatan dan nomor telepon untuk koordinasi lapangan.",
    landscape: false,
  },
  wilayah: {
    title: "SEBARAN PER WILAYAH",
    description: "Anggota dikelompokkan per dusun dan RT, satu blok per dusun.",
    landscape: false,
  },
} as const;

export type ReportKind = keyof typeof REPORT_KINDS;
export const FORMATS = ["pdf", "docx", "xlsx", "csv", "html"] as const;
export type ReportFormat = (typeof FORMATS)[number];

export function isReportKind(value: string): value is ReportKind {
  return Object.prototype.hasOwnProperty.call(REPORT_KINDS, value);
}

export function isFormat(value: string): value is ReportFormat {
  return (FORMATS as readonly string[]).includes(value);
}

export interface ReportFilters {
  kadus?: string;
  rt?: string;
  tps?: string;
  jabatan?: string;
  status?: string;
  q?: string;
}

export interface ReportRequest {
  kind: ReportKind;
  format: ReportFormat;
  filters: ReportFilters;
  /** Only honoured for admins; anyone else always gets masked numbers. */
  includeNik?: boolean;
  /** Meta for the attendance sheet. */
  kegiatan?: string;
  tanggal?: string;
  tempat?: string;
}

/* -------------------------------------------------------------------------- */
/* Org identity                                                                */
/* -------------------------------------------------------------------------- */

export const IDENTITY_KEYS = [
  "team",
  "calon",
  "periode",
  "desa",
  "kecamatan",
  "kabupaten",
  "motto",
  "ketua",
  "jabatan_ttd",
] as const;

export type IdentityKey = (typeof IDENTITY_KEYS)[number];
export type Identity = Record<IdentityKey, string>;

export async function loadIdentity(
  db: D1Database,
  orgId: string,
): Promise<Identity> {
  const { results } = await db
    .prepare("SELECT key, value FROM org_settings WHERE org_id = ?")
    .bind(orgId)
    .all<{ key: string; value: string }>();

  const stored = new Map(results.map((row) => [row.key, row.value]));
  const org = await db
    .prepare("SELECT name, region, motto FROM orgs WHERE id = ?")
    .bind(orgId)
    .first<{ name: string; region: string | null; motto: string | null }>();

  const identity = {} as Identity;
  for (const key of IDENTITY_KEYS) identity[key] = stored.get(key) ?? "";

  // Fall back to what the org row already knows, so a team that has never
  // opened the settings tab still gets a sensible letterhead.
  if (!identity.team) identity.team = org?.name ?? "TIM";
  if (!identity.motto) identity.motto = org?.motto ?? "";
  if (!identity.desa && org?.region) identity.desa = org.region;
  if (!identity.jabatan_ttd) identity.jabatan_ttd = "Ketua Tim";

  return identity;
}

export async function saveIdentity(
  db: D1Database,
  session: Session,
  values: Record<string, unknown>,
  ipHash: string | null,
): Promise<void> {
  const statements = IDENTITY_KEYS.filter((key) =>
    Object.prototype.hasOwnProperty.call(values, key),
  ).map((key) =>
    db
      .prepare(
        `INSERT INTO org_settings (org_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT (org_id, key)
         DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      )
      .bind(session.orgId, key, String(values[key] ?? "").trim().slice(0, 160)),
  );

  if (statements.length === 0) return;
  await db.batch(statements);

  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: "settings.update",
    summary: `${statements.length} isian identitas diperbarui`,
    ipHash,
  });
}

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

interface MemberRow {
  nama: string;
  nik: string | null;
  nik_last4: string | null;
  jk: string | null;
  tgl_lahir: string | null;
  kadus: string | null;
  rt: string | null;
  tps: string | null;
  alamat: string | null;
  jabatan: string | null;
  hp: string | null;
  status: string;
  tgl_gabung: string | null;
  perekrut: string | null;
}

/** Reports read the whole matching set, so the cap is a guard, not a page. */
const MAX_ROWS = 20000;

async function fetchMembers(
  db: D1Database,
  orgId: string,
  filters: ReportFilters,
  withNik: boolean,
): Promise<MemberRow[]> {
  const conditions = ["org_id = ?", "deleted_at IS NULL"];
  const binds: unknown[] = [orgId];

  for (const field of ["kadus", "rt", "tps", "jabatan", "status"] as const) {
    const value = filters[field];
    if (value) {
      conditions.push(`${field} = ?`);
      binds.push(value.slice(0, 80));
    }
  }
  if (filters.q) {
    conditions.push("(nama LIKE ? OR kadus LIKE ? OR jabatan LIKE ?)");
    const like = `%${filters.q.slice(0, 60)}%`;
    binds.push(like, like, like);
  }

  // The full column is selected only when the caller has already been checked
  // against the admin role, so a masked report never reads it at all.
  const nikColumn = withNik ? "nik" : "NULL AS nik";

  const { results } = await db
    .prepare(
      `SELECT nama, ${nikColumn}, nik_last4, jk, tgl_lahir, kadus, rt, tps,
              alamat, jabatan, hp, status, tgl_gabung, perekrut
       FROM members WHERE ${conditions.join(" AND ")}
       ORDER BY COALESCE(kadus, ''), COALESCE(rt, ''), nama
       LIMIT ${MAX_ROWS}`,
    )
    .bind(...binds)
    .all<MemberRow>();

  return results;
}

function maskedNik(row: MemberRow, withNik: boolean): string {
  if (withNik && row.nik) return row.nik;
  // Four asterisks rather than twelve: the column is narrow on A4, and a mask
  // wide enough to wrap pushes every row onto two lines for no extra meaning.
  return row.nik_last4 ? `****${row.nik_last4}` : "-";
}

function korwil(row: MemberRow): string {
  return [row.kadus, row.rt].filter(Boolean).join(" / ");
}

function filterLabel(filters: ReportFilters): string {
  const parts: string[] = [];
  if (filters.kadus) parts.push(`Dusun ${filters.kadus}`);
  if (filters.rt) parts.push(`RT ${filters.rt}`);
  if (filters.tps) parts.push(`TPS ${filters.tps}`);
  if (filters.jabatan) parts.push(filters.jabatan);
  if (filters.status) parts.push(`status ${filters.status}`);
  if (filters.q) parts.push(`pencarian "${filters.q}"`);
  return parts.length > 0 ? parts.join(" • ") : "Seluruh anggota";
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Formats a date in Jakarta time.
 *
 * A Worker runs in UTC, so a report printed at nine in the evening in Indonesia
 * would otherwise be dated the previous day.
 */
function today(): { long: string; short: string } {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const day = now.getUTCDate();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return {
    long: `${day} ${MONTHS[month]} ${year}`,
    short: `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Report model                                                                */
/* -------------------------------------------------------------------------- */

export interface ReportTable {
  caption?: string;
  columns: { label: string; width: number; align?: "left" | "center" | "right" }[];
  rows: string[][];
  /** Extra row height so a signature column can actually be signed. */
  tallRows?: boolean;
}

export interface Report {
  kind: ReportKind;
  title: string;
  subtitle: string;
  letterhead: string[];
  meta: [string, string][];
  tables: ReportTable[];
  signature: { place: string; role: string; name: string } | null;
  footer: string;
  landscape: boolean;
  /** Card layout, present only for the member-card report. */
  cards?: {
    heading: string;
    period: string;
    items: { no: number; rows: [string, string][] }[];
  };
  rowCount: number;
  includesNik: boolean;
}

function letterhead(identity: Identity): string[] {
  const region = (["desa", "kecamatan", "kabupaten"] as const)
    .map((key) => {
      const value = identity[key].trim().toUpperCase();
      if (!value) return "";
      const label = key.toUpperCase();
      // Someone typing "Desa Contoh" into the Desa field should not get a
      // letterhead reading "DESA DESA CONTOH".
      return value.startsWith(`${label} `) ? value : `${label} ${value}`;
    })
    .filter(Boolean)
    .join("  -  ");

  return [
    (identity.team || "TIM PEMENANGAN").toUpperCase(),
    identity.calon,
    identity.periode,
    region,
  ].filter(Boolean);
}

/** Builds the report model. Every renderer consumes this and nothing else. */
export async function buildReport(
  db: D1Database,
  session: Session,
  request: ReportRequest,
): Promise<Report> {
  const withNik = request.includeNik === true && session.role === "admin";
  const identity = await loadIdentity(db, session.orgId);
  const members = await fetchMembers(
    db,
    session.orgId,
    request.filters,
    withNik,
  );
  const date = today();
  const scope = filterLabel(request.filters);

  const base = {
    kind: request.kind,
    title: REPORT_KINDS[request.kind].title,
    subtitle: identity.motto,
    letterhead: letterhead(identity),
    signature: {
      place: `${identity.desa || identity.kabupaten || ""}, ${date.long}`.replace(
        /^, /,
        "",
      ),
      role: identity.jabatan_ttd || "Ketua Tim",
      name: identity.ketua || "…………………………",
    },
    footer:
      `${identity.team}${identity.calon ? ` — ${identity.calon}` : ""}` +
      ` • Dicetak ${date.short} • ${members.length} orang` +
      `${withNik ? " • memuat NIK lengkap" : " • NIK disamarkan"}`,
    landscape: REPORT_KINDS[request.kind].landscape as boolean,
    rowCount: members.length,
    includesNik: withNik,
  };

  if (request.kind === "kartu") {
    return {
      ...base,
      meta: [
        ["KELOMPOK", scope],
        ["JUMLAH", `${members.length} kartu`],
        ["DICETAK", date.short],
      ],
      tables: [],
      cards: {
        heading:
          `${identity.team}${identity.calon ? ` — ${identity.calon}` : ""}`,
        period: identity.periode,
        items: members.map((row, index) => ({
          no: index + 1,
          // TPS is on the card because a polling-station witness has to know
          // which station they are assigned to without opening the app.
          rows: [
            ["NAMA", row.nama],
            ["NIK", maskedNik(row, withNik)],
            ["KORWIL", korwil(row) || "-"],
            ["TPS", row.tps || "-"],
            ["JABATAN", row.jabatan || "-"],
            ["NO. HP", row.hp || "-"],
            ["STATUS", row.status],
          ] as [string, string][],
        })),
      },
    };
  }

  if (request.kind === "rekap") {
    return { ...base, meta: [
      ["KELOMPOK", scope],
      ["JUMLAH", `${members.length} orang`],
      ["DICETAK", date.short],
    ], tables: recapTables(members) };
  }

  if (request.kind === "kontak") {
    return {
      ...base,
      meta: [
        ["KELOMPOK", scope],
        ["JUMLAH", `${members.length} orang`],
        ["DICETAK", date.short],
      ],
      tables: [
        {
          columns: [
            { label: "No", width: 6, align: "center" },
            { label: "Nama Lengkap", width: 30 },
            { label: "Korwil", width: 20 },
            { label: "Jabatan", width: 22 },
            { label: "No. HP", width: 22 },
          ],
          rows: members.map((row, index) => [
            String(index + 1),
            row.nama,
            korwil(row) || "-",
            row.jabatan || "-",
            row.hp || "-",
          ]),
        },
      ],
    };
  }

  if (request.kind === "wilayah") {
    return {
      ...base,
      meta: [
        ["KELOMPOK", scope],
        ["JUMLAH", `${members.length} orang`],
        ["DICETAK", date.short],
      ],
      tables: areaTables(members, withNik),
    };
  }

  // daftar and hadir share a layout; the attendance sheet drops the Korwil
  // column to make room for a wider signature box and carries event meta.
  const attendance = request.kind === "hadir";
  const dots = "..........................................";

  const meta: [string, string][] = attendance
    ? [
        ["KEGIATAN", request.kegiatan?.trim() || dots],
        ["HARI / TANGGAL", request.tanggal?.trim() || dots],
        ["TEMPAT", request.tempat?.trim() || dots],
        ["KELOMPOK", scope],
        ["JUMLAH", `${members.length} orang`],
      ]
    : [
        ["KELOMPOK", scope],
        ["JUMLAH", `${members.length} orang`],
        ["DICETAK", date.short],
      ];

  // Widths are sized to the longest value each column actually holds: an
  // Indonesian mobile number is twelve or thirteen digits, and a signature box
  // has to be wide enough to sign in. The NIK column has two sizes because a
  // masked value is eight characters and a full one is sixteen - printing the
  // full number in the narrow column wraps every row onto two lines.
  const nikWidth = withNik ? 17 : 12;
  const columns: ReportTable["columns"] = attendance
    ? [
        { label: "No", width: 5, align: "center" },
        { label: "Nama Lengkap", width: withNik ? 24 : 27 },
        { label: "NIK", width: nikWidth, align: "center" },
        { label: "Jabatan", width: withNik ? 18 : 20 },
        { label: "No. HP", width: 15, align: "center" },
        { label: "Tanda Tangan", width: withNik ? 21 : 20, align: "center" },
      ]
    : [
        { label: "No", width: 5, align: "center" },
        { label: "Nama Lengkap", width: withNik ? 22 : 24 },
        { label: "NIK", width: nikWidth, align: "center" },
        { label: "Dusun / RT", width: withNik ? 15 : 17 },
        { label: "Jabatan", width: withNik ? 14 : 16 },
        { label: "No. HP", width: 14, align: "center" },
        { label: "Tanda Tangan", width: withNik ? 13 : 12, align: "center" },
      ];

  const rows = members.map((row, index) => {
    const common = [
      String(index + 1),
      row.nama,
      maskedNik(row, withNik),
    ];
    const tail = [row.jabatan || "-", row.hp || "-", `${index + 1}.`];
    return attendance ? [...common, ...tail] : [...common, korwil(row) || "-", ...tail];
  });

  return {
    ...base,
    meta,
    tables: [{ columns, rows, tallRows: true }],
  };
}

/** Cross-tabulations: the same four the original app printed. */
function recapTables(members: MemberRow[]): ReportTable[] {
  const total = members.length || 1;

  const dusunList = [...new Set(members.map((m) => m.kadus || "(kosong)"))].sort();
  const rtList = [...new Set(members.map((m) => m.rt).filter(Boolean))].sort(
    (a, b) => String(a).localeCompare(String(b), "id", { numeric: true }),
  ) as string[];

  // The RT columns are labelled with the number alone - "RT" is already in the
  // caption, and repeating it in a 20pt column only makes the header collide
  // with its neighbour. Widths are relative; the renderer normalises them.
  const matrixColumns: ReportTable["columns"] = [
    { label: "Dusun", width: 26 },
    ...rtList.map((rt) => ({
      label: rt,
      width: 5,
      align: "center" as const,
    })),
    { label: "L", width: 5, align: "center" as const },
    { label: "P", width: 5, align: "center" as const },
    { label: "Aktif", width: 7, align: "center" as const },
    { label: "Total", width: 7, align: "center" as const },
  ];

  const matrixRows = dusunList.map((dusun) => {
    const group = members.filter((m) => (m.kadus || "(kosong)") === dusun);
    return [
      dusun,
      ...rtList.map((rt) => String(group.filter((m) => m.rt === rt).length)),
      String(group.filter((m) => m.jk === "L").length),
      String(group.filter((m) => m.jk === "P").length),
      String(group.filter((m) => m.status === "aktif").length),
      String(group.length),
    ];
  });

  if (matrixRows.length > 0) {
    matrixRows.push([
      "JUMLAH",
      ...rtList.map((rt) => String(members.filter((m) => m.rt === rt).length)),
      String(members.filter((m) => m.jk === "L").length),
      String(members.filter((m) => m.jk === "P").length),
      String(members.filter((m) => m.status === "aktif").length),
      String(members.length),
    ]);
  }

  const breakdown = (
    caption: string,
    pick: (row: MemberRow) => string,
  ): ReportTable => {
    const counts = new Map<string, number>();
    for (const row of members) {
      const key = pick(row) || "(kosong)";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      caption,
      columns: [
        { label: "Kelompok", width: 56 },
        { label: "Jumlah", width: 22, align: "center" },
        { label: "Persentase", width: 22, align: "center" },
      ],
      rows: sorted.map(([key, count]) => [
        key,
        String(count),
        `${((count / total) * 100).toFixed(1)}%`,
      ]),
    };
  };

  return [
    {
      caption: `Rekap per dusun dan RT${rtList.length > 0 ? " (kolom angka = nomor RT)" : ""}`,
      columns: matrixColumns,
      rows: matrixRows,
    },
    breakdown("Rekap per TPS", (row) => row.tps ?? ""),
    breakdown("Rekap per jabatan", (row) => row.jabatan ?? ""),
    breakdown("Rekap per status", (row) => row.status),
  ];
}

/** One table per dusun, which is how a coordinator actually reads the roster. */
function areaTables(members: MemberRow[], withNik: boolean): ReportTable[] {
  const groups = new Map<string, MemberRow[]>();
  for (const row of members) {
    const key = row.kadus || "(tanpa dusun)";
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "id"))
    .map(([dusun, rows]) => ({
      caption: `${dusun} — ${rows.length} orang`,
      columns: [
        { label: "No", width: 6, align: "center" as const },
        { label: "Nama Lengkap", width: 30 },
        { label: "NIK", width: 19, align: "center" as const },
        { label: "RT", width: 8, align: "center" as const },
        { label: "TPS", width: 8, align: "center" as const },
        { label: "Jabatan", width: 17 },
        { label: "Status", width: 12, align: "center" as const },
      ],
      rows: rows.map((row, index) => [
        String(index + 1),
        row.nama,
        maskedNik(row, withNik),
        row.rt || "-",
        row.tps || "-",
        row.jabatan || "-",
        row.status,
      ]),
    }));
}

/* -------------------------------------------------------------------------- */
/* Renderers                                                                   */
/* -------------------------------------------------------------------------- */

const BRAND: [number, number, number] = [0.051, 0.42, 0.32];
const INK: [number, number, number] = [0.1, 0.09, 0.08];
const DIM: [number, number, number] = [0.42, 0.39, 0.36];

function renderPdf(report: Report): Uint8Array {
  const pdf = new Pdf({ landscape: report.landscape });

  if (report.cards) return renderCardsPdf(pdf, report);

  // Letterhead
  report.letterhead.forEach((line, index) => {
    const size = index === 0 ? 14 : 9;
    pdf.move(index === 0 ? size + 2 : size + 1);
    pdf.text(line, pdf.margin, {
      size,
      bold: index === 0,
      align: "center",
      width: pdf.contentWidth,
      color: index === 0 ? BRAND : DIM,
    });
  });

  pdf.move(8);
  pdf.line(pdf.margin, pdf.y, pdf.margin + pdf.contentWidth, pdf.y, 1.6, BRAND);
  pdf.move(24);

  pdf.text(report.title, pdf.margin, {
    size: 13,
    bold: true,
    align: "center",
    width: pdf.contentWidth,
    color: INK,
  });

  if (report.subtitle) {
    pdf.move(13);
    pdf.text(report.subtitle, pdf.margin, {
      size: 8.5,
      align: "center",
      width: pdf.contentWidth,
      color: DIM,
    });
  }

  pdf.move(20);
  for (const [label, value] of report.meta) {
    pdf.move(12);
    pdf.text(label, pdf.margin, { size: 8.5, bold: true, color: INK });
    pdf.text(":", pdf.margin + 88, { size: 8.5, color: INK });
    pdf.text(value, pdf.margin + 96, { size: 8.5, color: INK });
  }

  pdf.move(14);

  report.tables.forEach((table, index) => {
    if (table.caption) {
      pdf.ensure(30);
      pdf.move(index === 0 ? 12 : 20);
      pdf.text(table.caption, pdf.margin, { size: 10, bold: true, color: BRAND });
      pdf.move(8);
    }
    pdf.table({
      columns: table.columns,
      rows: table.rows,
      minRowHeight: table.tallRows ? 26 : 0,
      headerFill: BRAND,
      emptyMessage: "Tidak ada data untuk saringan ini.",
    });
  });

  if (report.signature) {
    pdf.ensure(96);
    pdf.move(30);
    const boxWidth = 200;
    const left = pdf.margin + pdf.contentWidth - boxWidth;
    pdf.text(report.signature.place, left, {
      size: 9,
      align: "center",
      width: boxWidth,
      color: INK,
    });
    pdf.move(13);
    pdf.text(report.signature.role, left, {
      size: 9,
      align: "center",
      width: boxWidth,
      color: INK,
    });
    pdf.move(56);
    pdf.text(report.signature.name, left, {
      size: 10,
      bold: true,
      align: "center",
      width: boxWidth,
      color: INK,
    });
    pdf.move(3);
    pdf.line(left + 20, pdf.y, left + boxWidth - 20, pdf.y, 0.6, DIM);
  }

  pdf.ensure(24);
  pdf.move(20);
  pdf.text(report.footer, pdf.margin, { size: 7, color: DIM });

  return pdf.build();
}

/** Eight cards to an A4 page, sized to be cut out with scissors. */
function renderCardsPdf(pdf: Pdf, report: Report): Uint8Array {
  const cards = report.cards!;
  const columns = 2;
  const gap = 14;
  const perPage = 8;
  const rowsPerPage = perPage / columns;
  const cardWidth = (pdf.contentWidth - gap) / columns;
  // Fill the sheet rather than crowding eight cards into the top two thirds:
  // the height is whatever four rows plus their gaps can occupy.
  const cardHeight =
    (pdf.height - pdf.margin * 2 - gap * (rowsPerPage - 1)) / rowsPerPage;
  const lineGap = 16;

  if (cards.items.length === 0) {
    pdf.move(40);
    pdf.text(report.title, pdf.margin, {
      size: 13,
      bold: true,
      align: "center",
      width: pdf.contentWidth,
      color: INK,
    });
    pdf.move(26);
    pdf.text("Tidak ada data untuk saringan ini.", pdf.margin, {
      size: 9,
      align: "center",
      width: pdf.contentWidth,
      color: DIM,
    });
    return pdf.build();
  }

  cards.items.forEach((card, index) => {
    const slot = index % perPage;
    if (slot === 0 && index > 0) pdf.newPage();
    if (slot === 0) pdf.move(6);

    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const x = pdf.margin + column * (cardWidth + gap);
    const top = pdf.height - pdf.margin - row * (cardHeight + gap);
    const bottom = top - cardHeight;

    // Border, drawn as four rules so the card can be cut out along them.
    pdf.line(x, top, x + cardWidth, top, 0.8, BRAND);
    pdf.line(x, bottom, x + cardWidth, bottom, 0.5, DIM);
    pdf.line(x, bottom, x, top, 0.5, DIM);
    pdf.line(x + cardWidth, bottom, x + cardWidth, top, 0.5, DIM);

    // Header band
    pdf.rect(x, top - 24, cardWidth, 24, BRAND);
    const saved = pdf.y;
    pdf.y = top - 16;
    pdf.text(cards.heading, x + 10, {
      size: 8.5,
      bold: true,
      color: [1, 1, 1],
      width: cardWidth - 20,
    });

    card.rows.forEach(([label, value], line) => {
      pdf.y = top - 44 - line * lineGap;
      pdf.text(label, x + 10, { size: 7, color: DIM });
      pdf.text(value, x + 62, {
        size: 9,
        bold: true,
        color: INK,
        width: cardWidth - 72,
      });
    });

    pdf.y = bottom + 12;
    pdf.line(x + 10, bottom + 24, x + cardWidth - 10, bottom + 24, 0.4,
      [0.88, 0.86, 0.82]);
    pdf.text(`No. ${card.no}`, x + 10, { size: 7, color: DIM });
    if (cards.period) {
      pdf.text(cards.period, x + 10, {
        size: 7,
        align: "right",
        width: cardWidth - 20,
        color: DIM,
      });
    }
    pdf.y = saved;
  });

  // Push the cursor below the last row so `build` keeps the final page.
  pdf.y = pdf.margin;
  return pdf.build();
}

async function renderDocx(report: Report): Promise<Uint8Array> {
  const tables: DocTable[] = report.cards
    ? [
        {
          caption: undefined,
          columns: [
            { label: "Kartu", width: 50 },
            { label: "Kartu", width: 50 },
          ],
          rows: chunk(
            report.cards.items.map((card) =>
              [
                `${report.cards!.heading}`,
                ...card.rows.map(([label, value]) => `${label}: ${value}`),
                `No. ${card.no}${report.cards!.period ? ` • ${report.cards!.period}` : ""}`,
              ].join("\n"),
            ),
            2,
          ).map((pair) => (pair.length === 2 ? pair : [pair[0], ""])),
          minRowHeight: 1500,
        },
      ]
    : report.tables.map((table) => ({
        caption: table.caption,
        columns: table.columns,
        rows: table.rows,
        minRowHeight: table.tallRows ? 460 : undefined,
      }));

  return buildDocx({
    title: report.title,
    subtitle: report.subtitle || undefined,
    letterhead: report.letterhead,
    meta: report.meta,
    tables,
    signature: report.signature ?? undefined,
    footer: report.footer,
    landscape: report.landscape,
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Excel gets the widest table flattened into one sheet.
 *
 * A workbook is for working with, not for signing, so the signature column is
 * dropped and the meta lines are written above the header where a filter can
 * still be applied to the data underneath.
 */
async function renderXlsx(report: Report): Promise<Uint8Array> {
  if (report.cards) {
    return buildXlsx({
      name: "Kartu",
      columns: [
        { label: "No", width: 6 },
        ...report.cards.items[0]?.rows.map(([label]) => ({
          label,
          width: 22,
        })) ?? [{ label: "Data", width: 30 }],
      ],
      rows: report.cards.items.map((card) => [
        card.no,
        ...card.rows.map(([, value]) => value),
      ]),
    });
  }

  const main = report.tables[0];
  const signatureIndex = main?.columns.findIndex((c) =>
    /tanda tangan/i.test(c.label),
  );
  const keep = (index: number) => index !== signatureIndex;

  const columns = (main?.columns ?? [])
    .filter((_, index) => keep(index))
    .map((column) => ({
      label: column.label,
      width: column.label === "Nama Lengkap" ? 30 : Math.max(10, column.width),
    }));

  const rows = (main?.rows ?? []).map((row) =>
    row.filter((_, index) => keep(index)),
  );

  // Additional tables (the recap breakdowns) are appended under a blank row so
  // one file still carries everything the PDF shows.
  for (const table of report.tables.slice(1)) {
    rows.push([]);
    rows.push([table.caption ?? ""]);
    rows.push(table.columns.map((column) => column.label));
    for (const row of table.rows) rows.push(row);
  }

  return buildXlsx({
    name: report.title.slice(0, 31),
    columns: columns.length > 0 ? columns : [{ label: "Data", width: 40 }],
    rows,
  });
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function renderCsv(report: Report): string {
  const lines: string[] = [];

  lines.push(csvCell(report.title));
  for (const [label, value] of report.meta) {
    lines.push(`${csvCell(label)},${csvCell(value)}`);
  }
  lines.push("");

  if (report.cards) {
    lines.push(["No", ...report.cards.items[0]?.rows.map(([l]) => l) ?? []]
      .map(csvCell).join(","));
    for (const card of report.cards.items) {
      lines.push(
        [String(card.no), ...card.rows.map(([, value]) => value)]
          .map(csvCell)
          .join(","),
      );
    }
  }

  for (const table of report.tables) {
    if (table.caption) lines.push(csvCell(table.caption));
    lines.push(table.columns.map((column) => csvCell(column.label)).join(","));
    for (const row of table.rows) lines.push(row.map(csvCell).join(","));
    lines.push("");
  }

  lines.push(csvCell(report.footer));

  // BOM so Excel on Windows reads the accents rather than mojibake.
  return `﻿${lines.join("\r\n")}`;
}

/**
 * Print-ready HTML.
 *
 * Kept because it is the only format an operator can adjust before printing -
 * change a heading, delete a row - without owning Word. It carries its own
 * `@media print` rules and nothing external, so it prints identically offline.
 */
function renderHtml(report: Report): string {
  const esc = (value: string) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const head = report.letterhead
    .map((line, index) =>
      index === 0
        ? `<div class="t1">${esc(line)}</div>`
        : `<div class="t2">${esc(line)}</div>`,
    )
    .join("");

  const meta = report.meta
    .map(
      ([label, value]) =>
        `<b>${esc(label)}</b><span>:</span><span>${esc(value)}</span>`,
    )
    .join("");

  const body = report.cards
    ? `<div class="cards">${report.cards.items
        .map(
          (card) =>
            `<div class="kartu"><div class="kh">${esc(
              report.cards!.heading,
            )}</div><div class="kb">${card.rows
              .map(
                ([label, value]) =>
                  `<div class="kr"><span>${esc(label)}</span><span>${esc(
                    value,
                  )}</span></div>`,
              )
              .join("")}</div><div class="kf"><span>No. ${
              card.no
            }</span><span>${esc(report.cards!.period)}</span></div></div>`,
        )
        .join("")}</div>`
    : report.tables
        .map(
          (table) =>
            (table.caption ? `<h2>${esc(table.caption)}</h2>` : "") +
            `<table><thead><tr>${table.columns
              .map(
                (column) =>
                  `<th style="width:${column.width}%;text-align:${
                    column.align ?? "left"
                  }">${esc(column.label)}</th>`,
              )
              .join("")}</tr></thead><tbody>${
              table.rows.length === 0
                ? `<tr><td colspan="${table.columns.length}" class="none">Tidak ada data untuk saringan ini.</td></tr>`
                : table.rows
                    .map(
                      (row) =>
                        `<tr${table.tallRows ? ' class="tall"' : ""}>${row
                          .map(
                            (value, index) =>
                              `<td style="text-align:${
                                table.columns[index]?.align ?? "left"
                              }">${esc(value)}</td>`,
                          )
                          .join("")}</tr>`,
                    )
                    .join("")
            }</tbody></table>`,
        )
        .join("");

  const signature = report.signature
    ? `<div class="sign"><div>${esc(report.signature.place)}</div>
<div>${esc(report.signature.role)}</div><div class="nm">${esc(
        report.signature.name,
      )}</div></div>`
    : "";

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(report.title)}</title>
<style>
@page{size:A4 ${report.landscape ? "landscape" : "portrait"};margin:14mm 12mm}
*{box-sizing:border-box}
body{margin:0;padding:18px;background:#f2efe8;color:#1a1815;
  font:11pt/1.45 "Times New Roman",Georgia,serif}
.sheet{max-width:210mm;margin:0 auto;background:#fff;padding:16mm 14mm;
  box-shadow:0 8px 32px -12px rgb(0 0 0/.25)}
.t1{font-size:16pt;font-weight:700;letter-spacing:.04em;color:#0d6b52;text-align:center}
.t2{font-size:10pt;text-align:center;color:#5b554c}
.rule{border:0;border-top:2.5px solid #0d6b52;margin:8px 0 16px}
h1{font-size:13pt;text-align:center;letter-spacing:.05em;margin:0 0 4px}
.sub{text-align:center;font-size:9.5pt;color:#6b645b;margin:0 0 14px;font-style:italic}
.meta{display:grid;grid-template-columns:auto auto 1fr;gap:2px 8px;font-size:10pt;margin-bottom:14px}
.meta b{font-weight:700}
h2{font-size:11pt;color:#0d6b52;margin:16px 0 6px}
table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:10px}
th,td{border:1px solid #cfc8ba;padding:4px 6px;vertical-align:top}
th{background:#0d6b52;color:#fff;font-weight:700;font-size:8.5pt;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
tbody tr:nth-child(even) td{background:#f7f5f1;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
tr.tall td{height:26px}
td.none{text-align:center;color:#6b645b;padding:14px}
.sign{margin-top:26px;width:62mm;margin-left:auto;text-align:center;font-size:10pt}
.sign .nm{margin-top:18mm;font-weight:700;border-top:1px solid #1a1815;padding-top:3px}
.foot{margin-top:18px;border-top:1px solid #e0d9cb;padding-top:6px;
  font-size:7.5pt;color:#9c948a}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.kartu{border:1px solid #cfc8ba;border-radius:3mm;overflow:hidden;
  page-break-inside:avoid;break-inside:avoid}
.kh{background:#0d6b52;color:#fff;padding:2mm 3mm;font-size:8pt;font-weight:700;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.kb{padding:2.5mm 3mm}
.kr{display:grid;grid-template-columns:16mm 1fr;font-size:8pt;line-height:1.5}
.kr span:first-child{color:#6b645b}
.kr span:last-child{font-weight:700;word-break:break-word}
.kf{display:flex;justify-content:space-between;padding:1.5mm 3mm;
  border-top:1px solid #e0d9cb;font-size:7pt;color:#6b645b}
.bar{max-width:210mm;margin:0 auto 14px;display:flex;gap:8px;justify-content:flex-end}
.bar button{appearance:none;border:0;border-radius:8px;padding:9px 16px;font:inherit;
  font-size:14px;font-weight:700;background:#0d6b52;color:#fff;cursor:pointer}
@media print{
  body{background:#fff;padding:0}
  .sheet{max-width:none;padding:0;box-shadow:none}
  .bar{display:none}
  .cards{gap:5mm}
  thead{display:table-header-group}
  tr{page-break-inside:avoid}
}
</style></head><body>
<div class="bar"><button onclick="window.print()">Cetak / Simpan PDF</button></div>
<div class="sheet">
${head}<hr class="rule">
<h1>${esc(report.title)}</h1>
${report.subtitle ? `<p class="sub">${esc(report.subtitle)}</p>` : ""}
<div class="meta">${meta}</div>
${body}
${signature}
<div class="foot">${esc(report.footer)}</div>
</div></body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Delivery                                                                    */
/* -------------------------------------------------------------------------- */

const MIME: Record<ReportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
};

export interface RenderedReport {
  body: Uint8Array | string;
  contentType: string;
  filename: string;
  rows: number;
  includesNik: boolean;
}

export async function renderReport(
  db: D1Database,
  session: Session,
  request: ReportRequest,
  ipHash: string | null,
): Promise<RenderedReport> {
  const report = await buildReport(db, session, request);

  const body =
    request.format === "pdf"
      ? renderPdf(report)
      : request.format === "docx"
        ? await renderDocx(report)
        : request.format === "xlsx"
          ? await renderXlsx(report)
          : request.format === "csv"
            ? renderCsv(report)
            : renderHtml(report);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename =
    `${request.kind}-${slug(report.letterhead[0] ?? "tim")}-${stamp}` +
    `.${request.format}`;

  await audit(db, {
    orgId: session.orgId,
    actorId: session.userId,
    actorEmail: session.email,
    action: report.includesNik ? "report.download_with_nik" : "report.download",
    summary:
      `${request.kind}.${request.format} • ${report.rowCount} baris • ` +
      filterLabel(request.filters),
    ipHash,
  });

  return {
    body,
    contentType: MIME[request.format],
    filename,
    rows: report.rowCount,
    includesNik: report.includesNik,
  };
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tim"
  );
}

/** Distinct values an operator can filter a report by. */
export async function reportOptions(
  db: D1Database,
  orgId: string,
): Promise<Record<string, string[]>> {
  const columns = ["kadus", "rt", "tps", "jabatan"] as const;

  const groups = await Promise.all(
    columns.map((column) =>
      db
        .prepare(
          `SELECT DISTINCT ${column} AS v FROM members
           WHERE org_id = ? AND deleted_at IS NULL AND ${column} IS NOT NULL
             AND ${column} <> ''
           ORDER BY ${column} LIMIT 300`,
        )
        .bind(orgId)
        .all<{ v: string }>(),
    ),
  );

  const options: Record<string, string[]> = {};
  columns.forEach((column, index) => {
    options[column] = groups[index].results.map((row) => row.v);
  });
  return options;
}
