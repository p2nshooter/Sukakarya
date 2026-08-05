-- Team roster database.
--
-- Deliberately a separate D1 database on a separate Worker from the village
-- CMS. The two share no binding, no session cookie and no route: a reader of
-- the public village site has no path to this data, and this app has no way to
-- write village content.
--
-- The roster holds identifying data about people who joined a team - name,
-- national ID number, phone, address. That is lawful to keep with consent, and
-- it is why every table below carries an owner, every read of an ID number is
-- logged, and there is no public route anywhere in the application.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Tenancy
--
-- One deployment can serve several teams. Every row is scoped to an org, and
-- every query carries that scope, so two teams sharing an instance cannot see
-- each other's members.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orgs (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  region      TEXT,
  -- Free-text label shown on printed lists, e.g. "Tim Pemenangan Desa X".
  motto       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Operators
--
-- Passwords are PBKDF2-SHA256 with a per-user salt, the same construction the
-- village CMS uses. Sessions are stored as a SHA-256 digest of the cookie
-- token, so a dump of this table cannot be replayed as a login.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  -- admin  : full access, may reveal ID numbers and export
  -- petugas: may add and edit members, ID numbers stay masked
  -- baca   : read-only, ID numbers stay masked
  role          TEXT NOT NULL DEFAULT 'petugas'
                CHECK (role IN ('admin', 'petugas', 'baca')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended')),
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  ip_hash     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Members
--
-- Mirrors the fields the original single-file application collected, so an
-- existing roster imports without loss.
--
-- `nik_last4` exists so the list view can show a recognisable tail without
-- reading the full number: the masked list never selects `nik` at all, which
-- means a screenshot of a listing cannot leak one.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS members (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,

  nama         TEXT NOT NULL,
  nik          TEXT,
  nik_last4    TEXT,
  jk           TEXT CHECK (jk IN ('L', 'P', '')),
  tgl_lahir    TEXT,

  kadus        TEXT,
  rt           TEXT,
  tps          TEXT,
  alamat       TEXT,

  jabatan      TEXT,
  hp           TEXT,

  status       TEXT NOT NULL DEFAULT 'aktif'
               CHECK (status IN ('aktif', 'nonaktif', 'calon')),
  tgl_gabung   TEXT,
  perekrut     TEXT,
  catatan      TEXT,

  created_by   TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT
);

-- A national ID number identifies exactly one person, so a duplicate is a data
-- entry error rather than a second member. Enforced per org, and only over
-- rows that actually carry one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_nik
  ON members (org_id, nik) WHERE nik IS NOT NULL AND nik <> '';

CREATE INDEX IF NOT EXISTS idx_members_org ON members (org_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_members_area ON members (org_id, kadus, rt);
CREATE INDEX IF NOT EXISTS idx_members_tps ON members (org_id, tps);
CREATE INDEX IF NOT EXISTS idx_members_nama ON members (org_id, nama);

-- ---------------------------------------------------------------------------
-- Audit
--
-- Append-only. Records every write, every login, and - the reason this table
-- exists at all - every time an operator reveals a full ID number.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs (id) ON DELETE CASCADE,
  actor_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_id   TEXT,
  summary     TEXT,
  ip_hash     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log (org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Login throttling
--
-- Kept in the database rather than KV so a brute force attempt is visible to
-- the same audit review as everything else.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash     TEXT NOT NULL,
  email       TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ip_hash, email)
);
