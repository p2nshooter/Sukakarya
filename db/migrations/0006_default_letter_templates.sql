-- Default wording for the five letters every village ships with.
--
-- Migration 0004 gave services a `letter_template` column but left it empty, so
-- a village that installed this script could take a request, approve it, open
-- the print screen - and find nothing to print. The operator was expected to
-- compose an official surat from a blank box, which is both the slowest part of
-- setting up and the easiest to get wrong.
--
-- Each template below is ordinary Indonesian office wording with {{placeholder}}
-- slots. Village name, head of village, date of issue and validity are filled at
-- print time from the village's own record, so these are correct for whichever
-- village installs them without a single edit.
--
-- Only rows where the field is still NULL are touched, and the match is by slug,
-- so this never overwrites wording a village has already written for itself and
-- it applies to every tenant at once.

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
