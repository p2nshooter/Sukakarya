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

-- ---------------------------------------------------------------------------
-- Welcome video that opens the homepage
-- ---------------------------------------------------------------------------

INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
) VALUES (
  'med_sambutan_video', 'vil_demo',
  'sambutan/sambutan-desa.mp4', 'sambutan-desa.mp4',
  'video/mp4', 2663505, 'video', 1280, 720,
  'Video sambutan Desa Sukakarya: pelayanan desa kini dari genggaman Anda.',
  '/sambutan', 'public'
)
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- A WebM copy for browsers built without an H.264 decoder. Offered second, so
-- every phone still gets the MP4.
INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
) VALUES (
  'med_sambutan_webm', 'vil_demo',
  'sambutan/sambutan-desa.webm', 'sambutan-desa.webm',
  'video/webm', 1964077, 'video', 1280, 720,
  'Video sambutan Desa Sukakarya (format WebM).',
  '/sambutan', 'public'
)
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- The still the browser paints before the first frame decodes. Without it the
-- top of the page is a black rectangle for as long as the network takes.
INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
) VALUES (
  'med_sambutan_poster', 'vil_demo',
  'sambutan/sambutan-desa-poster.jpg', 'sambutan-desa-poster.jpg',
  'image/jpeg', 185817, 'image', 1280, 720,
  'Cuplikan pembuka video sambutan Desa Sukakarya.',
  '/sambutan', 'public'
)
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- Sort order 5 puts it above the hero, which sits at 10. It is an ordinary
-- section row, so Tata Letak can move, retitle or hide it afterwards.
INSERT INTO page_sections
  (id, village_id, page_slug, module_id, title, subtitle, variant, config,
   visible, sort_order)
VALUES (
  'ps_home_video', 'vil_demo', 'home', 'video-banner',
  'Selamat Datang di Website Resmi Desa Sukakarya',
  'Pelayanan desa, kini dari genggaman Anda.',
  'default',
  '{"mediaId":"med_sambutan_video","webmMediaId":"med_sambutan_webm","posterMediaId":"med_sambutan_poster"}',
  1, 5
)
ON CONFLICT (id) DO UPDATE SET
  title      = excluded.title,
  subtitle   = excluded.subtitle,
  config     = excluded.config,
  sort_order = excluded.sort_order,
  visible    = 1;

-- A section is only rendered when its module is switched on for the village,
-- so the row is written explicitly rather than left to the catalogue default.
INSERT INTO module_settings (village_id, module_id, enabled, visible, sort_order)
VALUES ('vil_demo', 'video-banner', 1, 1, 5)
ON CONFLICT (village_id, module_id) DO UPDATE SET enabled = 1, visible = 1;

-- ---------------------------------------------------------------------------
-- Video profil desa
-- ---------------------------------------------------------------------------

INSERT INTO media (
  id, village_id, object_key, file_name, mime_type, size_bytes,
  kind, width, height, alt_text, folder, visibility
) VALUES
  ('med_profil_video', 'vil_demo', 'profil/profil-desa.mp4',
   'profil-desa.mp4', 'video/mp4', 2725326, 'video', 1280, 720,
   'Video profil Desa Sukakarya.', '/profil', 'public'),
  ('med_profil_webm', 'vil_demo', 'profil/profil-desa.webm',
   'profil-desa.webm', 'video/webm', 1529914, 'video', 1280, 720,
   'Video profil Desa Sukakarya (format WebM).', '/profil', 'public'),
  ('med_profil_poster', 'vil_demo', 'profil/profil-desa-poster.jpg',
   'profil-desa-poster.jpg', 'image/jpeg', 122680, 'image', 1280, 720,
   'Cuplikan pembuka video profil Desa Sukakarya.', '/profil', 'public')
ON CONFLICT (id) DO UPDATE SET
  object_key = excluded.object_key,
  size_bytes = excluded.size_bytes,
  alt_text   = excluded.alt_text;

-- Sits between the Kepala Desa's welcome (30) and the statistics (40), so the
-- video follows the greeting rather than interrupting the page.
INSERT INTO page_sections
  (id, village_id, page_slug, module_id, title, subtitle, variant, config,
   visible, sort_order)
VALUES (
  'ps_home_video_profil', 'vil_demo', 'home', 'video-profil',
  'Video Profil Desa Sukakarya', NULL, 'default',
  '{"mediaId":"med_profil_video","webmMediaId":"med_profil_webm","posterMediaId":"med_profil_poster"}',
  1, 35
)
ON CONFLICT (id) DO UPDATE SET
  title    = excluded.title,
  config   = excluded.config,
  visible  = 1;

INSERT INTO module_settings (village_id, module_id, enabled, visible, sort_order)
VALUES ('vil_demo', 'video-profil', 1, 1, 35)
ON CONFLICT (village_id, module_id) DO UPDATE SET enabled = 1, visible = 1;
