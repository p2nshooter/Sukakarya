-- The letters a village office is actually asked for.
--
-- The install shipped five. These are the ones that make up most of the queue
-- at a desa office and were simply missing: without them a resident still has
-- to walk in, which is the thing this module exists to prevent.
--
-- Every one carries its own form fields, its requirements, and the wording of
-- the letter itself, so a village can accept the request the day it installs
-- this. The village name, the head of village's name and their title are never
-- written into a template - they are filled at print time from the village's
-- own record, which is what makes these correct for whichever village installs
-- them and what lets an operator change them in Pengaturan Desa without
-- touching a single letter.
--
-- Fees are left at 0. What a village may charge is set by its own peraturan
-- desa, and inventing a price for a government service would be a village
-- publishing a tariff it never agreed. Set them in Panel Admin > Layanan Surat.
--
-- Inserted by slug and skipped when already present, so a village that has
-- written its own version of any of these keeps it.

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
