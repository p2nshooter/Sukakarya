# app-desa

Enterprise dynamic CMS for Indonesian village (*desa*) official websites.

Multi-tenant by design: one deployment serves any number of villages, and
**no village name, colour, menu or page layout is compiled into the code**. A
village is a row in the database; everything it shows is data.

- **Framework** — Next.js 15 (App Router) + React 19 + Tailwind CSS 4
- **Runtime** — Cloudflare Workers via `@opennextjs/cloudflare`
- **Database** — Cloudflare D1 (SQLite)
- **Object storage** — Cloudflare R2 (media uploads)
- **Cache / rate limiting** — Cloudflare KV
- **Auth** — first-party sessions, PBKDF2-SHA256 (210k iterations), WebCrypto

---

## How "dynamic" actually works

Four layers, all database-driven:

| Layer | Table | What an operator controls |
|---|---|---|
| Tenant | `villages` | Name, region, branding colours, logo, locale, contact, status |
| Features | `modules` + `module_settings` | 300 modules: on/off, visible/hidden, access level, device, schedule, ordering |
| Navigation | `menus` + `menu_items` | Every menu, nested, per-item access level and module binding |
| Layout | `pages` + `page_sections` | Which sections appear on which page, in what order, with what titles |

The homepage is **not** a fixed component tree. `src/app/page.tsx` reads
`page_sections`, resolves each row to a renderer, and applies the same gate
every other surface uses:

```
enabled AND visible AND within schedule AND device matches AND viewer has access
```

Change a row → the site changes. No rebuild, no redeploy.

### Serving a different village

1. Insert a `villages` row (plus its menus and sections).
2. Either point a hostname at the Worker and set `villages.domain` to it, or
   change the `DEFAULT_VILLAGE_SLUG` variable in `wrangler.jsonc`.

Hostname wins; `DEFAULT_VILLAGE_SLUG` is the fallback. Resolution lives in
`src/lib/village.ts` and is the only place tenancy is decided.

---

## The 300-module catalogue

`src/lib/modules/catalog.ts` is the single source of truth. It compiles to
`db/seed/modules.sql`:

```bash
node scripts/generate-module-seed.mjs          # regenerate
node scripts/generate-module-seed.mjs --check  # CI: fail if stale
```

The generator refuses to emit unless there are exactly 300 modules with
contiguous codes 1–300 and unique kebab-case ids. CI runs `--check`, so the
catalogue and the database cannot drift.

Defaults follow the platform specification: the "DEFAULT SHOW" set is visible on
first install, the "DISABLE" set ships switched off, and everything else is
installed but hidden until an operator enables it in **Panel Admin › Modul**.

A module without a section renderer is still a real, toggleable module — it
simply has no visual block (admin tools, SEO switches, integrations).
`SECTION_RENDERERS` in `src/components/sections/registry.ts` maps the ones that
do.

---

## Getting started

```bash
npm install

# local database + storage (miniflare, no Cloudflare credentials needed)
npm run db:migrate:local
npx wrangler d1 execute app-desa-db --local --file=./db/seed/modules.sql
npm run db:seed:local

# create an administrator (password is hashed locally, never written in plain)
ADMIN_PASSWORD='ganti-dengan-sandi-kuat' node scripts/create-admin.mjs \
  --email admin@desa.example --name "Administrator" --village vil_demo \
  > /tmp/admin.sql
npx wrangler d1 execute app-desa-db --local --file=/tmp/admin.sql
rm /tmp/admin.sql

npm run dev                 # Next dev server
# or, to run the real Worker bundle with real bindings:
npm run cf:build && npx wrangler dev
```

Sign in at `/admin/login`.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production Next build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite |
| `npm run cf:build` | Build the Cloudflare Worker bundle |
| `npm run cf:deploy` | Build and deploy the Worker |
| `npm run db:migrate:local` / `:remote` | Apply D1 migrations |
| `npm run db:seed:local` / `:remote` | Apply baseline seed |

---

## Deployment

Live at **https://app-desa.app-desa.workers.dev**.

Four workflows, each doing one job:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push, PR | Audit, catalogue check, typecheck, tests, build, migrations on a throwaway database. No credentials. |
| `deploy.yml` | push to `main`, manual | Migrations, module catalogue sync, build, deploy. |
| `smoke.yml` | after a successful deploy, manual | Probes the live URL over HTTP and asserts on what comes back. |
| `bootstrap.yml` | manual | One-off: create D1/KV/R2, and optionally apply the baseline seed. |
| `workers-subdomain.yml` | manual | One-off: claim the account's `*.workers.dev` subdomain. |
| `create-admin.yml` | manual | Creates the first administrator on the remote database. |

### Order for a fresh account

1. `bootstrap.yml` — creates D1, KV and R2; copy the printed ids into
   `wrangler.jsonc`.
2. `workers-subdomain.yml` — claims a `*.workers.dev` name. Nothing can be
   published until an account has one, and wrangler only offers to claim it
   interactively, so it can never happen inside a deploy.
3. `bootstrap.yml` again with `seed_baseline` — applies roles, permissions and
   the demo tenant. **Without a `villages` row every page returns 5xx**, since
   `requireVillage()` throws on an unresolved tenant.
4. `deploy.yml`.
5. `create-admin.yml` — needs an `ADMIN_PASSWORD` repository secret (12+
   characters). The password is hashed on the runner and only the hash reaches
   the database; it is never a workflow input, because dispatch inputs are
   recorded unmasked in the run.

The baseline seed is deliberately **not** part of the deploy: its upserts would
reset the tenant's name, colours, menus and sections on every push, silently
undoing an operator's configuration.

---

## Cloudflare resources

Declared in `wrangler.jsonc`; all four already exist in the account:

| Binding | Resource | Name |
|---|---|---|
| `DB` | D1 | `app-desa-db` |
| `KV` | KV | `app-desa-kv` |
| `MEDIA` | R2 | `app-desa-media` |
| `ASSETS` | Static assets | (built) |

Worker name: **`app-desa`** — deliberately generic, not village-specific.

### Required GitHub secrets

Deployment uses exactly two:

| Secret | Used for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | `wrangler deploy` and `d1 migrations apply` |
| `CLOUDFLARE_ACCOUNT_ID` | Target account |

No secret is needed for CI (typecheck, tests, build, migrations) — that job runs
entirely against a local database. The deploy workflow checks both secrets are
present up front and fails with a named error if either is missing.

#### API token permissions

Being *present* is not enough — the token must be scoped for every binding the
deploy touches. Create it from **My Profile › API Tokens › Create Custom Token**
with these permissions, all on the account that owns the resources above:

| Permission | Level | Needed for |
|---|---|---|
| Account · Workers Scripts | Edit | `wrangler deploy` |
| Account · D1 | Edit | `d1 migrations apply`, module catalogue sync |
| Account · Workers R2 Storage | Edit | media bucket binding |
| Account · Workers KV Storage | Edit | rate-limit namespace binding |

A token missing any of these fails with:

```
A request to the Cloudflare API (/accounts/<id>/d1/...) failed.
The given account is not valid or is not authorized to access this
service [code: 7403]
```

`7403` means one of two things, and both are worth checking:

1. the token lacks the permission for that service, or
2. `CLOUDFLARE_ACCOUNT_ID` points at a **different account** than the one where
   `app-desa-db`, `app-desa-kv` and `app-desa-media` actually live.

For (2), confirm the account with `npx wrangler d1 list` using the same token —
if `app-desa-db` is not in the output, the account is wrong. Either repoint the
secret, or recreate the three resources in the target account and update their
ids in `wrangler.jsonc`.

Application secrets (`SESSION_SECRET`, `TURNSTILE_SECRET_KEY`) are optional and
set with `wrangler secret put`, never committed.

---

## Media pipeline

Uploads go to R2 and are recorded in D1. Verified end-to-end against real
bindings, not mocked:

- `POST /api/admin/media` — staff only; writes to R2, then inserts the row. If
  the insert fails the object is deleted again, so the bucket and the table
  cannot disagree.
- `GET /media/[id]` — the only read path. The bucket is never public. Every
  request is scoped to the current tenant, honours `visibility`, serves the
  recorded content-type with `nosniff`, and supports conditional and range
  requests.

Uploads are validated against an **allowlist** (`ALLOWED_MIME_TYPES`), 64 MB
max. HTML and SVG are deliberately excluded — both can carry script, and we
serve media from our own origin. Object keys are namespaced
`<village>/<year>/<month>/<slug>-<random>.<ext>`, so a filename cannot escape
its tenant or collide with another upload.

---

## Security posture

- **Personal data is out of scope by design.** There is no NIK, no KK number, no
  citizen register. Statistics are aggregate rows only. Contact details on
  complaints and letter requests are staff-visible and never rendered publicly;
  public tracking pages expose *status only*, by ticket.
- **CMS HTML is untrusted.** Everything authored in the admin panel passes
  through the allowlist sanitiser in `src/lib/sanitize.ts` before render —
  `<script>`, `<style>`, `<iframe>`, `<svg>`, every `on*` handler, and any URL
  scheme outside http/https/mailto/tel is dropped.
- **Passwords** are PBKDF2-SHA256, 210k iterations, per-user salt; comparison is
  constant-time. Sessions are stored as a SHA-256 digest, so a database leak
  cannot be replayed as a login.
- **Every content query is village-scoped** and applies the publication window,
  so a draft or a scheduled item cannot leak through a forgotten filter.
- **Audit trail** (`audit_logs`) is append-only and has no public route.
- **Rate limiting** on public forms via KV, failing open so the limiter cannot
  take the forms down with it.
- `robots.txt` disallows `/admin`, `/api/`, `/media/`, and disallows everything
  when the village is not `active`.

---

## Layout

```
db/migrations/        D1 schema (0001 core, 0002 content, 0003 services+system)
db/seed/              modules.sql (generated) + seed.sql (roles, demo tenant)
scripts/              module seed generator, admin account generator
src/lib/              tenancy, auth, access, modules, media, content, sanitiser
src/components/       shell, UI primitives, section renderers
src/app/              public routes, admin panel (route group), API, SEO routes
tests/                vitest unit suite
```

---

## Verified

Against the deployed Worker at `app-desa.app-desa.workers.dev`, by `smoke.yml`:

```
✅ Homepage /                    want 200, got 200
✅ Admin login /admin/login      want 200, got 200
✅ Sitemap /sitemap.xml          want 200, got 200
✅ Robots /robots.txt            want 200, got 200
✅ Unknown page /tidak-ada-nya   want 404, got 404
✅ Admin panel is gated /admin   want 30x, got 307
✅ robots.txt disallows /admin   'Disallow: /admin' found
```

Against real bindings on the Worker runtime:

- 47 unit tests pass (catalogue integrity, access gate, sanitiser, media rules)
- 300 modules seeded and counted in D1
- Public routes render; `/admin/login` renders; `sitemap.xml` and `robots.txt` serve
- PNG upload → R2 → read back **byte-for-byte identical** (SHA-256 match)
- Plain `GET` returns 200; `Range` request returns 206 with `Content-Range`
- Upload without a session → 403; disallowed MIME type → 422
- Another tenant's media id → 404; own tenant's → 200
- Toggling a module row flips a route between 404 and 200 with no redeploy
- Raising a module's access level to `staff` hides it from anonymous visitors
  while staff still see it
