import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";

import { canAccess } from "@/lib/access";
import {
  createSession,
  getViewer,
  hashIp,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk Panel Admin",
  robots: { index: false, follow: false },
};

interface UserRow {
  id: string;
  password_hash: string;
  password_salt: string;
  status: string;
  full_name: string;
  deleted_at: string | null;
}

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=kosong");
  }

  const village = await requireVillage();
  const headerList = await headers();

  const user = await getDb()
    .prepare(
      `SELECT id, password_hash, password_salt, status, full_name, deleted_at
       FROM users WHERE village_id = ? AND email = ? LIMIT 1`,
    )
    .bind(village.id, email)
    .first<UserRow>();

  // Same failure path whether the account is missing, deleted, suspended or the
  // password is wrong, so the form cannot be used to enumerate accounts.
  const ok =
    user !== null &&
    !user.deleted_at &&
    user.status === "active" &&
    (await verifyPassword(password, user.password_hash, user.password_salt));

  if (!ok || !user) {
    await logAudit({
      villageId: village.id,
      actorId: null,
      actorLabel: email,
      action: "login_failed",
      resource: "session",
      ipHash: await hashIp(headerList.get("cf-connecting-ip")),
    });
    redirect("/admin/login?error=invalid");
  }

  const { token, expiresAt } = await createSession({
    userId: user.id,
    villageId: village.id,
    userAgent: headerList.get("user-agent"),
    ipHash: await hashIp(headerList.get("cf-connecting-ip")),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  await getDb()
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), user.id)
    .run();

  await logAudit({
    villageId: village.id,
    actorId: user.id,
    actorLabel: user.full_name,
    action: "login",
    resource: "session",
  });

  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  if (canAccess(viewer, "staff")) redirect("/admin");

  const village = await requireVillage();

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--surface-1)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h1 className="text-xl font-bold">Panel Admin</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {village.entityLabel} {village.name}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {error === "kosong"
              ? "Email dan kata sandi wajib diisi."
              : "Email atau kata sandi salah."}
          </p>
        ) : null}

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
