import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import { canAccess } from "@/lib/access";
import { SESSION_COOKIE, destroySession, getViewer } from "@/lib/auth";
import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Panduan } from "@/components/panduan";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Akun Warga" };

/**
 * The resident's own page.
 *
 * Everything here is scoped to the signed-in user and the resolved village, so
 * one resident can never see another's requests. The letters are found by
 * `user_id`, which is written when a signed-in resident submits the form -
 * requests made before an account existed stay reachable by ticket number
 * through Lacak Surat, which is what the tracking page is for.
 */

interface LetterRow {
  id: string;
  ticket: string;
  status: string;
  note: string | null;
  service_name: string;
  submitted_at: string;
}

const STATUS: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Diajukan",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  processing: {
    label: "Diproses",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  completed: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

async function signOut() {
  "use server";
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  store.delete(SESSION_COOKIE);
  redirect("/");
}

export default async function AkunPage() {
  const viewer = await getViewer();
  // `citizen` is the level the `warga` role grants. Staff satisfy it too, which
  // is harmless: an officer opening this page sees their own requests.
  if (!canAccess(viewer, "citizen")) redirect("/masuk");

  const village = await requireVillage();

  const [me, letters] = await Promise.all([
    getDb()
      .prepare(
        `SELECT full_name, email FROM users WHERE id = ? AND village_id = ?`,
      )
      .bind(viewer.userId, village.id)
      .first<{ full_name: string; email: string | null }>(),
    getDb()
      .prepare(
        `SELECT lr.id, lr.ticket, lr.status, lr.note, lr.submitted_at,
                s.name AS service_name
           FROM letter_requests lr
           JOIN services s ON s.id = lr.service_id
          WHERE lr.user_id = ? AND lr.village_id = ?
          ORDER BY lr.submitted_at DESC
          LIMIT 50`,
      )
      .bind(viewer.userId, village.id)
      .all<LetterRow>(),
  ]);

  const rows = letters.results ?? [];

  return (
    <SiteShell>
      <PageHeader
        title={me?.full_name ? `Halo, ${me.full_name}` : "Akun Warga"}
        description={`Akun warga ${village.entityLabel} ${village.name}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Akun", href: "/akun" },
        ]}
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Pengajuan Surat Anda</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {rows.length > 0
                ? `${rows.length} pengajuan tercatat atas akun ini.`
                : "Belum ada pengajuan atas akun ini."}
            </p>
          </div>
          <Link
            href="/layanan"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--text-on-brand)] hover:bg-brand-dark"
          >
            Ajukan Surat Baru
          </Link>
        </div>

        <div className="mt-6">
          {rows.length === 0 ? (
            <EmptyState
              title="Belum ada pengajuan."
              hint="Pengajuan yang Anda kirim sebelum punya akun tetap dapat dipantau lewat Lacak Surat dengan nomor tiketnya."
            />
          ) : (
            <div className="grid gap-3">
              {rows.map((row) => {
                const badge = STATUS[row.status] ?? {
                  label: row.status,
                  className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
                };
                return (
                  <Card key={row.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-bold leading-tight">
                          {row.service_name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                          {row.ticket}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      Diajukan {formatDateTime(row.submitted_at, village.locale, village.timezone)}
                    </p>
                    {row.note ? (
                      <p className="mt-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                        {row.note}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* The guide lives here as well as on the public catalogue. Someone who
            has just signed in is at the point of doing this, not deciding
            whether to - so it is placed below their requests rather than above
            them, where it informs without getting in the way. */}
        <div className="mt-12 border-t border-[var(--border)] pt-10">
          <h2 className="font-display text-xl font-bold">Cara Mengajukan Surat</h2>
          <p className="mt-1.5 text-[0.9375rem] text-[var(--text-muted)]">
            Empat langkah. Pengajuan lewat akun langsung tercatat di halaman ini.
          </p>
          <Panduan
            className="mt-6 max-w-2xl"
            steps={[
              {
                title: "Buka daftar layanan",
                body: "Tekan Ajukan Surat Baru di atas. Setiap layanan mencantumkan persyaratan, perkiraan waktu selesai dan biayanya.",
              },
              {
                title: "Siapkan berkas yang diminta",
                body: "Biasanya fotokopi KTP dan Kartu Keluarga. Berkas fisik tetap dibawa saat mengambil surat di kantor desa.",
              },
              {
                title: "Isi formulirnya",
                body: "Karena Anda sudah masuk, pengajuan otomatis tercatat atas akun ini dan muncul di daftar di atas — nomor tiket tetap diberikan sebagai cadangan.",
              },
              {
                title: "Pantau di halaman ini",
                body: "Status berubah dari Diajukan menjadi Diproses lalu Selesai. Petugas menghubungi Anda melalui kontak yang terdaftar bila ada berkas yang kurang.",
              },
            ]}
          />
        </div>

        <form action={signOut} className="mt-12">
          <button
            type="submit"
            className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-red-600 hover:bg-[var(--surface-2)] dark:text-red-400"
          >
            Keluar
          </button>
        </form>
      </div>
    </SiteShell>
  );
}
