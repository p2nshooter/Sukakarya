import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { requireVillage } from "@/lib/village";

import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = [
  "submitted",
  "in_review",
  "in_progress",
  "resolved",
  "rejected",
] as const;

interface ComplaintRow {
  id: string;
  ticket: string;
  reporter_name: string;
  category: string;
  subject: string;
  detail: string;
  location: string | null;
  is_anonymous: number;
  status: string;
  response: string | null;
  created_at: string;
}

async function updateComplaint(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(STATUSES as readonly string[]).includes(status)) return;

  await getDb()
    .prepare(
      `UPDATE complaints
       SET status = ?, response = ?, handled_by = ?, updated_at = ?
       WHERE id = ? AND village_id = ?`,
    )
    .bind(
      status,
      String(formData.get("response") ?? "").trim() || null,
      viewer.userId,
      new Date().toISOString(),
      id,
      village.id,
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "complaints",
    resourceId: id,
    summary: `status → ${status}`,
  });

  revalidatePath("/admin/pengaduan");
}

export default async function AdminComplaintsPage() {
  const village = await requireVillage();

  const { results } = await getDb()
    .prepare(
      `SELECT id, ticket, reporter_name, category, subject, detail, location,
              is_anonymous, status, response, created_at
       FROM complaints
       WHERE village_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .bind(village.id)
    .all<ComplaintRow>();

  const locale = `${village.locale}-ID`;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Pengaduan Warga</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Kontak pelapor sengaja tidak ditampilkan di daftar ini dan tidak pernah
        muncul di halaman publik.
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Belum ada pengaduan masuk." />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {results.map((complaint) => (
            <li
              key={complaint.id}
              className="rounded-xl border border-[var(--border)] p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded bg-[var(--surface-1)] px-2 py-0.5 text-xs">
                  {complaint.ticket}
                </code>
                <span className="text-sm font-semibold">{complaint.subject}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {complaint.category} ·{" "}
                  {complaint.is_anonymous ? "Anonim" : complaint.reporter_name} ·{" "}
                  {formatDateTime(complaint.created_at, locale, village.timezone)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-muted)]">
                {complaint.detail}
              </p>
              {complaint.location ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Lokasi: {complaint.location}
                </p>
              ) : null}

              <form
                action={updateComplaint}
                className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"
              >
                <input type="hidden" name="id" value={complaint.id} />
                <select
                  name="status"
                  defaultValue={complaint.status}
                  aria-label={`Status pengaduan ${complaint.ticket}`}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  name="response"
                  defaultValue={complaint.response ?? ""}
                  placeholder="Tanggapan untuk pelapor"
                  aria-label={`Tanggapan untuk ${complaint.ticket}`}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  Simpan
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
