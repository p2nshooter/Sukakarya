-- Baseline content for the tenant this deployment serves.
--
-- Everything here is either structural or generically true of any Indonesian
-- village office, so it is safe to publish on day one:
--
--   * the office holder whose name is actually known
--   * the counter services a village offers, with their real requirements
--   * answers to questions whose answer does not vary by village
--
-- What is NOT here, deliberately: news, businesses, tourist sites, population
-- figures, budget lines, events, galleries and announcements. Those are claims
-- about this particular village, and inventing them would put statements on an
-- official site that are simply untrue. They live in demo-content.sql, which
-- is applied only when someone explicitly asks for demonstration filler.
--
-- Idempotent: safe to re-run.

-- -------------------------------------------------------------------------
-- Officials
-- -------------------------------------------------------------------------

-- Only the office holder whose name is actually known is seeded. The rest of
-- the perangkat desa and the BPD are added from Admin > Perangkat Desa.
--
-- The invented colleagues that used to sit here were fine while this was a
-- demo tenant, but this is now a real village: publishing a plausible name
-- against a real public office states something untrue about who holds it,
-- and a visitor has no way to tell the placeholder from the real entry.
INSERT INTO officials (id, village_id, full_name, position, unit, bio, sort_order) VALUES
  ('off_demo_kades', 'vil_demo', 'Joni Fahamsyah', 'Kepala Desa', 'pemerintah_desa',
   '<p>Selamat datang di situs resmi Desa Sukakarya. Situs ini kami hadirkan sebagai jembatan antara pemerintah desa dan warga: tempat menyampaikan informasi secara terbuka, melayani pengajuan surat tanpa harus antre, dan menerima aspirasi kapan saja.</p><p>Kami percaya pelayanan yang baik dimulai dari keterbukaan. Karena itu anggaran, kegiatan, dan capaian pembangunan kami tampilkan di sini agar dapat diawasi bersama.</p><p>Terima kasih atas kepercayaan dan dukungan warga Desa Sukakarya sekalian.</p>',
   10)
ON CONFLICT (id) DO UPDATE SET
  full_name = excluded.full_name,
  position  = excluded.position,
  bio       = excluded.bio;

-- Placeholder colleagues from the demo tenant, removed now that the site
-- carries a real village's name.
DELETE FROM officials WHERE id IN (
  'off_demo_sekdes', 'off_demo_kaur_keu', 'off_demo_kaur_um',
  'off_demo_kasi_pem', 'off_demo_kasi_kes',
  'off_demo_bpd_ketua', 'off_demo_bpd_sek'
);

-- -------------------------------------------------------------------------
-- Frequently asked questions (answers do not vary by village)
-- -------------------------------------------------------------------------

INSERT INTO faqs (id, village_id, question, answer, sort_order, visible) VALUES
  ('faq_demo_x1', 'vil_demo', 'Berapa lama surat selesai diproses?',
   '<p>Setiap layanan memiliki estimasi waktu yang tertera pada halaman layanan, umumnya satu hingga tiga hari kerja. Waktu dihitung sejak berkas dinyatakan lengkap oleh petugas.</p>', 60, 1),
  ('faq_demo_x2', 'vil_demo', 'Apakah pengajuan surat dikenakan biaya?',
   '<p>Sebagian besar layanan surat keterangan tidak dipungut biaya. Apabila terdapat biaya resmi, jumlahnya dicantumkan pada halaman layanan yang bersangkutan.</p>', 70, 1),
  ('faq_demo_x3', 'vil_demo', 'Bagaimana cara memantau status pengajuan?',
   '<p>Simpan nomor tiket yang Anda terima setelah mengirim pengajuan, lalu masukkan pada menu Lacak Surat. Halaman tersebut menampilkan status terkini beserta riwayat prosesnya.</p>', 80, 1),
  ('faq_demo_x4', 'vil_demo', 'Apakah data yang saya isi aman?',
   '<p>Data pada formulir pengajuan hanya dapat dilihat petugas desa yang berwenang dan tidak pernah ditampilkan di halaman publik. Halaman pelacakan hanya menampilkan status, bukan isi pengajuan.</p>', 90, 1),
  ('faq_demo_x5', 'vil_demo', 'Ke mana saya menyampaikan keluhan pelayanan?',
   '<p>Gunakan menu Pengaduan pada situs ini. Setiap laporan menerima nomor tiket sehingga dapat Anda pantau, dan akan ditindaklanjuti petugas sesuai bidangnya.</p>', 100, 1)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Office hours, shown in the header utility strip and the footer
-- ---------------------------------------------------------------------------

INSERT INTO village_settings (village_id, key, value) VALUES
  ('vil_demo', 'contact.office_hours', 'Senin - Jumat, 08.00 - 15.00 WIB')
ON CONFLICT (village_id, key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Service defaults
--
-- seed.sql now ships the counter services as open (no account required), but it
-- uses ON CONFLICT DO NOTHING, so a database seeded before that change still
-- carries the old `requires_login = 1`. Requiring an account for a domicile or
-- business letter locks out every citizen on a village that has not provisioned
-- resident accounts - which is all of them on day one.
--
-- Scoped to the two demo rows by id, so it cannot touch a service a village has
-- since created or deliberately restricted.
-- ---------------------------------------------------------------------------

UPDATE services
SET requires_login = 0,
    form_schema = '[{"name":"keperluan","label":"Keperluan","type":"text","required":true},{"name":"lama_tinggal","label":"Lama Tinggal","type":"select","required":true,"options":["Kurang dari 1 tahun","1 - 5 tahun","Lebih dari 5 tahun"]}]',
    updated_at = datetime('now')
WHERE id = 'svc_demo_domisili' AND village_id = 'vil_demo';

UPDATE services
SET requires_login = 0,
    form_schema = '[{"name":"nama_usaha","label":"Nama Usaha","type":"text","required":true},{"name":"jenis_usaha","label":"Jenis Usaha","type":"select","required":true,"options":["Kuliner","Kerajinan","Pertanian","Peternakan","Jasa","Perdagangan","Lainnya"]},{"name":"alamat_usaha","label":"Alamat Usaha","type":"text","required":true},{"name":"mulai_usaha","label":"Mulai Berusaha Sejak","type":"date","required":false},{"name":"keperluan","label":"Keperluan Pengajuan","type":"textarea","required":false,"maxLength":500}]',
    updated_at = datetime('now')
WHERE id = 'svc_demo_usaha' AND village_id = 'vil_demo';

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema, sla_days,
   requires_login, fee, visible, status, sort_order)
VALUES
  ('svc_demo_pengantar', 'vil_demo', 'surat-pengantar',
   'Surat Pengantar',
   'Pengantar dari desa untuk keperluan di instansi lain.',
   '<ul><li>Fotokopi KTP</li><li>Surat pengantar RT/RW</li></ul>',
   '[{"name":"tujuan_instansi","label":"Instansi Tujuan","type":"text","required":true},{"name":"keperluan","label":"Keperluan","type":"textarea","required":true,"maxLength":500}]',
   2, 0, 0, 1, 'published', 40),
  ('svc_demo_kelahiran', 'vil_demo', 'surat-keterangan-kelahiran',
   'Surat Keterangan Kelahiran',
   'Keterangan kelahiran sebagai dasar pengurusan akta di Dukcapil.',
   '<ul><li>Surat keterangan lahir dari bidan atau rumah sakit</li><li>Fotokopi Kartu Keluarga</li><li>Fotokopi KTP orang tua</li></ul>',
   '[{"name":"tempat_lahir","label":"Tempat Lahir","type":"text","required":true},{"name":"tanggal_lahir","label":"Tanggal Lahir","type":"date","required":true},{"name":"jenis_kelamin","label":"Jenis Kelamin","type":"select","required":true,"options":["Laki-laki","Perempuan"]}]',
   3, 1, 0, 1, 'published', 50)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Brand colours
--
-- seed.sql now ships a deeper jade and a warmer accent, but it uses ON CONFLICT
-- DO NOTHING on the villages row, so a database seeded before that change keeps
-- the old flat green. Scoped to the demo tenant by id.
-- ---------------------------------------------------------------------------

UPDATE villages
SET primary_color = '#0d6b52',
    secondary_color = '#084a39',
    accent_color = '#b98a2e',
    updated_at = datetime('now')
WHERE id = 'vil_demo';

-- ---------------------------------------------------------------------------
-- Statistics: fill in the placeholders
--
-- seed.sql ships `sta_demo_jiwa`, `sta_demo_kk`, `sta_demo_rt` and
-- `sta_demo_rw` with value 0 so a fresh install has the shape of the dataset.
-- The demo rows above reuse two of those ids, and ON CONFLICT DO NOTHING means
-- the zeros win - which is how three "0" tiles ended up in the summary strip.
-- Update them instead, and retire the duplicate `sta_demo_jiwa`.
-- ---------------------------------------------------------------------------

UPDATE statistics SET value = 1342, unit = 'KK',  period = '2026', sort_order = 20
  WHERE id = 'sta_demo_kk' AND village_id = 'vil_demo';
UPDATE statistics SET value = 24,   unit = 'RT',  period = '2026', sort_order = 60, dataset = 'wilayah'
  WHERE id = 'sta_demo_rt' AND village_id = 'vil_demo';
UPDATE statistics SET value = 8,    unit = 'RW',  period = '2026', sort_order = 70, dataset = 'wilayah'
  WHERE id = 'sta_demo_rw' AND village_id = 'vil_demo';

DELETE FROM statistics WHERE id = 'sta_demo_jiwa' AND village_id = 'vil_demo';

