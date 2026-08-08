# Sukakarya

Next.js app wired up for Supabase, deployed on Vercel from this GitHub repo.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the homepage shows whether
the Supabase env vars are configured.

## Connecting GitHub, Supabase, and Vercel

**1. Supabase — get your credentials**

Create a project at [supabase.com](https://supabase.com), then open
**Project Settings → API** and copy:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)

**2. Local env**

Copy `.env.example` to `.env.local` and paste the values in. `.env.local` is
git-ignored — never commit it.

**3. Vercel — connect this GitHub repo**

- [vercel.com/new](https://vercel.com/new) → Import Git Repository → select
  this repo.
- In **Project Settings → Environment Variables**, add the same three keys
  from step 1 (Production, Preview, and Development scopes as needed).
- Every push to GitHub now triggers a Vercel deployment using those env vars.

**4. GitHub Actions (optional)**

Only needed if a CI workflow talks to Supabase directly (e.g. running
migrations). Add the keys under repo **Settings → Secrets and variables →
Actions**. Not required for the Vercel deploy flow above.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase + Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Vercel deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
