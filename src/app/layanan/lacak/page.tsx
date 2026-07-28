import type { Metadata } from "next";

import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lacak Surat" };

const STATUS_LABEL: Record<string, string> = {
  submitted: "Diterima",
  in_review: "Sedang diperiksa",
  approved: "Disetujui",
  rejected: "Ditolak",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function TrackLetterPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const ticket = (params.ticket ?? "").trim().toUpperCase();

  const db = getDb();

  // Public projection: status and service name only. `payload` (the citizen's
  // form answers) and `contact` are never selected here.
  const request = ticket
    ? await db
        .prepare(
          `SELECT lr.id, lr.ticket, s.name AS service_name, lr.status,
                  lr.reject_reason, lr.submitted_at, lr.updated_at
           FROM letter_requests lr
           JOIN services s ON s.id = lr.service_id
           WHERE lr.village_id = ? AND lr.ticket = ? LIMIT 1`,
        )
        .bind(village.id, ticket)
        .first<{
          id: string;
          ticket: string;
          service_name: string;
          status: string;
          reject_reason: string | null;
          submitted_at: string;
          updated_at: string;
        }>()
    : null;

  const timeline = request
    ? (
        await db
          .prepare(
            `SELECT status, note, created_at FROM letter_request_events
             WHERE request_id = ? ORDER BY created_at`,
          )
          .bind(request.id)
          .all<{ status: string; note: string | null; created_at: string }>()
      ).results
    : [];

  const locale = `${village.locale}-ID`;

  return (
    <SiteShell>
      <PageHeader
        title="Lacak Surat"
        description="Masukkan nomor tiket pengajuan Anda."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: "Lacak", href: "/layanan/lacak" },
        ]}
      />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <form className="flex flex-wrap gap-3">
          <label htmlFor="ticket" className="sr-only">
            Nomor tiket
          </label>
          <input
            id="ticket"
            name="ticket"
            defaultValue={ticket}
            placeholder="SRT-XXXX-XXXX"
            required
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm uppercase"
          />
          <button
            type="submit"
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Lacak
          </button>
        </form>

        {ticket && !request ? (
          <p role="status" className="mt-6 text-sm text-[var(--text-muted)]">
            Tiket <code>{ticket}</code> tidak ditemukan.
          </p>
        ) : null}

        {request ? (
          <Card className="mt-6 p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              {request.ticket}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{request.service_name}</h2>
            <p className="mt-3">
              Status:{" "}
              <strong className="text-brand">
                {STATUS_LABEL[request.status] ?? request.status}
              </strong>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Diajukan {formatDateTime(request.submitted_at, locale, village.timezone)}
            </p>
            {request.reject_reason ? (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {request.reject_reason}
              </p>
            ) : null}

            {timeline.length > 0 ? (
              <ol className="mt-5 space-y-3 border-l border-[var(--border)] pl-4">
                {timeline.map((entry, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium">
                      {STATUS_LABEL[entry.status] ?? entry.status}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatDateTime(entry.created_at, locale, village.timezone)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
          </Card>
        ) : null}
      </div>
    </SiteShell>
  );
}
