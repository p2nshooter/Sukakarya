-- Migration 0003: citizen services, engagement and system tables.

-- ---------------------------------------------------------------------------
-- Online letter services
--
-- `services` is the catalogue of letter types a village offers; the required
-- fields of each form are stored as a JSON schema so a village can add a new
-- letter type without any code change.
-- ---------------------------------------------------------------------------

CREATE TABLE services (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  requirements   TEXT,             -- markdown checklist shown to the citizen
  form_schema    TEXT NOT NULL DEFAULT '[]',  -- JSON array of field defs
  template_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  sla_days       INTEGER NOT NULL DEFAULT 3,
  requires_login INTEGER NOT NULL DEFAULT 1,
  fee            REAL NOT NULL DEFAULT 0,
  visible        INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (village_id, slug)
);

-- Submitted letter requests. `payload` holds the answers to `form_schema` and
-- is only ever readable by the requester and by staff - it is never rendered on
-- a public page. Public tracking exposes status only, keyed by ticket.
CREATE TABLE letter_requests (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  service_id     TEXT NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  ticket         TEXT NOT NULL UNIQUE,
  user_id        TEXT REFERENCES users (id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  contact        TEXT,
  payload        TEXT NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted', 'in_review', 'approved',
                                   'rejected', 'completed', 'cancelled')),
  note           TEXT,
  reject_reason  TEXT,
  result_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  verification_code TEXT UNIQUE,     -- backs the public QR verification page
  handled_by     TEXT REFERENCES users (id) ON DELETE SET NULL,
  submitted_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at   TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_letter_requests_status
  ON letter_requests (village_id, status, submitted_at DESC);
CREATE INDEX idx_letter_requests_user ON letter_requests (user_id);

CREATE TABLE letter_request_events (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES letter_requests (id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  actor_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_letter_events_request
  ON letter_request_events (request_id, created_at);

-- ---------------------------------------------------------------------------
-- Complaints (pengaduan) and aspirations
-- ---------------------------------------------------------------------------

CREATE TABLE complaints (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  ticket         TEXT NOT NULL UNIQUE,
  user_id        TEXT REFERENCES users (id) ON DELETE SET NULL,
  reporter_name  TEXT NOT NULL,
  contact        TEXT,                -- private
  category       TEXT NOT NULL DEFAULT 'umum',
  subject        TEXT NOT NULL,
  detail         TEXT NOT NULL,
  location       TEXT,
  latitude       REAL,
  longitude      REAL,
  is_anonymous   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted', 'in_review', 'in_progress',
                                   'resolved', 'rejected')),
  response       TEXT,
  handled_by     TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_complaints_status
  ON complaints (village_id, status, created_at DESC);

CREATE TABLE complaint_attachments (
  id           TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  media_id     TEXT NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE aspirations (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users (id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'submitted'
              CHECK (status IN ('submitted', 'published', 'answered', 'rejected')),
  response    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Engagement: FAQ, polls, testimonials, partners, newsletter
-- ---------------------------------------------------------------------------

CREATE TABLE faqs (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  category    TEXT,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE polls (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'open', 'closed')),
  requires_login INTEGER NOT NULL DEFAULT 1,
  starts_at   TEXT,
  ends_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE poll_options (
  id         TEXT PRIMARY KEY,
  poll_id    TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE poll_votes (
  id         TEXT PRIMARY KEY,
  poll_id    TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  option_id  TEXT NOT NULL REFERENCES poll_options (id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  voter_hash TEXT NOT NULL,          -- hashed identity, prevents double voting
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (poll_id, voter_hash)
);

CREATE TABLE testimonials (
  id            TEXT PRIMARY KEY,
  village_id    TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  author_name   TEXT NOT NULL,
  author_role   TEXT,
  body          TEXT NOT NULL,
  rating        INTEGER,
  photo_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  visible       INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE partners (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'partner'
              CHECK (kind IN ('partner', 'sponsor')),
  logo_media_id TEXT REFERENCES media (id) ON DELETE SET NULL,
  url         TEXT,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE subscribers (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (village_id, email)
);

CREATE TABLE social_links (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,          -- whatsapp | facebook | instagram | ...
  url         TEXT NOT NULL,
  label       TEXT,
  visible     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (village_id, platform)
);

-- ---------------------------------------------------------------------------
-- System: notifications, audit trail, analytics
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users (id) ON DELETE CASCADE,
  channel     TEXT NOT NULL DEFAULT 'inapp'
              CHECK (channel IN ('inapp', 'email', 'whatsapp', 'push')),
  title       TEXT NOT NULL,
  body        TEXT,
  link_url    TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);

-- Append-only. Never exposed through any public route.
CREATE TABLE audit_logs (
  id          TEXT PRIMARY KEY,
  village_id  TEXT REFERENCES villages (id) ON DELETE CASCADE,
  actor_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  actor_label TEXT,
  action      TEXT NOT NULL,          -- create | update | delete | login | ...
  resource    TEXT NOT NULL,
  resource_id TEXT,
  summary     TEXT,
  ip_hash     TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_village ON audit_logs (village_id, created_at DESC);

-- Aggregate counters only - no IP addresses or per-visitor rows are stored.
CREATE TABLE analytics_daily (
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  day         TEXT NOT NULL,          -- YYYY-MM-DD
  path        TEXT NOT NULL,
  views       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (village_id, day, path)
);

CREATE TABLE seo_redirects (
  id          TEXT PRIMARY KEY,
  village_id  TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  from_path   TEXT NOT NULL,
  to_path     TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  UNIQUE (village_id, from_path)
);
