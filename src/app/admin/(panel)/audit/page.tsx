import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { requireVillage } from "@/lib/village";

import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  actor_label: string | null;
  actor_name: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  summary: string | null;
  created_at: string;
}

export default async function AdminAuditPage() {
  const village = await requireVillage();

  const { results } = await getDb()
    .prepare(
      `SELECT a.id, a.actor_label, u.full_name AS actor_name, a.action,
              a.resource, a.resource_id, a.summary, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.village_id = ?
       ORDER BY a.created_at DESC
       LIMIT 200`,
    )
    .bind(village.id)
    .all<AuditRow>();

  const locale = `${village.locale}-ID`;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Catatan hanya-baca. Tidak ada rute publik yang membaca tabel ini.
      </p>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Belum ada aktivitas tercatat." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 font-semibold">Waktu</th>
                <th className="px-3 py-2 font-semibold">Pelaku</th>
                <th className="px-3 py-2 font-semibold">Aksi</th>
                <th className="px-3 py-2 font-semibold">Objek</th>
                <th className="px-3 py-2 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--text-muted)]">
                    {formatDateTime(row.created_at, locale, village.timezone)}
                  </td>
                  <td className="px-3 py-2">
                    {row.actor_name ?? row.actor_label ?? "sistem"}
                  </td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {row.resource}
                    {row.resource_id ? ` · ${row.resource_id.slice(0, 12)}…` : ""}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {row.summary ?? "-"}
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
