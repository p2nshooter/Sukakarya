import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { deleteMedia } from "@/lib/media";
import { requireVillage } from "@/lib/village";

import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The queue of residents waiting to be let in.
 *
 * Approving or rejecting both destroy the photographed KTP. The card was
 * collected to answer one question - does this person live here - and once an
 * officer has answered it the image has no further use. Keeping it would build
 * exactly the pile of identity documents this system is supposed to avoid, and
 * a pile that exists is a pile that can leak.
 */

interface Row {
  id: string;
  full_name: string;
  nik_last4: string | null;
  contact: string | null;
  read_name: string | null;
  read_village: string | null;
  read_regency: string | null;
  ktp_media_id: string | null;
  match_result: string;
  match_note: string | null;
  status: string;
  created_at: string;
}

async function decide(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!id || !["approved", "rejected"].includes(next)) return;

  const row = await getDb()
    .prepare(
      `SELECT ktp_media_id FROM resident_registrations
        WHERE id = ? AND village_id = ?`,
    )
    .bind(id, village.id)
    .first<{ ktp_media_id: string | null }>();
  if (!row) return;

  await getDb()
    .prepare(
      `UPDATE resident_registrations
          SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'),
              ktp_media_id = NULL, updated_at = datetime('now')
        WHERE id = ? AND village_id = ?`,
    )
    .bind(next, viewer.userId, id, village.id)
    .run();

  // Detached from the row first, then removed from R2 and the media table, so
  // a failure here can never leave a row pointing at an object that is gone.
  if (row.ktp_media_id) await deleteMedia(row.ktp_media_id, village.id);

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "resident_registrations",
    resourceId: id,
    summary: `Pendaftaran ${next === "approved" ? "disetujui" : "ditolak"}, foto KTP dihapus`,
  });

  revalidatePath("/admin/registrasi");
}

const BADGE: Record<string, { label: string; className: string }> = {
  match: {
    label: "Cocok",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  unreadable: {
    label: "Tidak terbaca",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  mismatch: {
    label: "Beda wilayah",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  unknown: {
    label: "Belum diperiksa",
    className: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  },
};

export default async function RegistrasiPage() {
  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const { results } = await getDb()
    .prepare(
      `SELECT id, full_name, nik_last4, contact, read_name, read_village,
              read_regency, ktp_media_id, match_result, match_note, status,
              created_at
         FROM resident_registrations
        WHERE village_id = ?
        ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 100`,
    )
    .bind(village.id)
    .all<Row>();

  const locale = `${village.locale}-ID`;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Pendaftaran Warga</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Hasil pembacaan KTP hanya saran. Keputusan tetap di tangan petugas —
        pembacaan otomatis bisa keliru pada foto yang buram atau ejaan nama desa
        yang berbeda.
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Foto KTP <strong>dihapus permanen</strong> begitu Anda menyetujui atau
        menolak. Periksa fotonya sebelum memutuskan.
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Belum ada pendaftaran." />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {results.map((row) => {
            const badge = BADGE[row.match_result] ?? BADGE.unknown;
            return (
              <li
                key={row.id}
                className="rounded-xl border border-[var(--border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{row.full_name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {row.contact || "tanpa kontak"} ·{" "}
                      {formatDateTime(row.created_at, locale, village.timezone)}
                    </p>
                    <p className="mt-2 text-sm">
                      Terbaca di kartu:{" "}
                      <strong>{row.read_name ?? "—"}</strong>
                      {row.read_village ? `, ${row.read_village}` : ""}
                      {row.read_regency ? `, ${row.read_regency}` : ""}
                      {row.nik_last4 ? ` · NIK ****${row.nik_last4}` : ""}
                    </p>
                    {row.match_note ? (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {row.match_note}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {row.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {row.ktp_media_id ? (
                      <a
                        href={`/media/${row.ktp_media_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium hover:border-brand hover:text-brand"
                      >
                        Lihat foto KTP
                      </a>
                    ) : null}

                    {/* Two forms, not one form with two named buttons: a server
                        action never receives the submitter's name and value, so
                        an `intent` written that way is always null. That exact
                        mistake made Hapus on Tata Letak silently save instead of
                        delete. */}
                    <form action={decide}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="next" value="approved" />
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                      >
                        Setujui
                      </button>
                    </form>

                    <form action={decide}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="next" value="rejected" />
                      <button
                        type="submit"
                        className="rounded-md border border-[var(--border)] px-4 py-2 text-xs font-medium text-red-600 hover:border-red-500"
                      >
                        Tolak
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
                    {row.status === "approved" ? "Disetujui" : "Ditolak"} · foto
                    KTP sudah dihapus
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
