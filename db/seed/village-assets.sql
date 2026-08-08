-- Media rows for the assets shipped alongside the seed.
--
-- The bytes live in db/seed/assets/ and are pushed to R2 by the bootstrap
-- workflow immediately before this file runs, so the row and the object are
-- created together. `media` rows are useless without their object: the serving
-- route reports a missing object as 404 rather than streaming an empty body.
--
-- Applied separately from demo-content.sql because these are the real village's
-- assets, not demonstration filler.

INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
) VALUES (
  'med_kades_sukakarya', 'vil_demo',
  'officials/kepala-desa-sukakarya.jpg', 'kepala-desa-sukakarya.jpg',
  'image/jpeg', 125467, 'image', 800, 1000,
  'Kepala Desa Sukakarya, Bapak Joni Fahamsyah',
  '/perangkat', 'public'
)
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- Attach it to the office holder. Kept out of demo-content.sql so re-seeding
-- the demonstration rows can never detach a real photograph.
UPDATE officials
   SET photo_media_id = 'med_kades_sukakarya'
 WHERE id = 'off_demo_kades' AND village_id = 'vil_demo';
