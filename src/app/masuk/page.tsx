import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Masuk Akun Warga" };

/**
 * Resident sign-in.
 *
 * Separate from `/admin/login`, and deliberately not behind the knock code. The
 * knock exists to hide the staff panel from scanners; residents are meant to
 * find this page, and it is linked from the header.
 *
 * The account is created when an officer approves the registration, so a person
 * whose application is still queued cannot sign in yet - and is told that
 * rather than being told their password is wrong.
 */

interface UserRow {
  id: string;
  password_hash: string;
  password_salt: string;
  status: string;
}

async function signIn(formData: FormData) {
  "use server";

  const village = await requireVillage();
  const contact = String(formData.get("contact") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!contact || !password) redirect("/masuk?error=lengkap");

  // Guessing is the attack this page has. Limited per village before the hash
  // is computed, because the hash is the expensive part.
  const allowed = await checkRateLimit({
    key: `masuk:${village.id}`,
    limit: 20,
    windowSeconds: 600,
  });
  if (!allowed) redirect("/masuk?error=sibuk");

  const user = await getDb()
    .prepare(
      `SELECT id, password_hash, password_salt, status
         FROM users
        WHERE village_id = ? AND email = ? AND deleted_at IS NULL
        LIMIT 1`,
    )
    .bind(village.id, contact)
    .first<UserRow>();

  // One message for "no such account" and "wrong password" alike: telling an
  // anonymous visitor which of the two it was confirms whether a given phone
  // number is registered in this village.
  if (!user) redirect("/masuk?error=salah");

  const ok = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!ok) redirect("/masuk?error=salah");
  if (user.status !== "active") redirect("/masuk?error=nonaktif");

  const session = await createSession({
    userId: user.id,
    villageId: village.id,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));

  redirect("/akun");
}

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const village = await requireVillage();

  const errors: Record<string, string> = {
    lengkap: "Kontak dan kata sandi wajib diisi.",
    salah:
      "Kontak atau kata sandi tidak cocok. Akun baru dapat dipakai setelah " +
      "pendaftaran Anda disetujui petugas desa.",
    sibuk: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
    nonaktif: "Akun Anda sedang tidak aktif. Hubungi kantor desa.",
  };

  return (
    <SiteShell>
      <PageHeader
        title="Masuk Akun Warga"
        description={`Untuk warga ${village.entityLabel} ${village.name} yang pendaftarannya sudah disetujui.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Masuk", href: "/masuk" },
        ]}
      />

      <div className="mx-auto max-w-md px-4 py-12">
        {params.error && errors[params.error] ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {errors[params.error]}
          </div>
        ) : null}

        <form action={signIn} className="grid gap-5">
          <div>
            <label htmlFor="contact" className="block text-sm font-medium">
              Nomor WhatsApp atau Email
            </label>
            <input
              id="contact"
              name="contact"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Sama seperti yang Anda isi saat mendaftar.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-[var(--text-on-brand)] hover:bg-brand-dark"
          >
            Masuk
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-brand hover:underline">
            Daftar sebagai warga
          </Link>
        </p>

        {/* Said here rather than only in the error, because somebody who has
            just registered will try this page first and should not have to fail
            a login to learn why it did not work. */}
        <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
          Akun baru dapat dipakai setelah pendaftaran disetujui petugas desa.
        </p>
      </div>
    </SiteShell>
  );
}
