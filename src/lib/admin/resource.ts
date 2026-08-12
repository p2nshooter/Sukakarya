import type { AccessLevel } from "@/lib/access";

/**
 * Declarative CRUD for the content tables.
 *
 * Twelve entities need the same admin surface: list, create, edit, delete. Hand
 * writing four pages each means twelve chances to forget the tenant filter, the
 * access check, the audit entry or the HTML sanitiser. Instead each entity is
 * described once here, and one generic page renders and writes all of them, so
 * those four guarantees are structural rather than remembered.
 *
 * A resource never carries citizen personal data. The tables reachable through
 * this file are village content - officials, businesses, destinations,
 * documents, figures. Letter requests and complaints keep their own bespoke
 * screens, because their rows contain contact details and belong behind
 * narrower handling.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "html"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "media"
  | "boolean"
  | "slug";

export interface ResourceField {
  /** Database column. Also the form control name. */
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** For `select`; value/label pairs. */
  options?: { value: string; label: string }[];
  /** Source column for a generated slug. */
  slugFrom?: string;
  /** Shown in the list table. */
  inList?: boolean;
  /** Column span in the edit form grid. */
  span?: 1 | 2;
  maxLength?: number;
  default?: string | number;
}

export interface ResourceDef {
  /** URL segment under /admin. */
  key: string;
  table: string;
  /** Prefix for generated primary keys. */
  idPrefix: string;
  label: string;
  singular: string;
  description: string;
  /** Minimum access level to reach the screen at all. */
  level: AccessLevel;
  /** Module id that gates the resource; hidden when the module is off. */
  moduleId?: string;
  fields: ResourceField[];
  /** ORDER BY clause used for the listing. */
  orderBy: string;
  /** Column holding the display title in the list. */
  titleField: string;
  /** Set when the table has a soft-delete column. */
  softDelete?: boolean;
  /** Public paths to revalidate after a write. */
  revalidate?: string[];
}

const STATUS_OPTIONS = [
  { value: "published", label: "Terbit" },
  { value: "draft", label: "Draf" },
  { value: "archived", label: "Arsip" },
];

const VISIBLE_FIELD: ResourceField = {
  name: "visible",
  label: "Tampilkan",
  kind: "boolean",
  default: 1,
};

const SORT_FIELD: ResourceField = {
  name: "sort_order",
  label: "Urutan",
  kind: "number",
  hint: "Angka kecil tampil lebih dulu.",
  default: 0,
};

export const RESOURCES: ResourceDef[] = [
  {
    key: "perangkat",
    table: "officials",
    idPrefix: "off",
    label: "Perangkat Desa",
    singular: "perangkat",
    description:
      "Struktur pemerintahan desa, BPD dan lembaga. Ditampilkan pada halaman profil dan sambutan.",
    level: "admin",
    moduleId: "struktur-organisasi",
    orderBy: "unit, sort_order, full_name",
    titleField: "full_name",
    revalidate: ["/", "/profil"],
    fields: [
      { name: "full_name", label: "Nama Lengkap", kind: "text", required: true, inList: true, maxLength: 120 },
      { name: "position", label: "Jabatan", kind: "text", required: true, inList: true, maxLength: 120 },
      {
        name: "unit",
        label: "Lembaga",
        kind: "select",
        inList: true,
        default: "pemerintah_desa",
        options: [
          { value: "pemerintah_desa", label: "Pemerintah Desa" },
          { value: "bpd", label: "BPD" },
          { value: "lpm", label: "LPM" },
          { value: "pkk", label: "PKK" },
          { value: "karang_taruna", label: "Karang Taruna" },
          { value: "rt_rw", label: "RT / RW" },
          { value: "lainnya", label: "Lainnya" },
        ],
      },
      { name: "photo_media_id", label: "Foto", kind: "media" },
      { name: "term_start", label: "Mulai Menjabat", kind: "date" },
      { name: "term_end", label: "Selesai Menjabat", kind: "date" },
      { name: "bio", label: "Biografi / Sambutan", kind: "html", span: 2 },
      VISIBLE_FIELD,
      SORT_FIELD,
    ],
  },

  {
    key: "umkm",
    table: "umkm",
    idPrefix: "umk",
    label: "UMKM",
    singular: "UMKM",
    description: "Usaha mikro warga. Nomor yang dicantumkan adalah kontak usaha, bukan data pribadi.",
    level: "staff",
    moduleId: "umkm",
    orderBy: "is_featured DESC, name",
    titleField: "name",
    softDelete: true,
    revalidate: ["/", "/umkm"],
    fields: [
      { name: "name", label: "Nama Usaha", kind: "text", required: true, inList: true, maxLength: 140 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "name",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      { name: "owner_name", label: "Pemilik / Kelompok", kind: "text", inList: true, maxLength: 120 },
      { name: "cover_media_id", label: "Foto Sampul", kind: "media" },
      { name: "logo_media_id", label: "Logo", kind: "media" },
      { name: "whatsapp", label: "WhatsApp Usaha", kind: "text", hint: "Format 628xxxxxxxxxx.", maxLength: 20 },
      { name: "address", label: "Alamat Usaha", kind: "text", maxLength: 200 },
      { name: "description", label: "Deskripsi", kind: "html", span: 2 },
      { name: "is_featured", label: "Unggulan", kind: "boolean", default: 0 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
    ],
  },

  {
    key: "wisata",
    table: "tourism",
    idPrefix: "trs",
    label: "Wisata",
    singular: "destinasi",
    description: "Destinasi, kuliner dan penginapan yang dipromosikan desa.",
    level: "staff",
    moduleId: "wisata",
    orderBy: "is_featured DESC, name",
    titleField: "name",
    softDelete: true,
    revalidate: ["/", "/wisata"],
    fields: [
      { name: "name", label: "Nama", kind: "text", required: true, inList: true, maxLength: 140 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "name",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      {
        name: "kind",
        label: "Jenis",
        kind: "select",
        inList: true,
        default: "destinasi",
        options: [
          { value: "destinasi", label: "Destinasi" },
          { value: "kuliner", label: "Kuliner" },
          { value: "penginapan", label: "Penginapan" },
          { value: "lainnya", label: "Lainnya" },
        ],
      },
      { name: "cover_media_id", label: "Foto Sampul", kind: "media" },
      { name: "ticket_price", label: "Harga Tiket", kind: "currency", hint: "Kosongkan atau 0 untuk gratis." },
      { name: "open_hours", label: "Jam Buka", kind: "text", maxLength: 120 },
      { name: "address", label: "Alamat", kind: "text", maxLength: 200 },
      { name: "contact", label: "Kontak Pengelola", kind: "text", maxLength: 60 },
      { name: "latitude", label: "Lintang", kind: "number" },
      { name: "longitude", label: "Bujur", kind: "number" },
      { name: "description", label: "Deskripsi", kind: "html", span: 2 },
      { name: "is_featured", label: "Unggulan", kind: "boolean", default: 0 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
    ],
  },

  {
    key: "potensi",
    table: "potentials",
    idPrefix: "ptn",
    label: "Potensi Desa",
    singular: "potensi",
    description: "Sektor unggulan dan sumber daya desa.",
    level: "staff",
    moduleId: "potensi-desa",
    orderBy: "sort_order, title",
    titleField: "title",
    revalidate: ["/", "/potensi"],
    fields: [
      { name: "title", label: "Judul", kind: "text", required: true, inList: true, maxLength: 140 },
      {
        name: "sector",
        label: "Sektor",
        kind: "select",
        required: true,
        inList: true,
        default: "pertanian",
        options: [
          { value: "pertanian", label: "Pertanian" },
          { value: "perikanan", label: "Perikanan" },
          { value: "peternakan", label: "Peternakan" },
          { value: "industri", label: "Industri" },
          { value: "wisata", label: "Wisata" },
          { value: "umkm", label: "UMKM" },
          { value: "investasi", label: "Investasi" },
          { value: "bumdes", label: "BUMDes" },
          { value: "koperasi", label: "Koperasi" },
        ],
      },
      { name: "cover_media_id", label: "Foto", kind: "media" },
      { name: "metric_value", label: "Angka Kunci", kind: "text", placeholder: "412 ha", maxLength: 40 },
      { name: "metric_label", label: "Keterangan Angka", kind: "text", placeholder: "lahan produktif", maxLength: 60 },
      { name: "description", label: "Deskripsi", kind: "textarea", span: 2, maxLength: 1000 },
      VISIBLE_FIELD,
      SORT_FIELD,
    ],
  },

  {
    key: "unduhan",
    table: "downloads",
    idPrefix: "dwl",
    label: "Pusat Unduhan",
    singular: "berkas",
    description: "Formulir dan dokumen yang dapat diunduh warga.",
    level: "staff",
    moduleId: "download-center",
    orderBy: "sort_order, title",
    titleField: "title",
    softDelete: true,
    revalidate: ["/", "/download"],
    fields: [
      { name: "title", label: "Judul", kind: "text", required: true, inList: true, maxLength: 160 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "title",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      { name: "media_id", label: "Berkas", kind: "media", hint: "Unggah lewat menu Media terlebih dahulu." },
      { name: "external_url", label: "Atau Tautan Eksternal", kind: "text", maxLength: 500 },
      { name: "description", label: "Keterangan", kind: "textarea", span: 2, maxLength: 600 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
      SORT_FIELD,
    ],
  },

  {
    key: "banner",
    table: "banners",
    idPrefix: "bnr",
    label: "Banner & Pengumuman",
    singular: "banner",
    description:
      "Hero beranda, pengumuman berjalan, dan peringatan darurat. Penempatan menentukan di mana ia muncul.",
    level: "admin",
    orderBy: "placement, sort_order",
    titleField: "title",
    revalidate: ["/"],
    fields: [
      { name: "title", label: "Judul", kind: "text", required: true, inList: true, maxLength: 200 },
      {
        name: "placement",
        label: "Penempatan",
        kind: "select",
        inList: true,
        default: "hero",
        options: [
          { value: "hero", label: "Hero beranda" },
          { value: "announcement", label: "Teks berjalan" },
          { value: "event", label: "Strip event" },
          { value: "emergency", label: "Peringatan darurat" },
          { value: "sidebar", label: "Sisi kanan" },
        ],
      },
      { name: "subtitle", label: "Subjudul", kind: "text", span: 2, maxLength: 300 },
      { name: "media_id", label: "Gambar", kind: "media" },
      { name: "link_url", label: "Tautan", kind: "text", placeholder: "/layanan", maxLength: 300 },
      { name: "link_label", label: "Label Tombol", kind: "text", maxLength: 60 },
      { name: "publish_at", label: "Tayang Mulai", kind: "date" },
      { name: "expire_at", label: "Tayang Sampai", kind: "date" },
      VISIBLE_FIELD,
      SORT_FIELD,
    ],
  },

  {
    key: "faq",
    table: "faqs",
    idPrefix: "faq",
    label: "FAQ",
    singular: "pertanyaan",
    description: "Pertanyaan yang sering diajukan warga.",
    level: "staff",
    moduleId: "faq",
    orderBy: "sort_order, question",
    titleField: "question",
    revalidate: ["/"],
    fields: [
      { name: "question", label: "Pertanyaan", kind: "text", required: true, inList: true, maxLength: 300 },
      { name: "answer", label: "Jawaban", kind: "html", required: true, span: 2 },
      { name: "category", label: "Kategori", kind: "text", inList: true, maxLength: 60 },
      VISIBLE_FIELD,
      SORT_FIELD,
    ],
  },

  {
    key: "statistik",
    table: "statistics",
    idPrefix: "sta",
    label: "Statistik",
    singular: "angka",
    description:
      "Angka agregat desa. Tidak memuat identitas perorangan - hanya jumlah.",
    level: "staff",
    moduleId: "statistik-penduduk",
    orderBy: "dataset, sort_order",
    titleField: "label",
    revalidate: ["/"],
    fields: [
      { name: "label", label: "Nama Data", kind: "text", required: true, inList: true, maxLength: 120 },
      { name: "value", label: "Nilai", kind: "number", required: true, inList: true },
      {
        name: "dataset",
        label: "Kelompok",
        kind: "select",
        inList: true,
        default: "penduduk",
        options: [
          { value: "penduduk", label: "Kependudukan" },
          { value: "wilayah", label: "Wilayah" },
          { value: "pendidikan", label: "Pendidikan" },
          { value: "pekerjaan", label: "Pekerjaan" },
          { value: "agama", label: "Agama" },
          { value: "umur", label: "Kelompok Umur" },
        ],
      },
      { name: "unit", label: "Satuan", kind: "text", default: "jiwa", maxLength: 20 },
      { name: "period", label: "Periode", kind: "text", placeholder: "2026", maxLength: 20 },
      VISIBLE_FIELD,
      SORT_FIELD,
    ],
  },

  {
    key: "apbdes",
    table: "apbdes",
    idPrefix: "apb",
    label: "APBDes",
    singular: "pos anggaran",
    description: "Anggaran dan realisasi per pos. Ditampilkan pada halaman transparansi.",
    level: "admin",
    moduleId: "apbdes",
    orderBy: "fiscal_year DESC, section, sort_order",
    titleField: "item",
    revalidate: ["/", "/transparansi"],
    fields: [
      { name: "item", label: "Uraian", kind: "text", required: true, inList: true, maxLength: 200 },
      { name: "fiscal_year", label: "Tahun Anggaran", kind: "number", required: true, inList: true, default: new Date().getFullYear() },
      {
        name: "section",
        label: "Kelompok",
        kind: "select",
        required: true,
        inList: true,
        default: "pendapatan",
        options: [
          { value: "pendapatan", label: "Pendapatan" },
          { value: "belanja", label: "Belanja" },
          { value: "pembiayaan", label: "Pembiayaan" },
        ],
      },
      { name: "category", label: "Kategori", kind: "text", required: true, maxLength: 160 },
      { name: "budget_amount", label: "Anggaran", kind: "currency", required: true, default: 0 },
      { name: "actual_amount", label: "Realisasi", kind: "currency", default: 0 },
      { name: "note", label: "Catatan", kind: "textarea", span: 2, maxLength: 500 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published" },
      SORT_FIELD,
    ],
  },

  {
    key: "agenda",
    table: "events",
    idPrefix: "evt",
    label: "Agenda & Event",
    singular: "agenda",
    description: "Kegiatan desa yang dijadwalkan.",
    level: "staff",
    moduleId: "event",
    orderBy: "starts_at DESC",
    titleField: "title",
    softDelete: true,
    revalidate: ["/", "/event"],
    fields: [
      { name: "title", label: "Judul", kind: "text", required: true, inList: true, maxLength: 200 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "title",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      { name: "starts_at", label: "Mulai", kind: "date", required: true, inList: true },
      { name: "ends_at", label: "Selesai", kind: "date" },
      { name: "location", label: "Lokasi", kind: "text", inList: true, maxLength: 200 },
      { name: "organizer", label: "Penyelenggara", kind: "text", maxLength: 140 },
      { name: "cover_media_id", label: "Foto", kind: "media" },
      { name: "description", label: "Deskripsi", kind: "html", span: 2 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
    ],
  },

  {
    key: "galeri",
    table: "albums",
    idPrefix: "alb",
    label: "Album Galeri",
    singular: "album",
    description: "Kumpulan foto atau video kegiatan.",
    level: "staff",
    moduleId: "galeri-foto",
    orderBy: "sort_order, title",
    titleField: "title",
    softDelete: true,
    revalidate: ["/", "/galeri"],
    fields: [
      { name: "title", label: "Judul Album", kind: "text", required: true, inList: true, maxLength: 200 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "title",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      {
        name: "kind",
        label: "Jenis",
        kind: "select",
        inList: true,
        default: "photo",
        options: [
          { value: "photo", label: "Foto" },
          { value: "video", label: "Video" },
        ],
      },
      { name: "cover_media_id", label: "Sampul", kind: "media" },
      { name: "event_date", label: "Tanggal Kegiatan", kind: "date" },
      { name: "description", label: "Keterangan", kind: "textarea", span: 2, maxLength: 600 },
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
      SORT_FIELD,
    ],
  },

  {
    key: "layanan",
    table: "services",
    idPrefix: "svc",
    label: "Layanan Surat",
    singular: "layanan",
    description:
      "Jenis surat yang dapat diajukan warga. Kolom formulir ditulis sebagai JSON dan langsung membentuk form pengajuan.",
    level: "admin",
    moduleId: "pelayanan-online",
    orderBy: "sort_order, name",
    titleField: "name",
    revalidate: ["/", "/layanan"],
    fields: [
      { name: "name", label: "Nama Layanan", kind: "text", required: true, inList: true, maxLength: 160 },
      {
        name: "slug",
        label: "Slug URL",
        kind: "slug",
        slugFrom: "name",
        hint: "Kosongkan saja - dibuatkan otomatis dari judul.",
      },
      { name: "description", label: "Deskripsi Singkat", kind: "textarea", span: 2, maxLength: 500 },
      { name: "requirements", label: "Persyaratan", kind: "html", span: 2 },
      {
        name: "form_schema",
        label: "Kolom Formulir (JSON)",
        kind: "textarea",
        span: 2,
        maxLength: 4000,
        default: "[]",
        hint: 'Contoh: [{"name":"keperluan","label":"Keperluan","type":"text","required":true}]',
      },
      {
        name: "letter_template",
        label: "Naskah Surat",
        kind: "textarea",
        span: 2,
        maxLength: 8000,
        hint:
          "Teks surat dengan {{penanda}}. Tersedia: {{nomor_surat}} {{nama_desa}} " +
          "{{sebutan_desa}} {{kecamatan}} {{kabupaten}} {{provinsi}} {{alamat_desa}} " +
          "{{nama_kepala_desa}} {{jabatan_kepala_desa}} {{nama_pemohon}} {{kontak_pemohon}} " +
          "{{tanggal_surat}} {{berlaku_sampai}} {{nomor_tiket}}. Kolom formulir juga " +
          "bisa dipakai, misalnya {{keperluan}}.",
      },
      {
        name: "valid_days",
        label: "Masa Berlaku (hari)",
        kind: "number",
        default: 0,
        hint: "0 berarti tidak ada masa berlaku.",
      },
      { name: "sla_days", label: "Estimasi (hari kerja)", kind: "number", default: 3, inList: true },
      { name: "fee", label: "Biaya", kind: "currency", default: 0 },
      {
        name: "requires_login",
        label: "Wajib punya akun",
        kind: "boolean",
        default: 0,
        hint: "Aktifkan hanya untuk surat yang menyangkut keadaan pribadi.",
      },
      VISIBLE_FIELD,
      { name: "status", label: "Status", kind: "select", options: STATUS_OPTIONS, default: "published", inList: true },
      SORT_FIELD,
    ],
  },
];

export function findResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((resource) => resource.key === key);
}

/** Columns the generic writer is allowed to touch, plus the tenant key. */
export function columnsOf(resource: ResourceDef): string[] {
  return resource.fields.map((field) => field.name);
}
