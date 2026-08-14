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

-- ---------------------------------------------------------------------------
-- Default wording for the five letters seeded above.
--
-- These statements also exist in migration 0006, and that is deliberate rather
-- than careless: the two cover different installs and neither can serve both.
--
-- Migrations run BEFORE any seed. On a fresh database `services` is still empty
-- when 0006 executes, so its UPDATEs match nothing; the rows are inserted a
-- moment later with a NULL template, and 0006 never runs again. The result was
-- a brand new installation whose five original letters had no wording at all -
-- precisely the problem 0006 was written to fix, reappearing for every village
-- that installs this script rather than inherits it.
--
-- So: 0006 fixes villages that were already live, and this fixes fresh ones.
-- CI asserts that every published service ends up with wording, which is what
-- catches the two drifting apart.
-- ---------------------------------------------------------------------------

UPDATE services
   SET letter_template =
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}
Lama Tinggal    : {{lama_tinggal}}

Orang tersebut benar-benar berdomisili di {{sebutan_desa}} {{nama_desa}} sebagaimana keterangan di atas.

Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
       valid_days = 30
 WHERE slug = 'surat-keterangan-domisili' AND letter_template IS NULL;

UPDATE services
   SET letter_template =
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Orang tersebut benar memiliki usaha dengan keterangan sebagai berikut:

Nama Usaha      : {{nama_usaha}}
Jenis Usaha     : {{jenis_usaha}}
Alamat Usaha    : {{alamat_usaha}}
Mulai Berusaha  : {{mulai_usaha}}

Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
       valid_days = 90
 WHERE slug = 'surat-keterangan-usaha' AND letter_template IS NULL;

UPDATE services
   SET letter_template =
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Berdasarkan pengamatan dan data yang ada pada kami, orang tersebut termasuk keluarga yang kurang mampu secara ekonomi.

Surat keterangan ini dibuat untuk keperluan {{keperluan}}. {{catatan}}

Surat ini berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
       valid_days = 30
 WHERE slug = 'surat-keterangan-tidak-mampu' AND letter_template IS NULL;

UPDATE services
   SET letter_template =
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Orang tersebut adalah benar warga {{sebutan_desa}} {{nama_desa}} dan bermaksud mengurus keperluan pada:

Instansi Tujuan : {{tujuan_instansi}}
Keperluan       : {{keperluan}}

Surat pengantar ini berlaku sampai {{berlaku_sampai}}.

Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
       valid_days = 14
 WHERE slug = 'surat-pengantar' AND letter_template IS NULL;

UPDATE services
   SET letter_template =
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa telah lahir seorang anak dengan keterangan sebagai berikut:

Nama Anak       : {{nama_pemohon}}
Tempat Lahir    : {{tempat_lahir}}
Tanggal Lahir   : {{tanggal_lahir}}
Jenis Kelamin   : {{jenis_kelamin}}

Kelahiran tersebut tercatat di wilayah {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}.

Surat keterangan ini dibuat sebagai kelengkapan pengurusan akta kelahiran pada instansi yang berwenang.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
       valid_days = 0
 WHERE slug = 'surat-keterangan-kelahiran' AND letter_template IS NULL;

-- ---------------------------------------------------------------------------
-- The seven additional letters, for a fresh install.
--
-- Identical to migration 0011, and again deliberately so. A migration cannot
-- seed per-village content on a new database at all: `services.village_id`
-- references `villages`, migrations run before any seed, and the village row
-- does not exist yet - so the insert is either skipped by its own guard or
-- rejected by the foreign key. There is no third option.
--
-- That makes the division structural rather than stylistic. Migrations carry
-- schema and backfills for villages that are already live; the seed carries the
-- content a new village starts with. These statements are written to satisfy
-- both: guarded on the village existing, and skipped when the slug is already
-- present, so running them twice changes nothing.
-- ---------------------------------------------------------------------------

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_sktm_sekolah', 'vil_demo', 'surat-keterangan-penghasilan',
  'Surat Keterangan Penghasilan',
  'Keterangan penghasilan orang tua untuk beasiswa, sekolah, atau pengajuan bantuan.',
  'Fotokopi KTP;Fotokopi Kartu Keluarga;Surat pengantar RT/RW',
  '[{"name":"nama_anak","label":"Nama Anak / Yang Dibiayai","type":"text","required":true},{"name":"pekerjaan","label":"Pekerjaan","type":"text","required":true},{"name":"penghasilan","label":"Penghasilan per Bulan (Rp)","type":"text","required":true},{"name":"keperluan","label":"Keperluan","type":"text","required":true}]',
  3, 0, 0, 1, 'published', 60,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}
Pekerjaan       : {{pekerjaan}}
Penghasilan     : Rp {{penghasilan}} per bulan

Orang tersebut adalah orang tua/wali dari {{nama_anak}}.

Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  30
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-penghasilan'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_belum_menikah', 'vil_demo', 'surat-keterangan-belum-menikah',
  'Surat Keterangan Belum Menikah',
  'Keterangan status belum pernah menikah untuk pernikahan, pekerjaan, atau pendidikan.',
  'Fotokopi KTP;Fotokopi Kartu Keluarga;Surat pengantar RT/RW',
  '[{"name":"tempat_lahir","label":"Tempat Lahir","type":"text","required":true},{"name":"tanggal_lahir","label":"Tanggal Lahir","type":"date","required":true},{"name":"pekerjaan","label":"Pekerjaan","type":"text","required":true},{"name":"keperluan","label":"Keperluan","type":"text","required":true}]',
  3, 0, 0, 1, 'published', 61,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Tempat/Tgl Lahir: {{tempat_lahir}}, {{tanggal_lahir}}
Pekerjaan       : {{pekerjaan}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Berdasarkan data administrasi kependudukan yang ada pada kami, orang tersebut sampai saat ini berstatus belum pernah menikah.

Surat keterangan ini dibuat untuk keperluan {{keperluan}} dan berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  30
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-belum-menikah'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_kematian', 'vil_demo', 'surat-keterangan-kematian',
  'Surat Keterangan Kematian',
  'Keterangan kematian warga untuk pengurusan akta kematian, waris, dan administrasi lainnya.',
  'Fotokopi KTP almarhum/almarhumah;Fotokopi Kartu Keluarga;Fotokopi KTP pelapor',
  '[{"name":"nama_almarhum","label":"Nama Almarhum/Almarhumah","type":"text","required":true},{"name":"tanggal_meninggal","label":"Tanggal Meninggal","type":"date","required":true},{"name":"tempat_meninggal","label":"Tempat Meninggal","type":"text","required":true},{"name":"sebab","label":"Sebab Kematian","type":"text","required":false},{"name":"hubungan","label":"Hubungan Pelapor dengan Almarhum","type":"text","required":true}]',
  2, 0, 0, 1, 'published', 62,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa telah meninggal dunia:

Nama            : {{nama_almarhum}}
Tanggal Wafat   : {{tanggal_meninggal}}
Tempat Wafat    : {{tempat_meninggal}}
Sebab           : {{sebab}}

Almarhum/almarhumah adalah warga {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}.

Keterangan ini dilaporkan oleh {{nama_pemohon}} selaku {{hubungan}}.

Surat keterangan ini dibuat sebagai kelengkapan pengurusan akta kematian pada instansi yang berwenang.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-kematian'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_kehilangan', 'vil_demo', 'surat-keterangan-kehilangan',
  'Surat Keterangan Kehilangan',
  'Keterangan kehilangan dokumen atau barang, sebagai kelengkapan laporan dan pengurusan penggantian.',
  'Fotokopi KTP;Surat pengantar RT/RW',
  '[{"name":"barang","label":"Dokumen / Barang yang Hilang","type":"text","required":true},{"name":"tanggal_hilang","label":"Perkiraan Tanggal Hilang","type":"date","required":true},{"name":"lokasi","label":"Perkiraan Lokasi Hilang","type":"text","required":true},{"name":"kronologi","label":"Kronologi Singkat","type":"textarea","required":false,"maxLength":500}]',
  2, 0, 0, 1, 'published', 63,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Orang tersebut melaporkan telah kehilangan:

Barang/Dokumen  : {{barang}}
Tanggal         : {{tanggal_hilang}}
Lokasi          : {{lokasi}}

{{kronologi}}

Surat keterangan ini dibuat atas permintaan yang bersangkutan sebagai kelengkapan pengurusan penggantian dokumen, dan berlaku sampai {{berlaku_sampai}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  30
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-kehilangan'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_ahli_waris', 'vil_demo', 'surat-keterangan-ahli-waris',
  'Surat Keterangan Ahli Waris',
  'Keterangan ahli waris almarhum untuk pengurusan warisan, rekening, dan balik nama.',
  'Fotokopi KTP seluruh ahli waris;Fotokopi Kartu Keluarga;Surat keterangan kematian;Surat pengantar RT/RW',
  '[{"name":"nama_almarhum","label":"Nama Almarhum/Almarhumah","type":"text","required":true},{"name":"tanggal_meninggal","label":"Tanggal Meninggal","type":"date","required":true},{"name":"ahli_waris","label":"Nama Ahli Waris (pisahkan dengan koma)","type":"textarea","required":true,"maxLength":500},{"name":"keperluan","label":"Keperluan","type":"text","required":true}]',
  5, 0, 0, 1, 'published', 64,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Almarhum/Almarhumah : {{nama_almarhum}}
Tanggal Wafat       : {{tanggal_meninggal}}
Alamat Terakhir     : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Meninggalkan ahli waris sebagai berikut:

{{ahli_waris}}

Keterangan ini dilaporkan oleh {{nama_pemohon}} dan dibuat berdasarkan data kependudukan serta keterangan saksi yang ada pada kami.

Surat keterangan ini dibuat untuk keperluan {{keperluan}}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-ahli-waris'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_izin_keramaian', 'vil_demo', 'surat-izin-keramaian',
  'Surat Izin Keramaian',
  'Izin penyelenggaraan hajatan, pengajian, pertunjukan, atau kegiatan yang mengundang keramaian.',
  'Fotokopi KTP penyelenggara;Surat pengantar RT/RW;Denah lokasi kegiatan',
  '[{"name":"nama_kegiatan","label":"Nama Kegiatan","type":"text","required":true},{"name":"tanggal_kegiatan","label":"Tanggal Kegiatan","type":"date","required":true},{"name":"waktu","label":"Waktu","type":"text","required":true},{"name":"lokasi","label":"Lokasi Kegiatan","type":"text","required":true},{"name":"perkiraan_hadir","label":"Perkiraan Jumlah Hadirin","type":"text","required":false}]',
  3, 0, 0, 1, 'published', 65,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini memberikan izin kepada:

Nama            : {{nama_pemohon}}
Alamat          : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Untuk menyelenggarakan kegiatan dengan keterangan sebagai berikut:

Nama Kegiatan   : {{nama_kegiatan}}
Hari/Tanggal    : {{tanggal_kegiatan}}
Waktu           : {{waktu}}
Lokasi          : {{lokasi}}
Perkiraan Hadir : {{perkiraan_hadir}}

Penyelenggara bertanggung jawab atas ketertiban dan keamanan selama kegiatan berlangsung, serta wajib menaati ketentuan yang berlaku.

Surat izin ini berlaku sampai {{berlaku_sampai}}.

Demikian surat izin ini dibuat untuk dapat dipergunakan sebagaimana mestinya.',
  14
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-izin-keramaian'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');

INSERT INTO services
  (id, village_id, slug, name, description, requirements, form_schema,
   sla_days, requires_login, fee, visible, status, sort_order,
   letter_template, valid_days)
SELECT
  'svc_pindah', 'vil_demo', 'surat-keterangan-pindah',
  'Surat Keterangan Pindah Domisili',
  'Keterangan pindah tempat tinggal keluar desa, sebagai kelengkapan pengurusan di Dukcapil.',
  'Fotokopi KTP;Fotokopi Kartu Keluarga;Surat pengantar RT/RW',
  '[{"name":"alamat_tujuan","label":"Alamat Tujuan","type":"text","required":true},{"name":"desa_tujuan","label":"Desa/Kelurahan Tujuan","type":"text","required":true},{"name":"kabupaten_tujuan","label":"Kabupaten/Kota Tujuan","type":"text","required":true},{"name":"jumlah_pindah","label":"Jumlah Anggota Keluarga yang Pindah","type":"text","required":true},{"name":"alasan","label":"Alasan Pindah","type":"text","required":false}]',
  5, 0, 0, 1, 'published', 66,
'Yang bertanda tangan di bawah ini, {{jabatan_kepala_desa}} {{nama_desa}}, {{wilayah_desa}}, dengan ini menerangkan bahwa:

Nama            : {{nama_pemohon}}
Alamat Asal     : {{sebutan_desa}} {{nama_desa}}, {{wilayah_desa}}

Yang bersangkutan beserta {{jumlah_pindah}} anggota keluarga akan pindah tempat tinggal ke:

Alamat Tujuan   : {{alamat_tujuan}}
Desa/Kelurahan  : {{desa_tujuan}}
Kabupaten/Kota  : {{kabupaten_tujuan}}
Alasan          : {{alasan}}

Surat keterangan ini dibuat sebagai kelengkapan pengurusan perpindahan penduduk pada instansi yang berwenang.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE village_id = 'vil_demo' AND slug = 'surat-keterangan-pindah'
) AND EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo');
