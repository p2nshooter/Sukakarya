-- Credentials for a resident's own account.
--
-- Registration already collected a name, a contact and a photograph of the
-- applicant's KTP, and an officer already approved or rejected it - but nothing
-- came of an approval. The applicant was told "you will be contacted" and had
-- nowhere to go. `resident_registrations.user_id` and `letter_requests.user_id`
-- were both in the schema from the start, and neither was ever written.
--
-- The password is chosen by the applicant on the registration form and held
-- here, hashed, until an officer decides. On approval it becomes a `users` row
-- with the `warga` role; on rejection it is erased along with the KTP photo,
-- because a credential for an account that will never exist is only a liability.
--
-- Held on the registration rather than on `users` because the account does not
-- exist yet: creating a login the moment somebody uploads a photograph would
-- mean anyone could mint an account here, approved or not.

ALTER TABLE resident_registrations ADD COLUMN password_hash TEXT;
ALTER TABLE resident_registrations ADD COLUMN password_salt TEXT;
