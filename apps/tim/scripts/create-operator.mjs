#!/usr/bin/env node
/**
 * Generates the SQL that creates an organisation and its first operator.
 *
 * The password is hashed here and only the hash is printed, so no plaintext
 * credential is written to a file in the repository or sent through the D1 HTTP
 * API in the clear. Same construction as the Worker: PBKDF2-SHA256, 210k
 * iterations, per-user salt.
 *
 * Usage:
 *   OPERATOR_PASSWORD='...' node apps/tim/scripts/create-operator.mjs \
 *     --org "Tim Contoh" --slug contoh --email admin@contoh.test \
 *     --name "Administrator" > /tmp/op.sql
 *   npx wrangler d1 execute app-tim-db --remote --file=/tmp/op.sql \
 *     --config apps/tim/wrangler.jsonc
 *   rm /tmp/op.sql
 */
import { webcrypto as crypto } from "node:crypto";

const PBKDF2_ITERATIONS = 210_000;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const orgName = String(arg("org", "")).trim();
const slug = String(arg("slug", "")).trim().toLowerCase();
const email = String(arg("email", "")).trim().toLowerCase();
const fullName = String(arg("name", "Administrator")).trim();
const region = String(arg("region", "")).trim();
const password = process.env.OPERATOR_PASSWORD ?? "";

const problems = [];
if (!orgName) problems.push("--org is required");
if (!/^[a-z0-9-]{2,40}$/.test(slug)) problems.push("--slug must be a-z0-9- (2-40)");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push("--email must be valid");
if (password.length < 12) problems.push("OPERATOR_PASSWORD must be 12+ characters");

if (problems.length > 0) {
  console.error(`Cannot generate SQL:\n - ${problems.join("\n - ")}`);
  process.exit(1);
}

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const rand = (n) => toHex(crypto.getRandomValues(new Uint8Array(n)));
const salt = rand(16);

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"],
);

const bits = await crypto.subtle.deriveBits(
  {
    name: "PBKDF2",
    salt: new TextEncoder().encode(salt),
    iterations: PBKDF2_ITERATIONS,
    hash: "SHA-256",
  },
  key,
  256,
);

const hash = toHex(bits);
const orgId = `org_${rand(9)}`;
const userId = `usr_${rand(9)}`;
const q = (value) => (value ? `'${value.replace(/'/g, "''")}'` : "NULL");

process.stdout.write(`-- Generated ${new Date().toISOString()}. Delete after applying.
INSERT INTO orgs (id, slug, name, region)
VALUES ('${orgId}', '${slug}', ${q(orgName)}, ${q(region)})
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (id, org_id, email, full_name, password_hash, password_salt, role)
VALUES (
  '${userId}',
  (SELECT id FROM orgs WHERE slug = '${slug}'),
  '${email}',
  ${q(fullName)},
  '${hash}',
  '${salt}',
  'admin'
)
ON CONFLICT (org_id, email) DO NOTHING;
`);
