-- Payment for a letter request.
--
-- `services.fee` already existed and was already editable in the panel, but
-- nothing read it: every request was implicitly free, and a village that
-- charged for a surat had no way to say so, collect it, or record that it had
-- been collected.
--
-- The amount is copied onto the request rather than read from the service at
-- display time. A village that raises its fee next month must not retroactively
-- change what somebody who applied last month owes, and a receipt that quotes a
-- different figure from the one the resident paid is worse than no receipt.

ALTER TABLE letter_requests ADD COLUMN fee_amount INTEGER NOT NULL DEFAULT 0;

-- A short code the resident quotes and the officer reconciles against the
-- village's e-wallet statement. QRIS carries no free-text reference that
-- survives to the merchant's report, so the human-readable code is what ties a
-- transfer to a request.
ALTER TABLE letter_requests ADD COLUMN payment_code TEXT;

-- 'unpaid' | 'paid' | 'waived'. Not a CHECK constraint: SQLite cannot add one
-- with ALTER TABLE, and the column is only ever written by code in this
-- repository.
--
-- A free service is 'waived' from the start, so "does this need paying?" is one
-- column rather than a fee comparison repeated at every call site.
ALTER TABLE letter_requests ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'waived';

ALTER TABLE letter_requests ADD COLUMN paid_at TEXT;
ALTER TABLE letter_requests ADD COLUMN paid_confirmed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_letter_payment
  ON letter_requests (village_id, payment_status);
