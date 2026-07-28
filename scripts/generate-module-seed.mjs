#!/usr/bin/env node
/**
 * Compiles src/lib/modules/catalog.ts into db/seed/modules.sql.
 *
 * Run after editing the catalogue:  node scripts/generate-module-seed.mjs
 * CI re-runs this and fails if the checked-in SQL is stale, so the database and
 * the type system cannot drift apart.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MODULE_CATALOG } from "../src/lib/modules/catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "db", "seed", "modules.sql");

const EXPECTED_COUNT = 300;

function assertCatalogIsSane(catalog) {
  const problems = [];

  if (catalog.length !== EXPECTED_COUNT) {
    problems.push(`expected ${EXPECTED_COUNT} modules, found ${catalog.length}`);
  }

  const seenIds = new Set();
  const seenCodes = new Set();
  for (const m of catalog) {
    if (seenIds.has(m.id)) problems.push(`duplicate module id: ${m.id}`);
    if (seenCodes.has(m.code)) problems.push(`duplicate module code: ${m.code}`);
    seenIds.add(m.id);
    seenCodes.add(m.code);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) {
      problems.push(`module id is not a kebab-case slug: ${m.id}`);
    }
  }

  for (let code = 1; code <= EXPECTED_COUNT; code += 1) {
    if (!seenCodes.has(code)) problems.push(`missing module code: ${code}`);
  }

  if (problems.length > 0) {
    throw new Error(`Module catalogue is invalid:\n - ${problems.join("\n - ")}`);
  }
}

const sqlString = (value) =>
  value === null || value === undefined
    ? "NULL"
    : `'${String(value).replace(/'/g, "''")}'`;

function render(catalog) {
  const rows = catalog
    .map((m) =>
      "  (" +
      [
        sqlString(m.id),
        m.code,
        sqlString(m.name),
        sqlString(m.category),
        sqlString(m.placement),
        m.defaultEnabled ? 1 : 0,
        m.defaultVisible ? 1 : 0,
        sqlString(m.defaultAccess),
        m.code,
        m.isCore ? 1 : 0,
      ].join(", ") +
      ")",
    )
    .join(",\n");

  return `-- GENERATED FILE - DO NOT EDIT BY HAND.
-- Source: src/lib/modules/catalog.ts
-- Regenerate: node scripts/generate-module-seed.mjs
--
-- Idempotent: re-running refreshes catalogue metadata without touching any
-- per-village override stored in module_settings.

INSERT INTO modules (
  id, code, name, category, placement,
  default_enabled, default_visible, default_access, default_sort, is_core
) VALUES
${rows}
ON CONFLICT (id) DO UPDATE SET
  code = excluded.code,
  name = excluded.name,
  category = excluded.category,
  placement = excluded.placement,
  default_enabled = excluded.default_enabled,
  default_visible = excluded.default_visible,
  default_access = excluded.default_access,
  default_sort = excluded.default_sort,
  is_core = excluded.is_core;
`;
}

assertCatalogIsSane(MODULE_CATALOG);

const sql = render(MODULE_CATALOG);
mkdirSync(dirname(outFile), { recursive: true });

const isCheck = process.argv.includes("--check");
if (isCheck) {
  let current = "";
  try {
    current = readFileSync(outFile, "utf8");
  } catch {
    console.error(`${outFile} is missing. Run: node scripts/generate-module-seed.mjs`);
    process.exit(1);
  }
  if (current !== sql) {
    console.error(
      `${outFile} is out of date. Run: node scripts/generate-module-seed.mjs`,
    );
    process.exit(1);
  }
  console.log(`OK - ${MODULE_CATALOG.length} modules, seed file is up to date.`);
} else {
  writeFileSync(outFile, sql);
  console.log(`Wrote ${outFile} (${MODULE_CATALOG.length} modules).`);
}
