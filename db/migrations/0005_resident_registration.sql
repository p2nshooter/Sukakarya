-- Resident registration, verified against a photographed KTP.
--
-- The rule this table exists to enforce: an account may only be created by
-- someone who actually lives in this village. The card is read, the regency and
-- village printed on it are compared with the tenant's own, and a mismatch is
-- refused.
--
-- What is deliberately NOT stored:
--
--   * the NIK itself. Only a salted hash, for detecting a second attempt with
--     the same card, and the last four digits, so an operator reviewing the
--     queue can tell two applicants apart. A leaked copy of this table must not
--     hand anyone a list of national identity numbers.
--   * anything from the card beyond the fields needed to decide the question.
--     Blood type, marital status and religion are printed on a KTP; none of
--     them bear on whether this person lives here, so none are read.
--
-- The photograph itself lives in R2 with `visibility = 'private'`, so the
-- public media route refuses it even to someone holding the id.

CREATE TABLE resident_registrations (
  id             TEXT PRIMARY KEY,
  village_id     TEXT NOT NULL REFERENCES villages (id) ON DELETE CASCADE,
  user_id        TEXT REFERENCES users (id) ON DELETE SET NULL,

  full_name      TEXT NOT NULL,
  nik_hash       TEXT NOT NULL,      -- salted SHA-256; never the number itself
  nik_last4      TEXT,               -- so the queue can distinguish applicants
  contact        TEXT,               -- phone or email the applicant gave

  -- What the reader saw on the card. Kept so a rejection can be explained and
  -- so a human can overrule a bad read.
  read_name      TEXT,
  read_village   TEXT,
  read_district  TEXT,
  read_regency   TEXT,
  read_province  TEXT,

  ktp_media_id   TEXT REFERENCES media (id) ON DELETE SET NULL,

  match_result   TEXT NOT NULL DEFAULT 'unknown'
                 CHECK (match_result IN ('match', 'mismatch', 'unreadable',
                                         'unknown')),
  match_note     TEXT,

  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason  TEXT,
  reviewed_by    TEXT REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at    TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One pending application per card per village. A second attempt with the same
-- KTP updates the first rather than queueing twice.
CREATE UNIQUE INDEX idx_resident_reg_nik
  ON resident_registrations (village_id, nik_hash);

CREATE INDEX idx_resident_reg_queue
  ON resident_registrations (village_id, status, created_at DESC);
