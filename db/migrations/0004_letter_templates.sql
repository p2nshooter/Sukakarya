-- Letter body templates.
--
-- A service already knew what to ask the applicant (`form_schema`) and what the
-- applicant answered (`letter_requests.payload`), but nothing held the wording
-- of the letter itself. The operator had to retype the whole surat by hand for
-- every request, copying the village's name, the head of village's name and the
-- date from memory - which is exactly how a letter ends up carrying last year's
-- Kepala Desa.
--
-- The template is plain text with {{placeholders}}. It is deliberately not
-- HTML: an official letter is typographically strict, and giving an operator a
-- rich text editor for it invites a document that prints differently every
-- time.

ALTER TABLE services ADD COLUMN letter_template TEXT;

-- How long the finished letter stays valid. 0 means it does not expire, which
-- is true of most keterangan letters; 14 or 30 is common for domisili and
-- usaha. Stored per service because the answer differs per letter, not per
-- village.
ALTER TABLE services ADD COLUMN valid_days INTEGER NOT NULL DEFAULT 0;
