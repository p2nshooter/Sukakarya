-- The administrative area a village sits in.
--
-- district, regency and province were left NULL on the seeded village, and NULL
-- is not a neutral default here. Two things depend on them:
--
--   The letterhead on a printed surat. With no regency it prints the bare word
--   "Kabupaten" with nothing after it, and the "Kecamatan ..." line disappears
--   entirely - on an official document that goes out under the village's name.
--
--   Resident registration. The regency is the anchor that stops someone from a
--   different Sukakarya - the name repeats across Indonesia - registering here.
--   With it NULL the check falls back to the village name alone, which is
--   exactly the hole the anchor exists to close.
--
-- Only NULL columns are filled. A village that has already set its area in
-- Pengaturan Desa keeps what it typed, and the deploy re-running this is a
-- no-op. That is also why this is a migration rather than a line in seed.sql:
-- seed.sql overwrites name, address, phone and email from its own values, so
-- running it on every deploy would quietly undo an operator's edits.

UPDATE villages
   SET district = 'Sukakarya'
 WHERE id = 'vil_demo' AND district IS NULL;

UPDATE villages
   SET regency = 'Kabupaten Bekasi'
 WHERE id = 'vil_demo' AND regency IS NULL;

UPDATE villages
   SET province = 'Jawa Barat'
 WHERE id = 'vil_demo' AND province IS NULL;
