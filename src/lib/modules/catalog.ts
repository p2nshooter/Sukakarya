/**
 * The platform module catalogue: 300 features a village website can switch on.
 *
 * This file is the single source of truth. `scripts/generate-module-seed.mjs`
 * compiles it into `db/seed/modules.sql`, so the database and the type system
 * can never drift apart.
 *
 * Nothing here is village specific. A village turns modules on and off through
 * the `module_settings` table; the defaults below only decide the state of a
 * brand new tenant on first install.
 */

export const MODULE_PLACEMENTS = [
  "header",
  "navigation",
  "section",
  "sidebar",
  "footer",
  "page",
  "admin",
  "system",
] as const;

export type ModulePlacement = (typeof MODULE_PLACEMENTS)[number];

export const ACCESS_LEVELS = [
  "public",
  "authenticated",
  "citizen",
  "staff",
  "admin",
  "super_admin",
] as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export interface ModuleDefinition {
  /** Catalogue number, 1..300. Stable across releases. */
  code: number;
  /** Stable slug used as the primary key and in `page_sections.module_id`. */
  id: string;
  name: string;
  category: string;
  placement: ModulePlacement;
  defaultEnabled: boolean;
  defaultVisible: boolean;
  defaultAccess: AccessLevel;
  /** Core modules cannot be uninstalled by a village operator. */
  isCore: boolean;
}

type RawModule = [
  code: number,
  id: string,
  name: string,
  category: string,
  placement: ModulePlacement,
];

// Ordered exactly like the platform specification.
const RAW: RawModule[] = [
  [1, "hero-banner", "Hero Banner", "home", "section"],
  [2, "banner-event", "Banner Event", "home", "section"],
  [3, "banner-pengumuman", "Banner Pengumuman", "home", "section"],
  [4, "running-text", "Running Text", "home", "header"],
  [5, "popup-banner", "Popup Banner", "home", "section"],
  [6, "video-banner", "Video Banner", "home", "section"],
  [7, "countdown-event", "Countdown Event", "home", "section"],
  [8, "sambutan-kepala-desa", "Sambutan Kepala Desa", "home", "section"],
  [9, "quick-menu", "Quick Menu", "home", "section"],
  [10, "statistik-penduduk", "Statistik Penduduk", "statistik", "section"],
  [11, "statistik-rt", "Statistik RT", "statistik", "section"],
  [12, "statistik-rw", "Statistik RW", "statistik", "section"],
  [13, "statistik-dusun", "Statistik Dusun", "statistik", "section"],
  [14, "statistik-agama", "Statistik Agama", "statistik", "section"],
  [15, "statistik-pendidikan", "Statistik Pendidikan", "statistik", "section"],
  [16, "statistik-pekerjaan", "Statistik Pekerjaan", "statistik", "section"],
  [17, "statistik-umur", "Statistik Umur", "statistik", "section"],
  [18, "statistik-gender", "Statistik Gender", "statistik", "section"],
  [19, "cuaca", "Cuaca", "home", "header"],
  [20, "jam-digital", "Jam Digital", "home", "header"],
  [21, "kalender", "Kalender", "home", "sidebar"],
  [22, "kalender-event", "Kalender Event", "event", "section"],
  [23, "agenda-desa", "Agenda Desa", "event", "section"],
  [24, "berita", "Berita", "berita", "page"],
  [25, "pengumuman", "Pengumuman", "berita", "page"],
  [26, "artikel", "Artikel", "berita", "page"],
  [27, "berita-populer", "Berita Populer", "berita", "sidebar"],
  [28, "berita-trending", "Berita Trending", "berita", "sidebar"],
  [29, "berita-pilihan", "Berita Pilihan", "berita", "section"],
  [30, "breaking-news", "Breaking News", "berita", "header"],
  [31, "event", "Event", "event", "page"],
  [32, "kegiatan-desa", "Kegiatan Desa", "event", "page"],
  [33, "program-desa", "Program Desa", "pemerintahan", "page"],
  [34, "video-profil", "Video Profil", "home", "section"],
  [35, "profil-desa", "Profil Desa", "profil", "page"],
  [36, "sejarah-desa", "Sejarah Desa", "profil", "page"],
  [37, "visi", "Visi", "profil", "page"],
  [38, "misi", "Misi", "profil", "page"],
  [39, "motto", "Motto", "profil", "page"],
  [40, "filosofi-logo", "Filosofi Logo", "profil", "page"],
  [41, "logo-desa", "Logo Desa", "profil", "header"],
  [42, "favicon", "Favicon", "sistem", "system"],
  [43, "struktur-organisasi", "Struktur Organisasi", "profil", "page"],
  [44, "kepala-desa", "Kepala Desa", "profil", "page"],
  [45, "sekretaris-desa", "Sekretaris Desa", "profil", "page"],
  [46, "kasi", "Kasi", "profil", "page"],
  [47, "kaur", "Kaur", "profil", "page"],
  [48, "bpd", "BPD", "profil", "page"],
  [49, "lpm", "LPM", "profil", "page"],
  [50, "pkk", "PKK", "profil", "page"],
  [51, "karang-taruna", "Karang Taruna", "profil", "page"],
  [52, "linmas", "Linmas", "profil", "page"],
  [53, "rt", "RT", "profil", "page"],
  [54, "rw", "RW", "profil", "page"],
  [55, "dusun", "Dusun", "profil", "page"],
  [56, "demografi", "Demografi", "profil", "page"],
  [57, "geografi", "Geografi", "profil", "page"],
  [58, "potensi-desa", "Potensi Desa", "potensi", "page"],
  [59, "prestasi-desa", "Prestasi Desa", "profil", "page"],
  [60, "apbdes", "APBDes", "transparansi", "page"],
  [61, "realisasi-apbdes", "Realisasi APBDes", "transparansi", "page"],
  [62, "transparansi", "Transparansi", "transparansi", "page"],
  [63, "ppid", "PPID", "ppid", "page"],
  [64, "rpjmdes", "RPJMDes", "pemerintahan", "page"],
  [65, "rkpdes", "RKPDes", "pemerintahan", "page"],
  [66, "perdes", "Perdes", "pemerintahan", "page"],
  [67, "perkades", "Perkades", "pemerintahan", "page"],
  [68, "sop-pelayanan", "SOP Pelayanan", "pemerintahan", "page"],
  [69, "pelayanan-online", "Pelayanan Online", "layanan", "page"],
  [70, "surat-domisili", "Surat Domisili", "layanan", "page"],
  [71, "surat-usaha", "Surat Usaha", "layanan", "page"],
  [72, "surat-kelahiran", "Surat Kelahiran", "layanan", "page"],
  [73, "surat-kematian", "Surat Kematian", "layanan", "page"],
  [74, "surat-pindah", "Surat Pindah", "layanan", "page"],
  [75, "surat-nikah", "Surat Nikah", "layanan", "page"],
  [76, "surat-tidak-mampu", "Surat Tidak Mampu", "layanan", "page"],
  [77, "tracking-surat", "Tracking Surat", "layanan", "page"],
  [78, "qr-verification", "QR Verification", "layanan", "system"],
  [79, "digital-signature", "Digital Signature", "layanan", "admin"],
  [80, "pengaduan", "Pengaduan", "pengaduan", "page"],
  [81, "aspirasi", "Aspirasi", "pengaduan", "page"],
  [82, "polling", "Polling", "engagement", "sidebar"],
  [83, "survey", "Survey", "engagement", "page"],
  [84, "faq", "FAQ", "home", "section"],
  [85, "download-center", "Download Center", "download", "page"],
  [86, "formulir", "Formulir", "download", "page"],
  [87, "dokumen", "Dokumen", "download", "page"],
  [88, "arsip", "Arsip", "download", "admin"],
  [89, "galeri-foto", "Galeri Foto", "galeri", "section"],
  [90, "galeri-video", "Galeri Video", "galeri", "section"],
  [91, "album", "Album", "galeri", "page"],
  [92, "drone-view", "Drone View", "galeri", "page"],
  [93, "panorama-360", "Panorama 360", "galeri", "page"],
  [94, "live-streaming", "Live Streaming", "galeri", "section"],
  [95, "cctv", "CCTV", "galeri", "page"],
  [96, "umkm", "UMKM", "umkm", "page"],
  [97, "marketplace", "Marketplace", "umkm", "page"],
  [98, "produk", "Produk", "umkm", "page"],
  [99, "katalog", "Katalog", "umkm", "page"],
  [100, "qris", "QRIS", "umkm", "section"],
  [101, "wisata", "Wisata", "wisata", "page"],
  [102, "kuliner", "Kuliner", "wisata", "page"],
  [103, "penginapan", "Penginapan", "wisata", "page"],
  [104, "destinasi", "Destinasi", "wisata", "page"],
  [105, "investasi", "Investasi", "potensi", "page"],
  [106, "pertanian", "Pertanian", "potensi", "page"],
  [107, "perikanan", "Perikanan", "potensi", "page"],
  [108, "peternakan", "Peternakan", "potensi", "page"],
  [109, "industri", "Industri", "potensi", "page"],
  [110, "bumdes", "BUMDes", "potensi", "page"],
  [111, "koperasi", "Koperasi", "potensi", "page"],
  [112, "sekolah", "Sekolah", "direktori", "page"],
  [113, "paud", "PAUD", "direktori", "page"],
  [114, "posyandu", "Posyandu", "direktori", "page"],
  [115, "puskesmas", "Puskesmas", "direktori", "page"],
  [116, "klinik", "Klinik", "direktori", "page"],
  [117, "rumah-sakit", "Rumah Sakit", "direktori", "page"],
  [118, "masjid", "Masjid", "direktori", "page"],
  [119, "musholla", "Musholla", "direktori", "page"],
  [120, "gereja", "Gereja", "direktori", "page"],
  [121, "pura", "Pura", "direktori", "page"],
  [122, "vihara", "Vihara", "direktori", "page"],
  [123, "polisi", "Polisi", "direktori", "page"],
  [124, "damkar", "Damkar", "direktori", "page"],
  [125, "pln", "PLN", "direktori", "page"],
  [126, "pdam", "PDAM", "direktori", "page"],
  [127, "bank", "Bank", "direktori", "page"],
  [128, "atm", "ATM", "direktori", "page"],
  [129, "kantor-pos", "Kantor Pos", "direktori", "page"],
  [130, "maps", "Maps", "kontak", "section"],
  [131, "direktori", "Direktori", "direktori", "page"],
  [132, "kontak", "Kontak", "kontak", "page"],
  [133, "whatsapp", "WhatsApp", "kontak", "footer"],
  [134, "email", "Email", "kontak", "footer"],
  [135, "facebook", "Facebook", "kontak", "footer"],
  [136, "instagram", "Instagram", "kontak", "footer"],
  [137, "tiktok", "TikTok", "kontak", "footer"],
  [138, "youtube", "YouTube", "kontak", "footer"],
  [139, "telegram", "Telegram", "kontak", "footer"],
  [140, "x", "X", "kontak", "footer"],
  [141, "linkedin", "LinkedIn", "kontak", "footer"],
  [142, "search", "Search", "pencarian", "header"],
  [143, "global-search", "Global Search", "pencarian", "system"],
  [144, "breadcrumb", "Breadcrumb", "navigasi", "navigation"],
  [145, "mega-menu", "Mega Menu", "navigasi", "navigation"],
  [146, "sidebar", "Sidebar", "navigasi", "sidebar"],
  [147, "footer", "Footer", "navigasi", "footer"],
  [148, "copyright", "Copyright", "navigasi", "footer"],
  [149, "visitor-counter", "Visitor Counter", "analitik", "footer"],
  [150, "analytics", "Analytics", "analitik", "system"],
  [151, "dashboard", "Dashboard", "admin", "admin"],
  [152, "admin-panel", "Admin Panel", "admin", "admin"],
  [153, "user-management", "User Management", "admin", "admin"],
  [154, "role", "Role", "admin", "admin"],
  [155, "permission", "Permission", "admin", "admin"],
  [156, "audit-log", "Audit Log", "admin", "admin"],
  [157, "activity-log", "Activity Log", "admin", "admin"],
  [158, "notification", "Notification", "notifikasi", "system"],
  [159, "push-notification", "Push Notification", "notifikasi", "system"],
  [160, "email-notification", "Email Notification", "notifikasi", "system"],
  [161, "whatsapp-notification", "WhatsApp Notification", "notifikasi", "system"],
  [162, "chat", "Chat", "engagement", "section"],
  [163, "live-chat", "Live Chat", "engagement", "section"],
  [164, "ai-chat", "AI Chat", "ai", "section"],
  [165, "ai-faq", "AI FAQ", "ai", "section"],
  [166, "ai-search", "AI Search", "ai", "header"],
  [167, "ai-voice", "AI Voice", "ai", "section"],
  [168, "ai-assistant", "AI Assistant", "ai", "section"],
  [169, "voice-search", "Voice Search", "pencarian", "header"],
  [170, "multi-bahasa", "Multi Bahasa", "bahasa", "header"],
  [171, "dark-mode", "Dark Mode", "tampilan", "header"],
  [172, "light-mode", "Light Mode", "tampilan", "header"],
  [173, "accessibility", "Accessibility", "tampilan", "header"],
  [174, "pwa", "PWA", "pwa", "system"],
  [175, "offline-mode", "Offline Mode", "pwa", "system"],
  [176, "install-app", "Install App", "pwa", "header"],
  [177, "cache", "Cache", "performa", "system"],
  [178, "cdn", "CDN", "performa", "system"],
  [179, "backup", "Backup", "sistem", "admin"],
  [180, "restore", "Restore", "sistem", "admin"],
  [181, "file-manager", "File Manager", "media", "admin"],
  [182, "media-manager", "Media Manager", "media", "admin"],
  [183, "banner-manager", "Banner Manager", "cms", "admin"],
  [184, "menu-manager", "Menu Manager", "cms", "admin"],
  [185, "widget-manager", "Widget Manager", "cms", "admin"],
  [186, "theme-manager", "Theme Manager", "cms", "admin"],
  [187, "seo", "SEO", "seo", "system"],
  [188, "sitemap", "Sitemap", "seo", "system"],
  [189, "robots-txt", "Robots.txt", "seo", "system"],
  [190, "opengraph", "OpenGraph", "seo", "system"],
  [191, "schema", "Schema.org", "seo", "system"],
  [192, "canonical-url", "Canonical URL", "seo", "system"],
  [193, "meta-tag", "Meta Tag", "seo", "system"],
  [194, "tag-manager", "Tag Manager", "seo", "system"],
  [195, "advertisement", "Advertisement", "engagement", "sidebar"],
  [196, "sponsor", "Sponsor", "engagement", "section"],
  [197, "partner", "Partner", "engagement", "section"],
  [198, "testimoni", "Testimoni", "engagement", "section"],
  [199, "newsletter", "Newsletter", "engagement", "section"],
  [200, "popup", "Popup", "engagement", "section"],
  [201, "cookie-consent", "Cookie Consent", "sistem", "system"],
  [202, "privacy-policy", "Privacy Policy", "sistem", "page"],
  [203, "terms-of-service", "Terms of Service", "sistem", "page"],
  [204, "disclaimer", "Disclaimer", "sistem", "page"],
  [205, "maintenance-mode", "Maintenance Mode", "sistem", "system"],
  [206, "emergency-alert", "Emergency Alert", "darurat", "header"],
  [207, "disaster-alert", "Disaster Alert", "darurat", "header"],
  [208, "flood-alert", "Flood Alert", "darurat", "header"],
  [209, "earthquake-alert", "Earthquake Alert", "darurat", "header"],
  [210, "weather-alert", "Weather Alert", "darurat", "header"],
  [211, "village-map", "Village Map", "peta", "section"],
  [212, "asset-map", "Asset Map", "peta", "page"],
  [213, "land-map", "Land Map", "peta", "page"],
  [214, "gis", "GIS", "peta", "page"],
  [215, "sdgs-desa", "SDGs Desa", "program", "page"],
  [216, "idm", "IDM", "program", "page"],
  [217, "stunting", "Stunting", "program", "page"],
  [218, "bantuan-sosial", "Bantuan Sosial", "program", "page"],
  [219, "pkh", "PKH", "program", "page"],
  [220, "blt", "BLT", "program", "page"],
  [221, "bpjs", "BPJS", "program", "page"],
  [222, "pajak", "Pajak", "program", "page"],
  [223, "retribusi", "Retribusi", "program", "page"],
  [224, "e-office", "E-Office", "eoffice", "admin"],
  [225, "e-letter", "E-Letter", "eoffice", "admin"],
  [226, "e-archive", "E-Archive", "eoffice", "admin"],
  [227, "e-meeting", "E-Meeting", "eoffice", "admin"],
  [228, "e-absensi", "E-Absensi", "eoffice", "admin"],
  [229, "booking-layanan", "Booking Layanan", "layanan", "page"],
  [230, "nomor-antrian", "Nomor Antrian", "layanan", "page"],
  [231, "kalender-tanam", "Kalender Tanam", "potensi", "page"],
  [232, "harga-komoditas", "Harga Komoditas", "potensi", "section"],
  [233, "perpustakaan-digital", "Perpustakaan Digital", "edukasi", "page"],
  [234, "e-learning", "E-Learning", "edukasi", "page"],
  [235, "pelatihan", "Pelatihan", "edukasi", "page"],
  [236, "lowongan-kerja", "Lowongan Kerja", "edukasi", "page"],
  [237, "rekrutmen", "Rekrutmen", "edukasi", "page"],
  [238, "relawan", "Relawan", "edukasi", "page"],
  [239, "donasi", "Donasi", "engagement", "section"],
  [240, "crowdfunding", "Crowdfunding", "engagement", "page"],
  [241, "marketplace-desa", "Marketplace Desa", "umkm", "page"],
  [242, "event-registration", "Event Registration", "event", "page"],
  [243, "ticketing", "Ticketing", "event", "page"],
  [244, "rating", "Rating", "engagement", "system"],
  [245, "review", "Review", "engagement", "system"],
  [246, "bookmark", "Bookmark", "engagement", "system"],
  [247, "favorite", "Favorite", "engagement", "system"],
  [248, "share", "Share", "konten", "system"],
  [249, "print", "Print", "konten", "system"],
  [250, "pdf-viewer", "PDF Viewer", "media", "system"],
  [251, "audio-player", "Audio Player", "media", "system"],
  [252, "video-player", "Video Player", "media", "system"],
  [253, "image-viewer", "Image Viewer", "media", "system"],
  [254, "watermark", "Watermark", "media", "system"],
  [255, "lazy-load", "Lazy Load", "performa", "system"],
  [256, "image-optimizer", "Image Optimizer", "performa", "system"],
  [257, "export-pdf", "Export PDF", "data", "admin"],
  [258, "export-excel", "Export Excel", "data", "admin"],
  [259, "import-data", "Import Data", "data", "admin"],
  [260, "api", "API", "integrasi", "system"],
  [261, "webhook", "Webhook", "integrasi", "system"],
  [262, "cron-job", "Cron Job", "integrasi", "system"],
  [263, "queue-monitor", "Queue Monitor", "integrasi", "admin"],
  [264, "system-monitor", "System Monitor", "integrasi", "admin"],
  [265, "health-check", "Health Check", "integrasi", "system"],
  [266, "server-status", "Server Status", "integrasi", "admin"],
  [267, "database-status", "Database Status", "integrasi", "admin"],
  [268, "security-center", "Security Center", "keamanan", "admin"],
  [269, "firewall", "Firewall", "keamanan", "system"],
  [270, "waf", "WAF", "keamanan", "system"],
  [271, "captcha", "CAPTCHA", "keamanan", "system"],
  [272, "login", "Login", "auth", "page"],
  [273, "register", "Register", "auth", "page"],
  [274, "forgot-password", "Forgot Password", "auth", "page"],
  [275, "profile", "Profile", "auth", "page"],
  [276, "inbox", "Inbox", "auth", "page"],
  [277, "outbox", "Outbox", "auth", "page"],
  [278, "chatbot", "Chatbot", "ai", "section"],
  [279, "forum-warga", "Forum Warga", "engagement", "page"],
  [280, "komentar", "Komentar", "engagement", "system"],
  [281, "like", "Like", "engagement", "system"],
  [282, "bookmark-artikel", "Bookmark Artikel", "engagement", "system"],
  [283, "arsip-berita", "Arsip Berita", "arsip", "page"],
  [284, "arsip-event", "Arsip Event", "arsip", "page"],
  [285, "arsip-pengumuman", "Arsip Pengumuman", "arsip", "page"],
  [286, "timeline-desa", "Timeline Desa", "profil", "page"],
  [287, "milestone-desa", "Milestone Desa", "profil", "page"],
  [288, "galeri-sejarah", "Galeri Sejarah", "profil", "page"],
  [289, "statistik-pengunjung", "Statistik Pengunjung", "analitik", "admin"],
  [290, "dashboard-kepala-desa", "Dashboard Kepala Desa", "admin", "admin"],
  [291, "dashboard-operator", "Dashboard Operator", "admin", "admin"],
  [292, "dashboard-warga", "Dashboard Warga", "auth", "page"],
  [293, "smart-village", "Smart Village", "iot", "page"],
  [294, "iot-dashboard", "IoT Dashboard", "iot", "admin"],
  [295, "sensor-banjir", "Sensor Banjir", "iot", "section"],
  [296, "sensor-kualitas-udara", "Sensor Kualitas Udara", "iot", "section"],
  [297, "sensor-cuaca", "Sensor Cuaca", "iot", "section"],
  [298, "sensor-air", "Sensor Air", "iot", "section"],
  [299, "integrasi-mobile-app", "Integrasi Mobile App", "integrasi", "system"],
  [300, "developer-mode", "Developer Mode", "sistem", "admin"],
];

/**
 * Modules rendered on the public site of a freshly provisioned village.
 * Mirrors the "DEFAULT SHOW" section of the platform specification.
 */
const DEFAULT_VISIBLE = new Set<string>([
  // Home
  "hero-banner", "banner-event", "banner-pengumuman", "running-text",
  "sambutan-kepala-desa", "quick-menu", "statistik-penduduk", "berita",
  "event", "agenda-desa", "galeri-foto", "galeri-video", "video-profil",
  "potensi-desa", "umkm", "wisata", "download-center", "faq", "maps",
  "kontak", "footer", "copyright", "mega-menu", "sidebar", "search",
  // Profil
  "profil-desa", "sejarah-desa", "visi", "misi", "struktur-organisasi",
  "kepala-desa", "sekretaris-desa", "kasi", "kaur", "rt", "rw",
  "geografi", "demografi",
  // Pemerintahan
  "program-desa", "rpjmdes", "rkpdes", "perdes", "sop-pelayanan",
  // Berita & event
  "pengumuman", "artikel", "kalender-event",
  // Transparansi & PPID
  "apbdes", "realisasi-apbdes", "transparansi", "ppid",
  // Layanan & pengaduan
  "pelayanan-online", "tracking-surat", "pengaduan",
  // Kontak channels
  "whatsapp", "email",
  // Auth entry points
  "login",
]);

/**
 * Modules that ship switched off entirely. Mirrors the "DISABLE" section of the
 * specification: heavy, paid or hardware-dependent features a village opts into.
 */
const DEFAULT_DISABLED = new Set<string>([
  "live-streaming", "cctv", "iot-dashboard", "smart-village", "sensor-banjir",
  "sensor-kualitas-udara", "sensor-cuaca", "sensor-air", "voice-search",
  "ai-voice", "crowdfunding", "marketplace", "marketplace-desa", "qris",
  "ticketing", "event-registration", "forum-warga", "komentar", "rating",
  "review", "bookmark", "bookmark-artikel", "favorite", "like", "polling",
  "survey", "donasi", "drone-view", "panorama-360", "audio-player",
  "cuaca", "jam-digital", "weather-alert", "developer-mode",
]);

/** Modules that must always exist for the site to render at all. */
const CORE = new Set<string>([
  "footer", "mega-menu", "sidebar", "seo", "sitemap", "robots-txt",
  "admin-panel", "dashboard", "user-management", "role", "permission",
  "audit-log", "media-manager", "file-manager", "login",
]);

/** Placement-driven default access. Overrides are listed below. */
const ACCESS_BY_PLACEMENT: Partial<Record<ModulePlacement, AccessLevel>> = {
  admin: "admin",
};

const ACCESS_OVERRIDES: Record<string, AccessLevel> = {
  "dashboard-warga": "citizen",
  profile: "citizen",
  inbox: "citizen",
  outbox: "citizen",
  aspirasi: "citizen",
  "booking-layanan": "citizen",
  "digital-signature": "staff",
  arsip: "staff",
  "e-office": "staff",
  "e-letter": "staff",
  "e-archive": "staff",
  "e-meeting": "staff",
  "e-absensi": "staff",
  "queue-monitor": "staff",
  "server-status": "super_admin",
  "database-status": "super_admin",
  "security-center": "super_admin",
  "developer-mode": "super_admin",
  backup: "super_admin",
  restore: "super_admin",
  role: "super_admin",
  permission: "super_admin",
};

export const MODULE_CATALOG: ModuleDefinition[] = RAW.map(
  ([code, id, name, category, placement]) => {
    const disabled = DEFAULT_DISABLED.has(id);
    return {
      code,
      id,
      name,
      category,
      placement,
      defaultEnabled: !disabled,
      defaultVisible: !disabled && DEFAULT_VISIBLE.has(id),
      defaultAccess:
        ACCESS_OVERRIDES[id] ?? ACCESS_BY_PLACEMENT[placement] ?? "public",
      isCore: CORE.has(id),
    };
  },
);

export const MODULE_BY_ID: ReadonlyMap<string, ModuleDefinition> = new Map(
  MODULE_CATALOG.map((m) => [m.id, m]),
);

export const MODULE_CATEGORIES: string[] = [
  ...new Set(MODULE_CATALOG.map((m) => m.category)),
].sort();

export function getModule(id: string): ModuleDefinition | undefined {
  return MODULE_BY_ID.get(id);
}
