#!/usr/bin/env node
/**
 * Checks every qualified column reference in the app's SQL against the schema
 * the migrations actually build.
 *
 * TypeScript cannot see inside a query string. `SELECT lr.created_at` typechecks
 * perfectly against a `LetterRow` interface that declares `created_at: string`,
 * and the mismatch only surfaces at runtime, as a 500, on whichever screen runs
 * that query. That is how the letter print page shipped broken: printing needs a
 * submitted letter to exist first, so no smoke test ever opened it.
 *
 * The check is deliberately narrow. It only looks at references of the form
 * `alias.column` where the alias resolves to a real table in the same query, so
 * it cannot guess wrong about a bare column name or an expression. It finds the
 * mistake that actually happened - a column renamed or misremembered - and stays
 * quiet about everything else.
 *
 * Usage:
 *   node scripts/check-sql-columns.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MIGRATIONS = "db/migrations";
const ROOT = "src";

/* ---------------------------------------------------------------- schema -- */

// Lines inside CREATE TABLE that declare a constraint rather than a column.
const CONSTRAINT =
  /^(primary|foreign|unique|check|constraint|key)\b/i;

/**
 * The schema is read from the migration files, not from a live database.
 *
 * The migrations are the definition of the schema, so checking against them
 * needs no wrangler, no miniflare and no applied database - which also means
 * this runs in a second and cannot be defeated by a stale local .wrangler
 * directory. `ALTER TABLE ... ADD COLUMN` is replayed on top of the CREATE, so
 * a column added by a later migration counts as present.
 */
function loadSchema() {
  const tables = new Map();
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    // Comments first: a commented-out CREATE TABLE is not a table, and the
    // migrations are heavily commented.
    const sql = readFileSync(join(MIGRATIONS, file), "utf8")
      .replace(/--[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    for (const m of sql.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([a-z_][a-z0-9_]*)["`]?\s*\(/gi,
    )) {
      const name = m[1].toLowerCase();
      // Walk to the matching close paren so nested parens - CHECK (...),
      // REFERENCES ... (...) - do not end the body early.
      let depth = 0;
      let i = m.index + m[0].length - 1;
      let end = i;
      for (; i < sql.length; i++) {
        if (sql[i] === "(") depth++;
        else if (sql[i] === ")") {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      const body = sql.slice(m.index + m[0].length, end);

      // Split on top-level commas only.
      const parts = [];
      let buf = "";
      depth = 0;
      for (const ch of body) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (ch === "," && depth === 0) { parts.push(buf); buf = ""; }
        else buf += ch;
      }
      parts.push(buf);

      const columns = new Set();
      for (const part of parts) {
        const decl = part.trim();
        if (!decl || CONSTRAINT.test(decl)) continue;
        const col = decl.match(/^["`]?([a-z_][a-z0-9_]*)["`]?/i);
        if (col) columns.add(col[1].toLowerCase());
      }
      tables.set(name, columns);
    }

    for (const m of sql.matchAll(
      /ALTER\s+TABLE\s+["`]?([a-z_][a-z0-9_]*)["`]?\s+ADD\s+(?:COLUMN\s+)?["`]?([a-z_][a-z0-9_]*)["`]?/gi,
    )) {
      const table = m[1].toLowerCase();
      if (tables.has(table)) tables.get(table).add(m[2].toLowerCase());
    }
  }

  return tables;
}

/* ------------------------------------------------------------- the files -- */

function sources(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

/* ---------------------------------------------------------------- checks -- */

// Words that follow a table name in `FROM x ...` without being an alias.
const NOT_AN_ALIAS =
  /^(on|set|where|values|using|as|left|right|inner|outer|cross|join|group|order|limit|having|union|returning)$/i;

function aliasMap(sql, tables) {
  const map = new Map();

  // `FROM letter_requests lr` / `JOIN services s`
  for (const m of sql.matchAll(
    /(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)\s+([a-z_][a-z0-9_]*)/gi,
  )) {
    const [, table, alias] = m;
    if (NOT_AN_ALIAS.test(alias)) continue;
    if (tables.has(table.toLowerCase())) map.set(alias.toLowerCase(), table.toLowerCase());
  }

  // A table used under its own name is its own alias.
  for (const m of sql.matchAll(
    /(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi,
  )) {
    const table = m[1].toLowerCase();
    if (tables.has(table) && !map.has(table)) map.set(table, table);
  }

  return map;
}

function checkFile(path, tables) {
  const text = readFileSync(path, "utf8");
  const found = [];

  const statements = text.matchAll(
    /`([^`]*?(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)[^`]*?)`/gis,
  );

  for (const statement of statements) {
    const sql = statement[1];
    const line = text.slice(0, statement.index).split("\n").length;
    const aliases = aliasMap(sql, tables);
    if (aliases.size === 0) continue;

    for (const ref of sql.matchAll(/\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/g)) {
      const [, alias, column] = ref;
      const table = aliases.get(alias.toLowerCase());
      if (!table) continue;
      if (tables.get(table).has(column.toLowerCase())) continue;
      found.push({ line, alias, column, table });
    }
  }
  return found;
}

/* ------------------------------------------------------------------ main -- */

const tables = loadSchema();
if (tables.size === 0) {
  console.error(`No CREATE TABLE statements found in ${MIGRATIONS}.`);
  process.exit(2);
}

const problems = [];
for (const path of sources(ROOT)) {
  for (const p of checkFile(path, tables)) {
    const key = `${path}:${p.line}:${p.alias}.${p.column}`;
    if (problems.some((x) => x.key === key)) continue;
    problems.push({ key, path, ...p });
  }
}

console.log(`Checked ${sources(ROOT).length} files against ${tables.size} tables.`);

if (problems.length === 0) {
  console.log("Every qualified column reference exists in the schema.");
  process.exit(0);
}

for (const p of problems) {
  const near = [...tables.get(p.table)]
    .filter((c) => c.includes(p.column.split("_")[0]) || p.column.includes(c.split("_")[0]))
    .slice(0, 3);
  console.error(
    `${relative(process.cwd(), p.path)}:${p.line}  ${p.alias}.${p.column}` +
      `  ->  table \`${p.table}\` has no column \`${p.column}\`` +
      (near.length ? `  (did you mean: ${near.join(", ")}?)` : ""),
  );
}
console.error(`\n${problems.length} bad column reference(s).`);
process.exit(1);
