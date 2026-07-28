-- Migration 0001: core tenancy, identity and module registry.
--
-- Every content row in this application is scoped by `village_id`. There is no
-- village-specific value anywhere in the schema or in application code: the
-- active tenant is resolved at request time from the request hostname (see
-- `villages.domain`) and falls back to the DEFAULT_VILLAGE_SLUG binding.

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

CREATE TABLE villages (
  id                TEXT PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  domain            TEXT UNIQUE,               -- custom hostname, nullable
  name              TEXT NOT NULL,             -- e.g. "Desa <name>"
  entity_label      TEXT NOT NULL DEFAULT 'Desa',
  district          TEXT,                      -- kecamatan
  regency           TEXT,                      -- kabupaten/kota
  province          TEXT,
  postal_code       TEXT,
  country           TEXT NOT NULL DEFAULT 'Indonesia',
  latitude          REAL,
  longitude         REAL,
  map_zoom          INTEGER NOT NULL DEFAULT 14,
  address           TEXT,
  phone             TEXT,
  whatsapp          TEXT,
  email             TEXT,
  logo_media_id     TEXT,
  favicon_media_id  TEXT,
  primary_color     TEXT NOT NULL DEFAULT '#15803d',
  secondary_color   TEXT NOT NULL DEFAULT '#166534',
  accent_color      TEXT NOT NULL DEFAULT '#f59e0b',
  locale            TEXT NOT NULL DEFAULT 'id',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'maintenance')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_villages_status ON villages (status);

-- Free-form per-tenant configuration. Anything that a village operator may want
-- to change without a schema migration lives here as a namespaced key.
CREATE TABLE village_settings (
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       TEXT,
  value_type  TEXT NOT NULL DEFAULT 'string'
              CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  is_secret   INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (village_id, key)
);

-- ---------------------------------------------------------------------------
-- Identity, roles and permissions
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT,
  level        INTEGER NOT NULL DEFAULT 10, -- higher wins; super admin = 100
  is_system    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,  -- e.g. "news.publish"
  resource     TEXT NOT NULL,
  action       TEXT NOT NULL,
  description  TEXT
);

CREATE TABLE role_permissions (
  role_id        TEXT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id  TEXT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  village_id     TEXT REFERENCES villages (id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  password_hash  TEXT NOT NULL,     -- PBKDF2-SHA256, never exposed by any API
  password_salt  TEXT NOT NULL,
  phone          TEXT,
  avatar_media_id TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'pending', 'suspended')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login_at  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE UNIQUE INDEX idx_users_village_email ON users (village_id, email);
CREATE INDEX idx_users_status ON users (status);

CREATE TABLE user_roles (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id  TEXT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,     -- SHA-256 of the cookie token
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  village_id  TEXT REFERENCES villages (id) ON DELETE CASCADE,
  user_agent  TEXT,
  ip_hash     TEXT,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expiry ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Module registry
--
-- `modules` is the global catalogue of every feature the platform ships with.
-- `module_settings` holds the per-village override: whether it is installed,
-- visible, who may see it, on which devices, and for how long. The public site
-- renders strictly from this table, so a village operator can reshape the whole
-- website without a deploy.
-- ---------------------------------------------------------------------------

CREATE TABLE modules (
  id            TEXT PRIMARY KEY,      -- stable slug, e.g. "hero-banner"
  code          INTEGER NOT NULL UNIQUE, -- 1..300 catalogue number
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,         -- home | profil | pemerintahan | ...
  description   TEXT,
  placement     TEXT NOT NULL DEFAULT 'section'
                CHECK (placement IN ('header', 'navigation', 'section',
                                     'sidebar', 'footer', 'page', 'admin',
                                     'system')),
  -- Platform defaults applied when a village is provisioned.
  default_enabled  INTEGER NOT NULL DEFAULT 1,
  default_visible  INTEGER NOT NULL DEFAULT 1,
  default_access   TEXT NOT NULL DEFAULT 'public'
                   CHECK (default_access IN ('public', 'authenticated',
                                             'citizen', 'staff', 'admin',
                                             'super_admin')),
  default_sort     INTEGER NOT NULL DEFAULT 0,
  is_core          INTEGER NOT NULL DEFAULT 0, -- cannot be uninstalled
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_modules_category ON modules (category);
CREATE INDEX idx_modules_placement ON modules (placement);

CREATE TABLE module_settings (
  village_id   TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  module_id    TEXT NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
  enabled      INTEGER NOT NULL DEFAULT 1,  -- feature switched on at all
  visible      INTEGER NOT NULL DEFAULT 1,  -- rendered on the public site
  access_level TEXT NOT NULL DEFAULT 'public'
               CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                       'staff', 'admin', 'super_admin')),
  device       TEXT NOT NULL DEFAULT 'all'
               CHECK (device IN ('all', 'desktop', 'tablet', 'mobile')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  publish_at   TEXT,   -- NULL = live immediately
  expire_at    TEXT,   -- NULL = never expires
  title_override TEXT,
  config       TEXT NOT NULL DEFAULT '{}',  -- JSON, module specific
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (village_id, module_id)
);

CREATE INDEX idx_module_settings_lookup
  ON module_settings (village_id, visible, sort_order);

-- ---------------------------------------------------------------------------
-- Media library (objects live in R2, metadata lives here)
-- ---------------------------------------------------------------------------

CREATE TABLE media (
  id            TEXT PRIMARY KEY,
  village_id    TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  object_key    TEXT NOT NULL UNIQUE,   -- R2 key
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'file'
                CHECK (kind IN ('image', 'video', 'audio', 'document', 'file')),
  width         INTEGER,
  height        INTEGER,
  checksum      TEXT,
  alt_text      TEXT,
  caption       TEXT,
  folder        TEXT NOT NULL DEFAULT '/',
  visibility    TEXT NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('public', 'private')),
  uploaded_by   TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT
);

CREATE INDEX idx_media_village ON media (village_id, created_at DESC);
CREATE INDEX idx_media_kind ON media (village_id, kind);

-- ---------------------------------------------------------------------------
-- Dynamic navigation, pages and sections
-- ---------------------------------------------------------------------------

CREATE TABLE menus (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,            -- primary | footer | quick | mobile
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (village_id, slug)
);

CREATE TABLE menu_items (
  id          TEXT PRIMARY KEY,
  menu_id     TEXT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
  parent_id   TEXT REFERENCES menu_items (id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,
  target      TEXT NOT NULL DEFAULT '_self' CHECK (target IN ('_self', '_blank')),
  module_id   TEXT REFERENCES modules (id) ON DELETE SET NULL,
  access_level TEXT NOT NULL DEFAULT 'public'
               CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                       'staff', 'admin', 'super_admin')),
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_menu_items_menu ON menu_items (menu_id, sort_order);

CREATE TABLE pages (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  title          TEXT NOT NULL,
  excerpt        TEXT,
  body           TEXT,
  template       TEXT NOT NULL DEFAULT 'default',
  cover_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published', 'archived')),
  access_level   TEXT NOT NULL DEFAULT 'public'
                 CHECK (access_level IN ('public', 'authenticated', 'citizen',
                                         'staff', 'admin', 'super_admin')),
  meta_title       TEXT,
  meta_description TEXT,
  og_media_id      TEXT REFERENCES media (id) ON DELETE SET NULL,
  noindex          INTEGER NOT NULL DEFAULT 0,
  published_at     TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at       TEXT,
  UNIQUE (village_id, slug)
);

CREATE INDEX idx_pages_status ON pages (village_id, status);

-- Homepage (and any page) is assembled from ordered sections that each point at
-- a module. Nothing about the layout is compiled into the code.
CREATE TABLE page_sections (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  page_slug   TEXT NOT NULL DEFAULT 'home',
  module_id   TEXT NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
  title       TEXT,
  subtitle    TEXT,
  variant     TEXT NOT NULL DEFAULT 'default',
  config      TEXT NOT NULL DEFAULT '{}',
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_page_sections_lookup
  ON page_sections (village_id, page_slug, sort_order);
