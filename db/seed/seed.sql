-- Baseline seed: roles, permissions, and the tenant this deployment serves.
--
-- The tenant is Desa Sukakarya. Adding a second village means inserting another
-- `villages` row (plus its menus and sections) and pointing a custom domain or
-- DEFAULT_VILLAGE_SLUG at it.
--
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

INSERT INTO roles (id, slug, name, description, level, is_system) VALUES
  ('rol_super_admin', 'super_admin', 'Super Admin', 'Akses penuh lintas desa', 100, 1),
  ('rol_admin', 'admin', 'Administrator', 'Administrator situs desa', 80, 1),
  ('rol_kepala_desa', 'kepala_desa', 'Kepala Desa', 'Kepala desa', 70, 1),
  ('rol_sekretaris', 'sekretaris_desa', 'Sekretaris Desa', 'Sekretaris desa', 65, 1),
  ('rol_operator', 'operator', 'Operator', 'Operator dan editor konten', 40, 1),
  ('rol_perangkat', 'perangkat_desa', 'Perangkat Desa', 'Perangkat desa', 35, 1),
  ('rol_warga', 'warga', 'Warga', 'Warga desa terdaftar', 10, 1)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name, description = excluded.description, level = excluded.level;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

INSERT INTO permissions (id, slug, resource, action, description) VALUES
  ('prm_news_read',    'news.read',    'news',    'read',    'Melihat berita'),
  ('prm_news_write',   'news.write',   'news',    'write',   'Membuat dan mengubah berita'),
  ('prm_news_publish', 'news.publish', 'news',    'publish', 'Mempublikasikan berita'),
  ('prm_event_write',  'event.write',  'event',   'write',   'Mengelola event'),
  ('prm_media_write',  'media.write',  'media',   'write',   'Mengunggah media'),
  ('prm_media_delete', 'media.delete', 'media',   'delete',  'Menghapus media'),
  ('prm_page_write',   'page.write',   'page',    'write',   'Mengelola halaman'),
  ('prm_module_write', 'module.write', 'module',  'write',   'Mengubah pengaturan modul'),
  ('prm_letter_review','letter.review','letter',  'review',  'Memproses pengajuan surat'),
  ('prm_complaint_review','complaint.review','complaint','review','Memproses pengaduan'),
  ('prm_user_manage',  'user.manage',  'user',    'manage',  'Mengelola pengguna'),
  ('prm_audit_read',   'audit.read',   'audit',   'read',    'Membaca audit log')
ON CONFLICT (id) DO UPDATE SET description = excluded.description;

-- Admin and above: everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- Village head and secretary: content plus approvals, no user administration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('kepala_desa', 'sekretaris_desa')
  AND p.slug != 'user.manage'
ON CONFLICT DO NOTHING;

-- Operators: content only.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('operator', 'perangkat_desa')
  AND p.slug IN ('news.read', 'news.write', 'event.write', 'media.write',
                 'letter.review', 'complaint.review')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Tenant
--
-- Address, telephone, email, kecamatan and kabupaten are deliberately NULL.
-- They are not known here, and a government site that publishes a plausible
-- but invented office address or telephone number is worse than one that
-- publishes none. Every component guards on the value, so an empty column
-- simply omits its card. Fill them in from Admin > Pengaturan.
--
-- The slug stays `demo` on purpose. It is only ever used to resolve the tenant
-- from DEFAULT_VILLAGE_SLUG and is never shown to a visitor; renaming it would
-- mean the deployed Worker looks for a slug the database does not yet have,
-- because the deploy runs on every push while this seed runs on demand.
-- ---------------------------------------------------------------------------

INSERT INTO villages (
  id, slug, domain, name, entity_label, district, regency, province,
  country, latitude, longitude, map_zoom, address, phone, whatsapp, email,
  primary_color, secondary_color, accent_color, locale, timezone, status
) VALUES (
  'vil_demo', 'demo', NULL, 'Sukakarya', 'Desa',
  NULL, NULL, NULL,
  'Indonesia', NULL, NULL, 14,
  NULL, NULL, NULL,
  NULL,
  '#0d6b52', '#084a39', '#b98a2e', 'id', 'Asia/Jakarta', 'active'
)
ON CONFLICT (id) DO UPDATE SET
  slug         = excluded.slug,
  name         = excluded.name,
  entity_label = excluded.entity_label,
  district     = excluded.district,
  regency      = excluded.regency,
  province     = excluded.province,
  address      = excluded.address,
  phone        = excluded.phone,
  whatsapp     = excluded.whatsapp,
  email        = excluded.email,
  updated_at   = datetime('now');

-- ---------------------------------------------------------------------------
-- Navigation
-- ---------------------------------------------------------------------------

INSERT INTO menus (id, village_id, slug, name) VALUES
  ('mnu_demo_primary', 'vil_demo', 'primary', 'Menu Utama'),
  ('mnu_demo_footer',  'vil_demo', 'footer',  'Menu Footer'),
  ('mnu_demo_quick',   'vil_demo', 'quick',   'Layanan Cepat')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items
  (id, menu_id, parent_id, label, url, icon, module_id, access_level, visible, sort_order)
VALUES
  ('mi_beranda',      'mnu_demo_primary', NULL, 'Beranda',      '/',              NULL, NULL,                'public', 1, 10),
  ('mi_profil',       'mnu_demo_primary', NULL, 'Profil',       '#',              NULL, 'profil-desa',       'public', 1, 20),
  ('mi_profil_sejarah','mnu_demo_primary','mi_profil', 'Sejarah Desa', '/sejarah', NULL, 'sejarah-desa',    'public', 1, 21),
  ('mi_profil_visi',  'mnu_demo_primary', 'mi_profil', 'Visi & Misi', '/visi-misi', NULL, 'visi',           'public', 1, 22),
  ('mi_profil_struktur','mnu_demo_primary','mi_profil','Struktur Organisasi','/struktur-organisasi', NULL, 'struktur-organisasi', 'public', 1, 23),
  ('mi_berita',       'mnu_demo_primary', NULL, 'Berita',       '/berita',        NULL, 'berita',            'public', 1, 30),
  ('mi_event',        'mnu_demo_primary', NULL, 'Event',        '/event',         NULL, 'event',             'public', 1, 40),
  ('mi_galeri',       'mnu_demo_primary', NULL, 'Galeri',       '/galeri',        NULL, 'galeri-foto',       'public', 1, 50),
  ('mi_transparansi', 'mnu_demo_primary', NULL, 'Transparansi', '/transparansi',  NULL, 'transparansi',      'public', 1, 60),
  ('mi_ppid',         'mnu_demo_primary', NULL, 'PPID',         '/ppid',          NULL, 'ppid',              'public', 1, 70),
  ('mi_layanan',      'mnu_demo_primary', NULL, 'Layanan',      '/layanan',       NULL, 'pelayanan-online',  'public', 1, 80),
  ('mi_umkm',         'mnu_demo_primary', NULL, 'UMKM',         '/umkm',          NULL, 'umkm',              'public', 1, 90),
  ('mi_wisata',       'mnu_demo_primary', NULL, 'Wisata',       '/wisata',        NULL, 'wisata',            'public', 1, 100),
  ('mi_pengaduan',    'mnu_demo_primary', NULL, 'Pengaduan',    '/pengaduan',     NULL, 'pengaduan',         'public', 1, 110),

  ('mif_download',    'mnu_demo_footer',  NULL, 'Pusat Unduhan', '/download',     NULL, 'download-center',   'public', 1, 10),
  ('mif_direktori',   'mnu_demo_footer',  NULL, 'Direktori',     '/direktori',    NULL, 'direktori',         'public', 1, 20),
  ('mif_ppid',        'mnu_demo_footer',  NULL, 'PPID',          '/ppid',         NULL, 'ppid',              'public', 1, 30),
  ('mif_lacak',       'mnu_demo_footer',  NULL, 'Lacak Surat',   '/layanan/lacak',NULL, 'tracking-surat',    'public', 1, 40),

  ('miq_surat',       'mnu_demo_quick',   NULL, 'Ajukan Surat',  '/layanan',      '✉', 'pelayanan-online',  'public', 1, 10),
  ('miq_lacak',       'mnu_demo_quick',   NULL, 'Lacak Surat',   '/layanan/lacak','⌕', 'tracking-surat',    'public', 1, 20),
  ('miq_pengaduan',   'mnu_demo_quick',   NULL, 'Pengaduan',     '/pengaduan',    '✎', 'pengaduan',         'public', 1, 30),
  ('miq_apbdes',      'mnu_demo_quick',   NULL, 'APBDes',        '/transparansi', '▤', 'transparansi',      'public', 1, 40),
  ('miq_download',    'mnu_demo_quick',   NULL, 'Unduhan',       '/download',     '⬇', 'download-center',   'public', 1, 50),
  ('miq_direktori',   'mnu_demo_quick',   NULL, 'Direktori',     '/direktori',    '☰', 'direktori',         'public', 1, 60)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Default homepage layout
--
-- This is data, not code: an operator reorders, renames or removes any of these
-- rows from Panel Admin > Tata Letak.
-- ---------------------------------------------------------------------------

INSERT INTO page_sections
  (id, village_id, page_slug, module_id, title, subtitle, variant, config, visible, sort_order)
VALUES
  ('ps_home_hero',    'vil_demo', 'home', 'hero-banner',          NULL, NULL, 'default', '{}', 1, 10),
  ('ps_home_quick',   'vil_demo', 'home', 'quick-menu',           'Layanan Cepat', NULL, 'default', '{}', 1, 20),
  ('ps_home_sambutan','vil_demo', 'home', 'sambutan-kepala-desa', 'Sambutan Kepala Desa', NULL, 'default', '{}', 1, 30),
  ('ps_home_stat',    'vil_demo', 'home', 'statistik-penduduk',   'Statistik Penduduk', 'Data agregat, tanpa identitas perorangan.', 'default', '{"dataset":"penduduk"}', 1, 40),
  ('ps_home_berita',  'vil_demo', 'home', 'berita',               'Berita Terbaru', NULL, 'default', '{"limit":6}', 1, 50),
  ('ps_home_event',   'vil_demo', 'home', 'event',                'Event Mendatang', NULL, 'default', '{"limit":4}', 1, 60),
  ('ps_home_agenda',  'vil_demo', 'home', 'agenda-desa',          'Agenda Desa', NULL, 'default', '{"limit":5}', 1, 70),
  ('ps_home_apbdes',  'vil_demo', 'home', 'apbdes',               NULL, 'Ringkasan anggaran dan realisasi.', 'default', '{}', 1, 80),
  ('ps_home_layanan', 'vil_demo', 'home', 'pelayanan-online',     'Layanan Surat Online', NULL, 'default', '{}', 1, 90),
  ('ps_home_potensi', 'vil_demo', 'home', 'potensi-desa',         'Potensi Desa', NULL, 'default', '{"limit":6}', 1, 100),
  ('ps_home_umkm',    'vil_demo', 'home', 'umkm',                 'UMKM Desa', NULL, 'default', '{"limit":6}', 1, 110),
  ('ps_home_wisata',  'vil_demo', 'home', 'wisata',               'Wisata Desa', NULL, 'default', '{"limit":6}', 1, 120),
  ('ps_home_galeri',  'vil_demo', 'home', 'galeri-foto',          'Galeri Foto', NULL, 'default', '{"limit":8}', 1, 130),
  ('ps_home_unduh',   'vil_demo', 'home', 'download-center',      'Pusat Unduhan', NULL, 'default', '{"limit":6}', 1, 140),
  ('ps_home_faq',     'vil_demo', 'home', 'faq',                  'Pertanyaan yang Sering Diajukan', NULL, 'default', '{"limit":6}', 1, 150),
  ('ps_home_maps',    'vil_demo', 'home', 'maps',                 'Peta Lokasi', NULL, 'default', '{}', 1, 160),
  ('ps_home_kontak',  'vil_demo', 'home', 'kontak',               'Kontak Kami', NULL, 'default', '{}', 1, 170)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Starter content so a fresh install is not blank
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, village_id, slug, name, type, sort_order) VALUES
  ('cat_demo_umum',      'vil_demo', 'umum',       'Umum',            'post', 10),
  ('cat_demo_pemdes',    'vil_demo', 'pemerintahan','Pemerintahan',   'post', 20),
  ('cat_demo_kegiatan',  'vil_demo', 'kegiatan',   'Kegiatan',        'post', 30),
  ('cat_demo_formulir',  'vil_demo', 'formulir',   'Formulir',        'download', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO banners
  (id, village_id, placement, title, subtitle, body, link_url, link_label, severity, visible, sort_order)
VALUES
  ('ban_demo_hero', 'vil_demo', 'hero',
   'Selamat Datang di Website Resmi Desa',
   'Informasi, transparansi anggaran, dan layanan administrasi dalam satu portal.',
   NULL, '/layanan', 'Lihat Layanan', 'info', 1, 10),
  ('ban_demo_peng', 'vil_demo', 'announcement',
   'Pelayanan administrasi buka Senin s.d. Jumat, pukul 08.00-15.00 WIB.',
   NULL, NULL, NULL, NULL, 'info', 1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO statistics (id, village_id, dataset, label, value, unit, period, sort_order) VALUES
  ('sta_demo_jiwa', 'vil_demo', 'penduduk', 'Jumlah Penduduk', 0, 'jiwa', NULL, 10),
  ('sta_demo_kk',   'vil_demo', 'penduduk', 'Kepala Keluarga', 0, 'KK',   NULL, 20),
  ('sta_demo_rt',   'vil_demo', 'penduduk', 'Jumlah RT',       0, 'RT',   NULL, 30),
  ('sta_demo_rw',   'vil_demo', 'penduduk', 'Jumlah RW',       0, 'RW',   NULL, 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema, sla_days,
   requires_login, fee, visible, status, sort_order)
VALUES
  ('svc_demo_domisili', 'vil_demo', 'surat-keterangan-domisili',
   'Surat Keterangan Domisili',
   'Keterangan tempat tinggal untuk keperluan administrasi.',
   '<ul><li>Fotokopi KTP</li><li>Fotokopi Kartu Keluarga</li><li>Surat pengantar RT/RW</li></ul>',
   '[{"name":"keperluan","label":"Keperluan","type":"text","required":true},{"name":"lama_tinggal","label":"Lama Tinggal","type":"select","required":true,"options":["Kurang dari 1 tahun","1 - 5 tahun","Lebih dari 5 tahun"]}]',
   3, 0, 0, 1, 'published', 10),
  ('svc_demo_usaha', 'vil_demo', 'surat-keterangan-usaha',
   'Surat Keterangan Usaha',
   'Keterangan kepemilikan usaha untuk keperluan perizinan atau perbankan.',
   '<ul><li>Fotokopi KTP</li><li>Fotokopi Kartu Keluarga</li><li>Surat pengantar RT/RW</li><li>Foto lokasi usaha</li></ul>',
   '[{"name":"nama_usaha","label":"Nama Usaha","type":"text","required":true},{"name":"jenis_usaha","label":"Jenis Usaha","type":"select","required":true,"options":["Kuliner","Kerajinan","Pertanian","Peternakan","Jasa","Perdagangan","Lainnya"]},{"name":"alamat_usaha","label":"Alamat Usaha","type":"text","required":true},{"name":"mulai_usaha","label":"Mulai Berusaha Sejak","type":"date","required":false},{"name":"keperluan","label":"Keperluan Pengajuan","type":"textarea","required":false,"maxLength":500}]',
   3, 0, 0, 1, 'published', 20),
  ('svc_demo_tidak_mampu', 'vil_demo', 'surat-keterangan-tidak-mampu',
   'Surat Keterangan Tidak Mampu',
   'Keterangan kondisi ekonomi untuk keperluan bantuan pendidikan atau kesehatan.',
   '<ul><li>Fotokopi KTP</li><li>Fotokopi Kartu Keluarga</li><li>Surat pengantar RT/RW</li></ul>',
   '[{"name":"keperluan","label":"Keperluan","type":"select","required":true,"options":["Bantuan pendidikan","Bantuan kesehatan","Bantuan sosial lainnya"]},{"name":"catatan","label":"Keterangan Tambahan","type":"textarea","required":false,"maxLength":500}]',
   5, 1, 0, 1, 'published', 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO faqs (id, village_id, question, answer, category, sort_order) VALUES
  ('faq_demo_1', 'vil_demo', 'Bagaimana cara mengajukan surat secara online?',
   '<p>Buka menu <strong>Layanan</strong>, pilih jenis surat, lengkapi persyaratan, lalu kirim pengajuan. Nomor tiket akan diberikan untuk melacak status.</p>',
   'Layanan', 10),
  ('faq_demo_2', 'vil_demo', 'Berapa lama proses pengajuan surat?',
   '<p>Estimasi waktu tercantum pada tiap jenis layanan, umumnya 3 sampai 5 hari kerja sejak berkas dinyatakan lengkap.</p>',
   'Layanan', 20),
  ('faq_demo_3', 'vil_demo', 'Apakah ada biaya untuk pengajuan surat?',
   '<p>Seluruh layanan administrasi dasar tidak dipungut biaya. Biaya yang berlaku, jika ada, dicantumkan pada halaman layanan terkait.</p>',
   'Layanan', 30),
  ('faq_demo_4', 'vil_demo', 'Bagaimana melaporkan keluhan atau aduan?',
   '<p>Gunakan menu <strong>Pengaduan</strong>. Anda akan menerima nomor tiket untuk memantau tindak lanjut laporan.</p>',
   'Pengaduan', 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO social_links (id, village_id, platform, url, label, visible, sort_order) VALUES
  ('soc_demo_wa', 'vil_demo', 'whatsapp', 'https://wa.me/628000000000', 'WhatsApp', 1, 10)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Starter CMS pages (profile section). Bodies are placeholders for the operator
-- to replace; they contain no claims about any real village.
-- ---------------------------------------------------------------------------

INSERT INTO pages
  (id, village_id, slug, title, excerpt, body, template, status, access_level,
   published_at, sort_order)
VALUES
  ('pg_demo_sejarah', 'vil_demo', 'sejarah', 'Sejarah Desa',
   'Riwayat singkat pembentukan dan perkembangan desa.',
   '<p>Bagian ini diisi oleh pengelola desa melalui Panel Admin. Uraikan asal usul nama desa, tahun pembentukan, tokoh pendiri, dan peristiwa penting yang membentuk desa hingga saat ini.</p>',
   'default', 'published', 'public', datetime('now'), 10),
  ('pg_demo_visi', 'vil_demo', 'visi-misi', 'Visi & Misi',
   'Visi dan misi penyelenggaraan pemerintahan desa.',
   '<h2>Visi</h2><p>Diisi oleh pengelola desa melalui Panel Admin.</p><h2>Misi</h2><ul><li>Diisi oleh pengelola desa.</li></ul>',
   'default', 'published', 'public', datetime('now'), 20),
  ('pg_demo_struktur', 'vil_demo', 'struktur-organisasi', 'Struktur Organisasi',
   'Susunan perangkat desa dan lembaga kemasyarakatan.',
   '<p>Susunan perangkat desa diisi melalui Panel Admin. Data perangkat yang ditampilkan bersifat jabatan dan nama, tanpa identitas kependudukan.</p>',
   'default', 'published', 'public', datetime('now'), 30)
ON CONFLICT (id) DO NOTHING;
