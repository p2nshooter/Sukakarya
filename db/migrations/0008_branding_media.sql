-- The village crest and the regency arms, as media rows.
--
-- Both were added to db/seed/village-assets.sql, and that file is run only by
-- the bootstrap workflow - which also re-seeds branding, menus and page
-- sections. So the crest could not reach a live village without resetting that
-- village's layout, which is not a trade worth offering. The result was a logo
-- that existed in the repository, was uploaded nowhere, and never appeared.
--
-- The objects themselves are pushed to R2 by the deploy workflow immediately
-- before this runs, so the row and the object arrive together: a media row
-- whose object is missing serves a 404 rather than an image.
--
-- ---------------------------------------------------------------------------
-- Every statement is guarded on the village already existing.
--
-- Migrations run against a database that has never been seeded - that is what
-- CI does on every push, and what a fresh install does before bootstrap - so at
-- this point `villages` may well be empty. An unguarded INSERT into `media`
-- then fails the foreign key and takes the whole migration down with it.
--
-- The guard also draws the line correctly: this migration exists for villages
-- that are already live, and village-assets.sql is the path for a fresh
-- install. On a fresh database every statement here is a no-op, and the seed
-- puts the same rows in a moment later.
-- ---------------------------------------------------------------------------

INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
)
SELECT
  'med_logo_desa', 'vil_demo',
  'branding/logo-desa-sukakarya.png', 'logo-desa-sukakarya.png',
  'image/png', 303618, 'image', 512, 512,
  'Logo Desa Sukakarya', '/branding', 'public'
WHERE EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo')
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
)
SELECT
  'med_lambang_kabupaten', 'vil_demo',
  'branding/lambang-kabupaten-bekasi.png', 'lambang-kabupaten-bekasi.png',
  'image/png', 90771, 'image', 300, 300,
  'Lambang Kabupaten Bekasi', '/branding', 'public'
WHERE EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo')
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- Only when the village has not chosen its own, so a village that uploaded a
-- replacement keeps it.
UPDATE villages
   SET logo_media_id = 'med_logo_desa'
 WHERE id = 'vil_demo'
   AND logo_media_id IS NULL
   AND EXISTS (SELECT 1 FROM media WHERE id = 'med_logo_desa');

UPDATE villages
   SET favicon_media_id = 'med_logo_desa'
 WHERE id = 'vil_demo'
   AND favicon_media_id IS NULL
   AND EXISTS (SELECT 1 FROM media WHERE id = 'med_logo_desa');

-- The arms belong to the kabupaten rather than to this village - a second
-- village in the same regency points at the same emblem - so they are a
-- setting, not a column.
INSERT INTO village_settings (village_id, key, value)
SELECT 'vil_demo', 'site.regency_emblem_media_id', 'med_lambang_kabupaten'
WHERE EXISTS (SELECT 1 FROM media WHERE id = 'med_lambang_kabupaten')
ON CONFLICT (village_id, key) DO NOTHING;

-- The header logo is a module and ships `default_visible = 0`, so assigning
-- logo_media_id alone changes nothing on screen: the site keeps drawing the
-- initial-letter square. Switched on here, where the logo is assigned.
--
-- DO NOTHING rather than DO UPDATE: a village that deliberately turned the
-- logo off in Panel Admin > Modul must not have it switched back on by the
-- next deploy.
INSERT INTO module_settings (village_id, module_id, enabled, visible, sort_order)
SELECT 'vil_demo', 'logo-desa', 1, 1, 0
WHERE EXISTS (SELECT 1 FROM villages WHERE id = 'vil_demo')
  AND EXISTS (SELECT 1 FROM modules WHERE id = 'logo-desa')
ON CONFLICT (village_id, module_id) DO NOTHING;
