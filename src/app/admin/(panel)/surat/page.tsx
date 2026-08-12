import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { newId } from "@/lib/id";
import { requireVillage } from "@/lib/village";

import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = [
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "completed",
  "cancelled",
] as const;

interface RequestRow {
  id: string;
  ticket: string;
  applicant_name: string;
  service_name: string;
  status: string;
  note: string | null;
  submitted_at: string;
}

async function updateRequest(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!id || !(STATUSES as readonly string[]).includes(status)) return;

  const now = new Date().toISOString();
  const db = getDb();

  await db
    .prepare(
      `UPDATE letter_requests
       SET status = ?, note = ?, handled_by = ?, updated_at = ?,
           completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END,
           verification_code = CASE
             WHEN ? = 'completed' AND verification_code IS NULL THEN ?
             ELSE verification_code END
       WHERE id = ? AND village_id = ?`,
    )
    .bind(status, note, viewer.userId, now, status, now, status, newId("vrf"), id, village.id)
    .run();

  // Every transition is appended to the tracking timeline the citizen sees.
  await db
    .prepare(
      `INSERT INTO letter_request_events (id, request_id, status, note, actor_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(newId("evt"), id, status, note, viewer.userId)
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "letter_requests",
    resourceId: id,
    summary: `status → ${status}`,
  });

  revalidatePath("/admin/surat");
}

export default async function AdminLettersPage() {
  const village = await requireVillage();

  const { results } = await getDb()
    .prepare(
      `SELECT lr.id, lr.ticket, lr.applicant_name, s.name AS service_name,
              lr.status, lr.note, lr.submitted_at
       FROM letter_requests lr
       JOIN services s ON s.id = lr.service_id
       WHERE lr.village_id = ?
       ORDER BY lr.submitted_at DESC
       LIMIT 50`,
    )
    .bind(village.id)
    .all<RequestRow>();

  const locale = `${village.locale}-ID`;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Pengajuan Surat</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Isian formulir warga hanya dibuka pada halaman detail dan tidak pernah
        dipublikasikan. Pelacakan publik hanya menampilkan status.
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Belum ada pengajuan." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 font-semibold">Tiket</th>
                <th className="px-3 py-2 font-semibold">Pemohon</th>
                <th className="px-3 py-2 font-semibold">Layanan</th>
                <th className="px-3 py-2 font-semibold">Diajukan</th>
                <th className="px-3 py-2 font-semibold">Status &amp; Catatan</th>
              </tr>
            </thead>
            <tbody>
              {results.map((request) => (
                <tr key={request.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">
                    {/* The ticket is the operator's handle on the request, so
                        it is also the way through to the printable letter. */}
                    <Link
                      href={`/admin/surat/${request.id}/cetak`}
                      className="font-mono text-xs text-brand hover:underline"
                      title={`Cetak surat ${request.ticket}`}
                    >
                      {request.ticket}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{request.applicant_name}</td>
                  <td className="px-3 py-2">{request.service_name}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {formatDateTime(request.submitted_at, locale, village.timezone)}
                  </td>
                  <td className="px-3 py-2">
                    <form action={updateRequest} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={request.id} />
                      <select
                        name="status"
                        defaultValue={request.status}
                        aria-label={`Status ${request.ticket}`}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        name="note"
                        defaultValue={request.note ?? ""}
                        placeholder="Catatan"
                        aria-label={`Catatan ${request.ticket}`}
                        className="min-w-40 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium hover:border-brand hover:text-brand"
                      >
                        Simpan
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
