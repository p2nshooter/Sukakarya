import type { Metadata } from "next";

import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lacak Pengaduan" };

const STATUS_LABEL: Record<string, string> = {
  submitted: "Diterima",
  in_review: "Sedang ditelaah",
  in_progress: "Sedang ditindaklanjuti",
  resolved: "Selesai",
  rejected: "Ditolak",
};

export default async function TrackComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const ticket = (params.ticket ?? "").trim().toUpperCase();

  // Deliberately narrow projection: tracking is public, so it exposes status
  // and response only - never the reporter's name, contact or location.
  const complaint = ticket
    ? await getDb()
        .prepare(
          `SELECT ticket, subject, status, response, created_at, updated_at
           FROM complaints
           WHERE village_id = ? AND ticket = ? LIMIT 1`,
        )
        .bind(village.id, ticket)
        .first<{
          ticket: string;
          subject: string;
          status: string;
          response: string | null;
          created_at: string;
          updated_at: string;
        }>()
    : null;

  const locale = `${village.locale}-ID`;

  return (
    <SiteShell>
      <PageHeader
        title="Lacak Pengaduan"
        description="Masukkan nomor tiket yang Anda terima saat mengirim pengaduan."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Pengaduan", href: "/pengaduan" },
          { label: "Lacak", href: "/pengaduan/lacak" },
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
            placeholder="PGD-XXXX-XXXX"
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

        {ticket && !complaint ? (
          <p role="status" className="mt-6 text-sm text-[var(--text-muted)]">
            Tiket <code>{ticket}</code> tidak ditemukan.
          </p>
        ) : null}

        {complaint ? (
          <Card className="mt-6 p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              {complaint.ticket}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{complaint.subject}</h2>
            <p className="mt-3">
              Status:{" "}
              <strong className="text-brand">
                {STATUS_LABEL[complaint.status] ?? complaint.status}
              </strong>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Dikirim {formatDateTime(complaint.created_at, locale, village.timezone)} ·
              Diperbarui {formatDateTime(complaint.updated_at, locale, village.timezone)}
            </p>
            {complaint.response ? (
              <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Tanggapan Petugas
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{complaint.response}</p>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </SiteShell>
  );
}
