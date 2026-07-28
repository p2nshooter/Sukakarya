-- Migration 0002: editorial and public-facing content.
--
-- Every table is village-scoped. Publication is controlled by `status`,
-- `published_at` and `expire_at` so scheduled publishing works without a cron.

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id           TEXT PRIMARY KEY,
  village_id   TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'post'
               CHECK (type IN ('post', 'event', 'gallery', 'download',
                               'umkm', 'tourism', 'ppid', 'directory')),
  description  TEXT,
  color        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  visible      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (village_id, type, slug)
);

CREATE TABLE tags (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  UNIQUE (village_id, slug)
);

-- ---------------------------------------------------------------------------
-- Posts: news, articles and announcements share one table, split by `type`.
-- ---------------------------------------------------------------------------

CREATE TABLE posts (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'news'
                 CHECK (type IN ('news', 'article', 'announcement')),
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  excerpt        TEXT,
  body           TEXT,
  category_id    TEXT REFERENCES categories (id) ON DELETE SET NULL,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  author_id      TEXT REFERENCES users (id) ON DELETE SET NULL,
  author_name    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published', 'archived')),
  access_level   TEXT NOT NULL DEFAULT 'public'
                 CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                         'staff', 'admin', 'super_admin')),
  is_featured    INTEGER NOT NULL DEFAULT 0,
  is_pinned      INTEGER NOT NULL DEFAULT 0,
  is_breaking    INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  meta_title       TEXT,
  meta_description TEXT,
  og_media_id      TEXT REFERENCES media (id) ON DELETE SET NULL,
  noindex          INTEGER NOT NULL DEFAULT 0,
  published_at     TEXT,
  expire_at        TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT,
  UNIQUE (village_id, slug)
);

CREATE INDEX idx_posts_feed
  ON posts (village_id, type, status, published_at DESC);
CREATE INDEX idx_posts_featured ON posts (village_id, is_featured, is_pinned);

CREATE TABLE post_tags (
  post_id  TEXT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Events and agenda
-- ---------------------------------------------------------------------------

CREATE TABLE events (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  category_id    TEXT REFERENCES categories (id) ON DELETE SET NULL,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  location       TEXT,
  latitude       REAL,
  longitude      REAL,
  starts_at      TEXT NOT NULL,
  ends_at        TEXT,
  all_day        INTEGER NOT NULL DEFAULT 0,
  organizer      TEXT,
  registration_url TEXT,
  is_featured    INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published', 'archived', 'cancelled')),
  access_level   TEXT NOT NULL DEFAULT 'public'
                 CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                         'staff', 'admin', 'super_admin')),
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT,
  UNIQUE (village_id, slug)
);

CREATE INDEX idx_events_calendar
  ON events (village_id, status, starts_at);

-- ---------------------------------------------------------------------------
-- Gallery: albums hold ordered media items (photo, video, drone, 360)
-- ---------------------------------------------------------------------------

CREATE TABLE albums (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  kind           TEXT NOT NULL DEFAULT 'photo'
                 CHECK (kind IN ('photo', 'video', 'drone', 'panorama', 'mixed')),
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published', 'archived')),
  access_level   TEXT NOT NULL DEFAULT 'public'
                 CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                         'staff', 'admin', 'super_admin')),
  event_date     TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT,
  UNIQUE (village_id, slug)
);

CREATE TABLE gallery_items (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  album_id    TEXT REFERENCES albums (id) ON DELETE CASCADE,
  media_id    TEXT REFERENCES media (id) ON DELETE CASCADE,
  title       TEXT,
  caption     TEXT,
  -- External embeds (YouTube etc.) have no media_id; either media_id or
  -- embed_url must be set. Enforced in the application layer.
  embed_url   TEXT,
  kind        TEXT NOT NULL DEFAULT 'photo'
              CHECK (kind IN ('photo', 'video', 'drone', 'panorama')),
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gallery_items_album ON gallery_items (album_id, sort_order);

-- ---------------------------------------------------------------------------
-- Banners, running text and popups
-- ---------------------------------------------------------------------------

CREATE TABLE banners (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  placement      TEXT NOT NULL DEFAULT 'hero'
                 CHECK (placement IN ('hero', 'event', 'announcement', 'popup',
                                      'sidebar', 'emergency', 'sponsor')),
  title          TEXT,
  subtitle       TEXT,
  body           TEXT,
  media_id       TEXT REFERENCES media (id) ON DELETE SET NULL,
  link_url       TEXT,
  link_label     TEXT,
  severity       TEXT NOT NULL DEFAULT 'info'
                 CHECK (severity IN ('info', 'success', 'warning', 'danger')),
  visible        INTEGER NOT NULL DEFAULT 1,
  publish_at     TEXT,
  expire_at      TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_banners_placement
  ON banners (village_id, placement, visible, sort_order);

-- ---------------------------------------------------------------------------
-- Government: officials, organisation structure, regulations
-- ---------------------------------------------------------------------------

CREATE TABLE officials (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  position       TEXT NOT NULL,
  unit           TEXT NOT NULL DEFAULT 'pemerintah_desa'
                 CHECK (unit IN ('pemerintah_desa', 'bpd', 'pkk',
                                 'karang_taruna', 'lpm', 'linmas', 'rt', 'rw',
                                 'dusun', 'lainnya')),
  parent_id      TEXT REFERENCES officials (id) ON DELETE SET NULL,
  photo_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  term_start     TEXT,
  term_end       TEXT,
  bio            TEXT,
  -- Deliberately no NIK / phone / address: personal identifiers are never
  -- stored on a publicly rendered table.
  visible        INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_officials_unit ON officials (village_id, unit, sort_order);

CREATE TABLE regulations (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'perdes'
                 CHECK (type IN ('perdes', 'perkades', 'sk', 'rpjmdes',
                                 'rkpdes', 'sop', 'program')),
  number         TEXT,
  year           INTEGER,
  title          TEXT NOT NULL,
  summary        TEXT,
  media_id       TEXT REFERENCES media (id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
  published_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_regulations_type ON regulations (village_id, type, year DESC);

-- ---------------------------------------------------------------------------
-- Transparency: APBDes budget and realisation
-- ---------------------------------------------------------------------------

CREATE TABLE apbdes (
  id            TEXT PRIMARY KEY,
  village_id    TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  fiscal_year   INTEGER NOT NULL,
  section       TEXT NOT NULL
                CHECK (section IN ('pendapatan', 'belanja', 'pembiayaan')),
  category      TEXT NOT NULL,
  item          TEXT NOT NULL,
  budget_amount REAL NOT NULL DEFAULT 0,
  actual_amount REAL NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'IDR',
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'archived')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_apbdes_year ON apbdes (village_id, fiscal_year, section);

-- ---------------------------------------------------------------------------
-- PPID (public information disclosure)
-- ---------------------------------------------------------------------------

CREATE TABLE ppid_items (
  id           TEXT PRIMARY KEY,
  village_id   TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  classification TEXT NOT NULL DEFAULT 'berkala'
                 CHECK (classification IN ('berkala', 'setiap_saat',
                                           'serta_merta', 'dikecualikan')),
  title        TEXT NOT NULL,
  summary      TEXT,
  media_id     TEXT REFERENCES media (id) ON DELETE SET NULL,
  period       TEXT,
  status       TEXT NOT NULL DEFAULT 'published'
               CHECK (status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ppid_class ON ppid_items (village_id, classification);

CREATE TABLE ppid_requests (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  ticket         TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL DEFAULT 'permohonan'
                 CHECK (kind IN ('permohonan', 'keberatan')),
  requester_name TEXT NOT NULL,
  contact        TEXT NOT NULL,       -- treated as private, never rendered
  subject        TEXT NOT NULL,
  detail         TEXT NOT NULL,
  purpose        TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted', 'in_review', 'fulfilled',
                                   'rejected')),
  response       TEXT,
  handled_by     TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Downloads / document centre
-- ---------------------------------------------------------------------------

CREATE TABLE downloads (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  category_id    TEXT REFERENCES categories (id) ON DELETE SET NULL,
  media_id       TEXT REFERENCES media (id) ON DELETE SET NULL,
  external_url   TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
  access_level   TEXT NOT NULL DEFAULT 'public'
                 CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                         'staff', 'admin', 'super_admin')),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT,
  UNIQUE (village_id, slug)
);

-- ---------------------------------------------------------------------------
-- Economy: UMKM, products, tourism, village potential
-- ---------------------------------------------------------------------------

CREATE TABLE umkm (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  owner_name     TEXT,
  description    TEXT,
  category_id    TEXT REFERENCES categories (id) ON DELETE SET NULL,
  logo_media_id  TEXT REFERENCES media (id) ON DELETE SET NULL,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  -- Business contact details are published deliberately (a shop front), unlike
  -- citizen personal data.
  whatsapp       TEXT,
  address        TEXT,
  latitude       REAL,
  longitude      REAL,
  qris_media_id  TEXT REFERENCES media (id) ON DELETE SET NULL,
  rating         REAL NOT NULL DEFAULT 0,
  is_featured    INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT,
  UNIQUE (village_id, slug)
);

CREATE TABLE umkm_products (
  id            TEXT PRIMARY KEY,
  village_id    TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  umkm_id       TEXT NOT NULL REFERENCES umkm (id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         REAL,
  currency      TEXT NOT NULL DEFAULT 'IDR',
  unit          TEXT,
  media_id      TEXT REFERENCES media (id) ON DELETE SET NULL,
  stock_status  TEXT NOT NULL DEFAULT 'available'
                CHECK (stock_status IN ('available', 'preorder', 'out_of_stock')),
  is_featured   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'archived')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (village_id, slug)
);

CREATE INDEX idx_umkm_products_umkm ON umkm_products (umkm_id, sort_order);

CREATE TABLE tourism (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'destinasi'
                 CHECK (kind IN ('destinasi', 'kuliner', 'penginapan', 'lainnya')),
  description    TEXT,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  address        TEXT,
  latitude       REAL,
  longitude      REAL,
  open_hours     TEXT,
  ticket_price   REAL,
  contact        TEXT,
  rating         REAL NOT NULL DEFAULT 0,
  is_featured    INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT,
  UNIQUE (village_id, slug)
);

CREATE TABLE potentials (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  sector         TEXT NOT NULL
                 CHECK (sector IN ('pertanian', 'perikanan', 'peternakan',
                                   'industri', 'wisata', 'umkm', 'investasi',
                                   'bumdes', 'koperasi')),
  title          TEXT NOT NULL,
  description    TEXT,
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  metric_label   TEXT,
  metric_value   TEXT,
  visible        INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Directory: public facilities (RT/RW, schools, clinics, worship places, ...)
-- ---------------------------------------------------------------------------

CREATE TABLE directory_entries (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- rt | rw | sekolah | masjid | posyandu | ...
  name        TEXT NOT NULL,
  description TEXT,
  address     TEXT,
  contact     TEXT,
  latitude    REAL,
  longitude   REAL,
  media_id    TEXT REFERENCES media (id) ON DELETE SET NULL,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_directory_type ON directory_entries (village_id, type, sort_order);

-- ---------------------------------------------------------------------------
-- Statistics: aggregate figures only. Individual citizen records are out of
-- scope for this application by design.
-- ---------------------------------------------------------------------------

CREATE TABLE statistics (
  id           TEXT PRIMARY KEY,
  village_id   TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  dataset      TEXT NOT NULL,   -- penduduk | gender | umur | pendidikan | ...
  label        TEXT NOT NULL,
  value        REAL NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'jiwa',
  period       TEXT,            -- e.g. "2026-Q1"
  sort_order   INTEGER NOT NULL DEFAULT 0,
  visible      INTEGER NOT NULL DEFAULT 1,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_statistics_dataset ON statistics (village_id, dataset, sort_order);
