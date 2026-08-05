-- Demonstration content for the `vil_demo` tenant.
--
-- Purpose: a fresh install should look like a working village site, not a grid
-- of empty states. Every home section that has a renderer gets enough rows to
-- show what it does.
--
-- Nothing here is real. The village, the people, the businesses and the figures
-- are invented, and there is deliberately no personal data of any kind - no
-- NIK, no KK number, no home address of an individual, no private phone number.
-- Business contact details belong to fictional shops, which is a shop front and
-- not citizen data.
--
-- Idempotent: every statement is ON CONFLICT DO NOTHING, so re-running never
-- overwrites content an operator has since edited.

-- ---------------------------------------------------------------------------
-- Officials
-- ---------------------------------------------------------------------------

INSERT INTO officials (id, village_id, full_name, position, unit, bio, sort_order) VALUES
  ('off_demo_kades', 'vil_demo', 'Sutrisno Hadi', 'Kepala Desa', 'pemerintah_desa',
   '<p>Selamat datang di situs resmi Desa Demo. Situs ini kami hadirkan sebagai jembatan antara pemerintah desa dan warga: tempat menyampaikan informasi secara terbuka, melayani pengajuan surat tanpa harus antre, dan menerima aspirasi kapan saja.</p><p>Kami percaya pelayanan yang baik dimulai dari keterbukaan. Karena itu anggaran, kegiatan, dan capaian pembangunan kami tampilkan di sini agar dapat diawasi bersama.</p><p>Terima kasih atas kepercayaan dan dukungan warga sekalian.</p>',
   10),
  ('off_demo_sekdes', 'vil_demo', 'Ratna Widyaningrum', 'Sekretaris Desa', 'pemerintah_desa', NULL, 20),
  ('off_demo_kaur_keu', 'vil_demo', 'Bambang Prasetya', 'Kaur Keuangan', 'pemerintah_desa', NULL, 30),
  ('off_demo_kaur_um', 'vil_demo', 'Siti Maryam', 'Kaur Umum dan Perencanaan', 'pemerintah_desa', NULL, 40),
  ('off_demo_kasi_pem', 'vil_demo', 'Agus Salim', 'Kasi Pemerintahan', 'pemerintah_desa', NULL, 50),
  ('off_demo_kasi_kes', 'vil_demo', 'Dewi Lestari', 'Kasi Kesejahteraan', 'pemerintah_desa', NULL, 60),
  ('off_demo_bpd_ketua', 'vil_demo', 'Hendra Gunawan', 'Ketua BPD', 'bpd', NULL, 10),
  ('off_demo_bpd_sek', 'vil_demo', 'Nurul Aini', 'Sekretaris BPD', 'bpd', NULL, 20)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Statistics (aggregate only)
-- ---------------------------------------------------------------------------

INSERT INTO statistics (id, village_id, dataset, label, value, unit, period, sort_order) VALUES
  ('sta_demo_total',  'vil_demo', 'penduduk', 'Total Penduduk',    4287, 'jiwa',   '2026', 10),
  ('sta_demo_kk',     'vil_demo', 'penduduk', 'Kepala Keluarga',   1342, 'KK',     '2026', 20),
  ('sta_demo_laki',   'vil_demo', 'penduduk', 'Laki-laki',         2156, 'jiwa',   '2026', 30),
  ('sta_demo_perem',  'vil_demo', 'penduduk', 'Perempuan',         2131, 'jiwa',   '2026', 40),
  ('sta_demo_luas',   'vil_demo', 'wilayah',  'Luas Wilayah',       812, 'hektar', '2026', 10),
  ('sta_demo_dusun',  'vil_demo', 'wilayah',  'Jumlah Dusun',         5, 'dusun',  '2026', 20),
  ('sta_demo_rt',     'vil_demo', 'wilayah',  'Rukun Tetangga',      24, 'RT',     '2026', 30),
  ('sta_demo_rw',     'vil_demo', 'wilayah',  'Rukun Warga',          8, 'RW',     '2026', 40)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- News
-- ---------------------------------------------------------------------------

INSERT INTO posts (id, village_id, type, slug, title, excerpt, body, category_id,
                   author_name, status, is_featured, published_at)
VALUES
  ('pst_demo_1', 'vil_demo', 'news', 'musyawarah-desa-penetapan-apbdes-2026',
   'Musyawarah Desa Tetapkan APBDes 2026',
   'Musyawarah desa yang dihadiri BPD, tokoh masyarakat, dan perwakilan RT menetapkan prioritas anggaran tahun ini pada infrastruktur jalan lingkungan dan penguatan posyandu.',
   '<p>Pemerintah Desa Demo bersama Badan Permusyawaratan Desa menggelar Musyawarah Desa untuk menetapkan Anggaran Pendapatan dan Belanja Desa tahun anggaran 2026. Musyawarah berlangsung di balai desa dan dihadiri perwakilan seluruh rukun tetangga.</p><p>Dalam forum tersebut disepakati tiga prioritas utama. Pertama, perbaikan jalan lingkungan sepanjang dua kilometer yang menghubungkan Dusun Sukamaju dan Dusun Sukasari. Kedua, penguatan layanan posyandu melalui penambahan alat ukur tumbuh kembang balita. Ketiga, pelatihan kewirausahaan bagi kelompok UMKM desa.</p><p>Ketua BPD menyampaikan bahwa seluruh rincian anggaran akan dipublikasikan melalui situs desa agar dapat diakses dan diawasi warga sepanjang tahun berjalan.</p><p>Pelaksanaan kegiatan dijadwalkan dimulai pada triwulan kedua setelah proses pengadaan selesai.</p>',
   'cat_demo_pemdes', 'Sekretariat Desa', 'published', 1, datetime('now', '-2 days')),

  ('pst_demo_2', 'vil_demo', 'news', 'posyandu-balita-cakupan-imunisasi-meningkat',
   'Cakupan Imunisasi Balita Naik Jadi 94 Persen',
   'Kegiatan posyandu rutin di lima dusun mencatat kenaikan cakupan imunisasi dasar lengkap dibanding periode yang sama tahun lalu.',
   '<p>Kegiatan posyandu yang digelar rutin setiap bulan di lima dusun mencatatkan kenaikan cakupan imunisasi dasar lengkap menjadi 94 persen. Angka ini naik dibanding periode yang sama tahun sebelumnya.</p><p>Peningkatan didorong oleh penjadwalan ulang kegiatan posyandu ke akhir pekan, sehingga orang tua yang bekerja tetap dapat membawa anaknya. Kader posyandu juga melakukan pendampingan bagi keluarga yang belum melengkapi jadwal imunisasi.</p><p>Pemerintah desa mengapresiasi kerja kader dan bidan desa, serta mengimbau warga untuk terus memanfaatkan layanan posyandu yang tersedia gratis.</p>',
   'cat_demo_kegiatan', 'Kasi Kesejahteraan', 'published', 0, datetime('now', '-6 days')),

  ('pst_demo_3', 'vil_demo', 'news', 'pelatihan-pengemasan-produk-umkm',
   'Pelatihan Pengemasan Produk untuk Pelaku UMKM',
   'Sebanyak 32 pelaku usaha mengikuti pelatihan desain kemasan dan pemasaran digital yang difasilitasi pemerintah desa.',
   '<p>Sebanyak 32 pelaku usaha mikro di Desa Demo mengikuti pelatihan desain kemasan dan pemasaran digital selama dua hari di balai desa. Pelatihan difasilitasi pemerintah desa bekerja sama dengan pendamping UMKM kecamatan.</p><p>Materi mencakup penyusunan label produk yang memenuhi ketentuan, teknik pemotretan produk sederhana menggunakan telepon genggam, serta pemanfaatan media sosial untuk menjangkau pembeli di luar desa.</p><p>Peserta yang menyelesaikan pelatihan akan didampingi dalam pengurusan izin edar produk pangan olahan.</p>',
   'cat_demo_umum', 'Kaur Umum', 'published', 0, datetime('now', '-11 days')),

  ('pst_demo_4', 'vil_demo', 'news', 'kerja-bakti-normalisasi-saluran-air',
   'Kerja Bakti Normalisasi Saluran Air Jelang Musim Hujan',
   'Warga lima dusun bergotong royong membersihkan saluran air untuk mengurangi risiko genangan pada musim hujan.',
   '<p>Menjelang musim hujan, warga dari lima dusun menggelar kerja bakti membersihkan saluran air sepanjang tiga kilometer. Kegiatan dipusatkan pada titik-titik yang selama ini menjadi langganan genangan.</p><p>Pemerintah desa menyediakan peralatan kebersihan dan konsumsi, sementara tenaga sepenuhnya berasal dari swadaya warga. Kegiatan serupa direncanakan berlangsung dua kali dalam setahun.</p>',
   'cat_demo_kegiatan', 'Kasi Pemerintahan', 'published', 0, datetime('now', '-18 days')),

  ('pst_demo_5', 'vil_demo', 'news', 'layanan-surat-online-resmi-dibuka',
   'Layanan Surat Online Resmi Dibuka',
   'Warga kini dapat mengajukan surat keterangan dari rumah dan memantau statusnya menggunakan nomor tiket.',
   '<p>Pemerintah Desa Demo resmi membuka layanan pengajuan surat secara daring melalui situs desa. Warga dapat mengajukan surat keterangan domisili, surat keterangan usaha, dan surat pengantar tanpa harus datang ke kantor desa terlebih dahulu.</p><p>Setiap pengajuan menerima nomor tiket yang dapat digunakan untuk memantau status melalui menu Lacak Surat. Petugas akan mengabari pemohon melalui kontak yang dicantumkan apabila diperlukan kelengkapan tambahan.</p><p>Surat yang telah selesai tetap diambil di kantor desa pada jam pelayanan.</p>',
   'cat_demo_pemdes', 'Sekretariat Desa', 'published', 0, datetime('now', '-25 days')),

  ('pst_demo_6', 'vil_demo', 'article', 'profil-sejarah-desa-demo',
   'Menelusuri Sejarah Desa Demo',
   'Catatan ringkas mengenai asal usul nama, perkembangan wilayah, dan tokoh yang berperan dalam pembentukan desa.',
   '<p>Desa Demo terbentuk dari penggabungan beberapa permukiman kecil yang tumbuh di sekitar aliran sungai. Nama desa diambil dari sebutan yang digunakan warga terhadap kawasan persawahan di sisi utara.</p><p>Perkembangan wilayah berlangsung bertahap seiring dibukanya jalur penghubung antar kecamatan. Sejak saat itu kegiatan ekonomi warga bergeser dari pertanian subsisten menuju pertanian komersial dan usaha pengolahan hasil.</p><p>Catatan ini disusun dari penuturan tokoh masyarakat dan akan terus dilengkapi.</p>',
   'cat_demo_umum', 'Sekretariat Desa', 'published', 0, datetime('now', '-40 days'))
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

INSERT INTO events (id, village_id, slug, title, description, location, starts_at,
                    organizer, status, published_at)
VALUES
  ('evt_demo_1', 'vil_demo', 'posyandu-balita-bulanan', 'Posyandu Balita Bulanan',
   'Penimbangan, pengukuran tumbuh kembang, dan pemberian vitamin untuk balita.',
   'Balai Dusun Sukamaju', datetime('now', '+4 days'), 'Kader Posyandu', 'published', datetime('now', '-3 days')),
  ('evt_demo_2', 'vil_demo', 'musyawarah-dusun-sukasari', 'Musyawarah Dusun Sukasari',
   'Pembahasan usulan prioritas pembangunan tingkat dusun untuk tahun anggaran berikutnya.',
   'Balai Dusun Sukasari', datetime('now', '+9 days'), 'Pemerintah Desa', 'published', datetime('now', '-3 days')),
  ('evt_demo_3', 'vil_demo', 'pelatihan-digitalisasi-umkm', 'Pelatihan Digitalisasi UMKM',
   'Pendampingan pembuatan katalog produk daring bagi pelaku usaha mikro desa.',
   'Balai Desa', datetime('now', '+16 days'), 'Kaur Umum', 'published', datetime('now', '-2 days')),
  ('evt_demo_4', 'vil_demo', 'kerja-bakti-lingkungan', 'Kerja Bakti Lingkungan',
   'Pembersihan saluran air dan penataan taman desa. Terbuka untuk seluruh warga.',
   'Titik kumpul Balai Desa', datetime('now', '+23 days'), 'Karang Taruna', 'published', datetime('now', '-1 day')),
  ('evt_demo_5', 'vil_demo', 'sosialisasi-bantuan-pangan', 'Sosialisasi Program Bantuan Pangan',
   'Penjelasan mekanisme dan jadwal penyaluran program bantuan pangan.',
   'Balai Desa', datetime('now', '+30 days'), 'Kasi Kesejahteraan', 'published', datetime('now', '-1 day'))
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Potentials
-- ---------------------------------------------------------------------------

INSERT INTO potentials (id, village_id, sector, title, description, metric_label, metric_value, sort_order) VALUES
  ('ptn_demo_padi', 'vil_demo', 'pertanian', 'Persawahan Irigasi Teknis',
   'Lahan sawah dengan pengairan sepanjang tahun, menghasilkan dua hingga tiga kali panen padi.',
   'lahan produktif', '412 ha', 10),
  ('ptn_demo_horti', 'vil_demo', 'pertanian', 'Hortikultura Dataran Sedang',
   'Sentra cabai, tomat, dan sayuran daun yang memasok pasar kecamatan dan kabupaten.',
   'kelompok tani', '14 kelompok', 20),
  ('ptn_demo_ikan', 'vil_demo', 'perikanan', 'Budidaya Ikan Air Tawar',
   'Kolam budidaya nila dan lele yang dikelola kelompok pembudidaya desa.',
   'produksi', '38 ton/tahun', 30),
  ('ptn_demo_kambing', 'vil_demo', 'peternakan', 'Peternakan Kambing Rakyat',
   'Usaha penggemukan kambing skala rumah tangga dengan pakan dari limbah pertanian.',
   'populasi', '1.240 ekor', 40),
  ('ptn_demo_bumdes', 'vil_demo', 'bumdes', 'BUMDes Karya Bersama',
   'Unit usaha simpan pinjam, penyewaan alat pertanian, dan pengelolaan air bersih desa.',
   'unit usaha', '3 unit', 50),
  ('ptn_demo_kopi', 'vil_demo', 'industri', 'Pengolahan Kopi Rakyat',
   'Rumah produksi kopi bubuk yang mengolah hasil kebun warga menjadi produk kemasan.',
   'kapasitas', '1,2 ton/bulan', 60)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- UMKM (fictional businesses; contact details are shop fronts, not citizen data)
-- ---------------------------------------------------------------------------

INSERT INTO umkm (id, village_id, slug, name, owner_name, description, category_id,
                  whatsapp, address, is_featured, status)
VALUES
  ('umk_demo_kopi', 'vil_demo', 'kopi-lereng-sukamaju', 'Kopi Lereng Sukamaju', 'Kelompok Tani Lestari',
   '<p>Kopi robusta hasil kebun warga Dusun Sukamaju, diproses secara semi-basah dan disangrai dalam jumlah kecil untuk menjaga kesegaran aroma.</p><p>Melayani pesanan biji utuh maupun bubuk, tersedia dalam kemasan 100 gram dan 250 gram.</p>',
   'cat_demo_umum', '628123456001', 'Dusun Sukamaju RT 03', 1, 'published'),
  ('umk_demo_keripik', 'vil_demo', 'keripik-singkong-bu-tini', 'Keripik Singkong Bu Tini', 'Usaha Rumahan',
   '<p>Keripik singkong renyah dengan varian original, balado, dan pedas manis. Diproduksi harian menggunakan singkong segar dari kebun sekitar.</p>',
   'cat_demo_umum', '628123456002', 'Dusun Sukasari RT 01', 1, 'published'),
  ('umk_demo_anyaman', 'vil_demo', 'anyaman-bambu-karya-desa', 'Anyaman Bambu Karya Desa', 'Kelompok Perajin',
   '<p>Produk anyaman bambu berupa besek, tampah, dan keranjang serbaguna. Menerima pesanan dalam jumlah besar untuk kebutuhan usaha kuliner.</p>',
   'cat_demo_umum', '628123456003', 'Dusun Sukamulya RT 05', 0, 'published'),
  ('umk_demo_madu', 'vil_demo', 'madu-hutan-sukatani', 'Madu Hutan Sukatani', 'Kelompok Peternak Lebah',
   '<p>Madu hutan yang dipanen secara lestari dari koloni lebah di kawasan hutan desa. Dikemas dalam botol kaca 250 ml dan 500 ml.</p>',
   'cat_demo_umum', '628123456004', 'Dusun Sukatani RT 02', 0, 'published'),
  ('umk_demo_batik', 'vil_demo', 'batik-tulis-sekar-arum', 'Batik Tulis Sekar Arum', 'Sanggar Batik Desa',
   '<p>Batik tulis dengan motif yang terinspirasi flora setempat. Melayani pesanan kain, seragam, dan suvenir.</p>',
   'cat_demo_umum', '628123456005', 'Dusun Sukamaju RT 07', 0, 'published'),
  ('umk_demo_gula', 'vil_demo', 'gula-aren-manis-lestari', 'Gula Aren Manis Lestari', 'Usaha Bersama',
   '<p>Gula aren cetak dan gula semut tanpa bahan tambahan, diolah langsung dari nira pohon aren di kebun warga.</p>',
   'cat_demo_umum', '628123456006', 'Dusun Sukasari RT 04', 0, 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO umkm_products (id, village_id, umkm_id, slug, name, description, price, unit, stock_status, is_featured, status) VALUES
  ('ump_demo_1', 'vil_demo', 'umk_demo_kopi', 'kopi-bubuk-250g', 'Kopi Bubuk 250 gram',
   'Robusta sangrai medium, cocok untuk seduh tubruk maupun saring.', 45000, 'bungkus', 'available', 1, 'published'),
  ('ump_demo_2', 'vil_demo', 'umk_demo_kopi', 'kopi-biji-500g', 'Biji Kopi Utuh 500 gram',
   'Biji utuh untuk digiling sendiri sesuai kebutuhan.', 85000, 'bungkus', 'available', 0, 'published'),
  ('ump_demo_3', 'vil_demo', 'umk_demo_keripik', 'keripik-original-200g', 'Keripik Original 200 gram',
   'Rasa gurih asli tanpa penyedap tambahan.', 15000, 'bungkus', 'available', 1, 'published'),
  ('ump_demo_4', 'vil_demo', 'umk_demo_keripik', 'keripik-balado-200g', 'Keripik Balado 200 gram',
   'Bumbu balado dengan tingkat pedas sedang.', 17000, 'bungkus', 'available', 0, 'published'),
  ('ump_demo_5', 'vil_demo', 'umk_demo_madu', 'madu-hutan-500ml', 'Madu Hutan 500 ml',
   'Madu multiflora, dikemas dalam botol kaca.', 120000, 'botol', 'available', 1, 'published'),
  ('ump_demo_6', 'vil_demo', 'umk_demo_anyaman', 'besek-bambu-sedang', 'Besek Bambu Ukuran Sedang',
   'Wadah bambu untuk kemasan makanan, pesanan minimal 50 buah.', 4500, 'buah', 'preorder', 0, 'published')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Tourism
-- ---------------------------------------------------------------------------

INSERT INTO tourism (id, village_id, slug, name, kind, description, address,
                     open_hours, ticket_price, contact, is_featured, status)
VALUES
  ('trs_demo_curug', 'vil_demo', 'curug-sukamaju', 'Curug Sukamaju', 'destinasi',
   '<p>Air terjun setinggi kurang lebih dua belas meter dengan kolam alami di bawahnya. Jalur menuju lokasi sudah ditata dengan anak tangga dan pegangan.</p><p>Tersedia area parkir, warung sederhana, dan toilet umum yang dikelola kelompok sadar wisata desa.</p>',
   'Dusun Sukamaju', '07.00 - 17.00 WIB', 10000, '628123456101', 1, 'published'),
  ('trs_demo_sawah', 'vil_demo', 'hamparan-sawah-terasering', 'Hamparan Sawah Terasering', 'destinasi',
   '<p>Bentang sawah berundak yang menjadi titik favorit menikmati matahari terbit. Terdapat gardu pandang sederhana di sisi timur.</p>',
   'Dusun Sukasari', 'Setiap hari', 0, NULL, 1, 'published'),
  ('trs_demo_kuliner', 'vil_demo', 'sentra-kuliner-desa', 'Sentra Kuliner Desa', 'kuliner',
   '<p>Deretan warung yang menyajikan masakan rumahan khas desa, dikelola langsung oleh warga. Ramai pada akhir pekan.</p>',
   'Jalan Desa, dekat balai desa', '08.00 - 21.00 WIB', 0, NULL, 0, 'published'),
  ('trs_demo_homestay', 'vil_demo', 'homestay-karya-desa', 'Homestay Karya Desa', 'penginapan',
   '<p>Penginapan sederhana di rumah warga yang dikelola BUMDes. Tersedia enam kamar dengan sarapan.</p>',
   'Dusun Sukamaju', 'Check-in 14.00 WIB', 175000, '628123456102', 0, 'published')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- APBDes
-- ---------------------------------------------------------------------------

INSERT INTO apbdes (id, village_id, fiscal_year, section, category, item,
                    budget_amount, actual_amount, sort_order, status)
VALUES
  ('apb_demo_p1', 'vil_demo', 2026, 'pendapatan', 'Pendapatan Transfer', 'Dana Desa',
   1150000000, 862500000, 10, 'published'),
  ('apb_demo_p2', 'vil_demo', 2026, 'pendapatan', 'Pendapatan Transfer', 'Alokasi Dana Desa',
   480000000, 360000000, 20, 'published'),
  ('apb_demo_p3', 'vil_demo', 2026, 'pendapatan', 'Pendapatan Asli Desa', 'Hasil Usaha BUMDes',
   95000000, 61000000, 30, 'published'),
  ('apb_demo_p4', 'vil_demo', 2026, 'pendapatan', 'Pendapatan Lain-lain', 'Bantuan Keuangan Kabupaten',
   120000000, 120000000, 40, 'published'),

  ('apb_demo_b1', 'vil_demo', 2026, 'belanja', 'Penyelenggaraan Pemerintahan', 'Operasional Pemerintah Desa',
   410000000, 298000000, 10, 'published'),
  ('apb_demo_b2', 'vil_demo', 2026, 'belanja', 'Pelaksanaan Pembangunan', 'Jalan Lingkungan dan Drainase',
   620000000, 415000000, 20, 'published'),
  ('apb_demo_b3', 'vil_demo', 2026, 'belanja', 'Pembinaan Kemasyarakatan', 'Posyandu dan Kesehatan',
   185000000, 142000000, 30, 'published'),
  ('apb_demo_b4', 'vil_demo', 2026, 'belanja', 'Pemberdayaan Masyarakat', 'Pelatihan UMKM dan Kelompok Tani',
   240000000, 158000000, 40, 'published'),
  ('apb_demo_b5', 'vil_demo', 2026, 'belanja', 'Penanggulangan Bencana', 'Tanggap Darurat dan Mitigasi',
   90000000, 31000000, 50, 'published'),

  ('apb_demo_f1', 'vil_demo', 2026, 'pembiayaan', 'Penerimaan Pembiayaan', 'SiLPA Tahun Sebelumnya',
   145000000, 145000000, 10, 'published'),
  ('apb_demo_f2', 'vil_demo', 2026, 'pembiayaan', 'Pengeluaran Pembiayaan', 'Penyertaan Modal BUMDes',
   75000000, 75000000, 20, 'published')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Downloads
-- ---------------------------------------------------------------------------

INSERT INTO downloads (id, village_id, slug, title, description, category_id, external_url, sort_order, status) VALUES
  ('dwl_demo_1', 'vil_demo', 'formulir-surat-keterangan-domisili', 'Formulir Surat Keterangan Domisili',
   'Formulir pengajuan surat keterangan domisili untuk diisi dan dibawa ke kantor desa.', 'cat_demo_formulir', NULL, 10, 'published'),
  ('dwl_demo_2', 'vil_demo', 'formulir-surat-keterangan-usaha', 'Formulir Surat Keterangan Usaha',
   'Digunakan untuk pengajuan surat keterangan usaha bagi pelaku UMKM.', 'cat_demo_formulir', NULL, 20, 'published'),
  ('dwl_demo_3', 'vil_demo', 'formulir-surat-pengantar', 'Formulir Surat Pengantar',
   'Formulir umum surat pengantar dari desa ke instansi lain.', 'cat_demo_formulir', NULL, 30, 'published'),
  ('dwl_demo_4', 'vil_demo', 'ringkasan-apbdes-2026', 'Ringkasan APBDes 2026',
   'Dokumen ringkasan anggaran pendapatan dan belanja desa tahun 2026.', NULL, NULL, 40, 'published'),
  ('dwl_demo_5', 'vil_demo', 'profil-desa-2026', 'Profil Desa 2026',
   'Dokumen profil desa memuat data wilayah, kependudukan agregat, dan potensi.', NULL, NULL, 50, 'published')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Albums
-- ---------------------------------------------------------------------------

INSERT INTO albums (id, village_id, slug, title, description, kind, status, event_date, published_at, sort_order) VALUES
  ('alb_demo_1', 'vil_demo', 'musyawarah-desa-2026', 'Musyawarah Desa 2026',
   'Dokumentasi kegiatan musyawarah penetapan APBDes.', 'photo', 'published', date('now', '-2 days'), datetime('now', '-2 days'), 10),
  ('alb_demo_2', 'vil_demo', 'kerja-bakti-lingkungan', 'Kerja Bakti Lingkungan',
   'Kegiatan gotong royong pembersihan saluran air.', 'photo', 'published', date('now', '-18 days'), datetime('now', '-18 days'), 20),
  ('alb_demo_3', 'vil_demo', 'potret-desa', 'Potret Desa',
   'Kumpulan foto bentang alam dan aktivitas warga.', 'photo', 'published', NULL, datetime('now', '-30 days'), 30)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- FAQ additions
-- ---------------------------------------------------------------------------

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
-- Banners
-- ---------------------------------------------------------------------------

INSERT INTO banners (id, village_id, placement, title, subtitle, link_url, link_label, visible, sort_order) VALUES
  ('bnr_demo_hero', 'vil_demo', 'hero',
   'Pelayanan Desa, Kini dari Genggaman Anda',
   'Ajukan surat keterangan secara daring, pantau prosesnya dengan nomor tiket, dan akses informasi desa kapan saja.',
   '/layanan', 'Ajukan Surat Sekarang', 1, 10),
  ('bnr_demo_h2', 'vil_demo', 'hero', 'Transparansi Anggaran',
   'Rincian APBDes 2026 dapat diakses publik.', '/transparansi', 'Lihat APBDes', 1, 20),
  ('bnr_demo_h3', 'vil_demo', 'hero', 'Pengaduan Warga',
   'Sampaikan keluhan dan masukan, dapatkan nomor tiket.', '/pengaduan', 'Kirim Pengaduan', 1, 30),
  ('bnr_demo_h4', 'vil_demo', 'hero', 'Produk UMKM Desa',
   'Temukan produk unggulan warga desa.', '/umkm', 'Jelajahi UMKM', 1, 40),
  ('bnr_demo_run1', 'vil_demo', 'announcement',
   'Pelayanan surat daring kini tersedia 24 jam melalui menu Layanan.', NULL, '/layanan', NULL, 1, 10),
  ('bnr_demo_run2', 'vil_demo', 'announcement',
   'Posyandu balita digelar setiap awal bulan di lima dusun.', NULL, '/event', NULL, 1, 20),
  ('bnr_demo_run3', 'vil_demo', 'announcement',
   'Rincian APBDes 2026 sudah dapat diakses pada menu Transparansi.', NULL, '/transparansi', NULL, 1, 30)
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
