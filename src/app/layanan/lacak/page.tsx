import type { Metadata } from "next";

import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { LETTER_PIPELINE, LETTER_STATUS } from "@/lib/service-form";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import {
  Badge,
  Button,
  Card,
  Container,
  Notice,
  PageHeader,
} from "@/components/ui";
import { IconCheck, IconClock, IconSearch } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Lacak Surat" };

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
  // form answers) and `contact` are never selected here, so the tracking page
  // cannot leak personal data to anyone holding a ticket number.
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

  const locale = village.locale.includes("-")
    ? village.locale
    : `${village.locale}-ID`;

  const current = request ? LETTER_STATUS[request.status] : null;

  // A terminal status that is not part of the happy path (rejected, cancelled)
  // should not draw a progress bar that implies the request is still moving.
  const stageIndex = request
    ? LETTER_PIPELINE.indexOf(request.status as (typeof LETTER_PIPELINE)[number])
    : -1;
  const showPipeline = stageIndex >= 0;

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow="Pelayanan"
        title="Lacak Surat"
        description="Masukkan nomor tiket yang Anda terima saat mengajukan."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: "Lacak", href: "/layanan/lacak" },
        ]}
      />

      <Container width="narrow" className="py-12">
        <Card tone="raised" className="p-6">
          <form className="flex flex-wrap gap-3">
            <label htmlFor="ticket" className="sr-only">
              Nomor tiket
            </label>
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                id="ticket"
                name="ticket"
                defaultValue={ticket}
                placeholder="SRT-XXXX-XXXX"
                required
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-3 font-mono text-sm uppercase tracking-wider outline-none transition-shadow placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--text-subtle)] focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
            </div>
            <Button type="submit">Lacak</Button>
          </form>
        </Card>

        {ticket && !request ? (
          <div className="mt-6">
            <Notice tone="warning" title="Tiket tidak ditemukan.">
              Nomor <code className="font-mono">{ticket}</code> tidak terdaftar
              di {village.entityLabel} {village.name}. Periksa kembali penulisan
              tiketnya.
            </Notice>
          </div>
        ) : null}

        {request && current ? (
          <Card tone="raised" className="mt-6 overflow-hidden">
            <div className="border-b border-[var(--border)] bg-[var(--surface-1)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    {request.ticket}
                  </p>
                  <h2 className="mt-1.5 font-display text-xl font-bold">
                    {request.service_name}
                  </h2>
                </div>
                <Badge tone={current.tone}>{current.label}</Badge>
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {current.description}
              </p>
            </div>

            {showPipeline ? (
              <div className="border-b border-[var(--border)] p-6">
                <ol className="flex items-center">
                  {LETTER_PIPELINE.map((stage, index) => {
                    const done = index <= stageIndex;
                    const isLast = index === LETTER_PIPELINE.length - 1;

                    return (
                      <li
                        key={stage}
                        className={`flex items-center ${isLast ? "" : "flex-1"}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                              done
                                ? "bg-brand text-[var(--text-on-brand)]"
                                : "bg-[var(--surface-2)] text-[var(--text-subtle)]"
                            }`}
                          >
                            {done ? (
                              <IconCheck className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span
                            className={`text-center text-[0.6875rem] font-medium leading-tight ${
                              done ? "text-[var(--text)]" : "text-[var(--text-subtle)]"
                            }`}
                          >
                            {LETTER_STATUS[stage].label}
                          </span>
                        </div>
                        {!isLast ? (
                          <span
                            aria-hidden
                            className={`mx-1 -mt-6 h-0.5 flex-1 rounded-full ${
                              index < stageIndex
                                ? "bg-brand"
                                : "bg-[var(--surface-2)]"
                            }`}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            <div className="p-6">
              <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <IconClock className="h-4 w-4 shrink-0" />
                Diajukan{" "}
                {formatDateTime(request.submitted_at, locale, village.timezone)}
              </p>

              {request.reject_reason ? (
                <div className="mt-4">
                  <Notice tone="error" title="Catatan petugas">
                    {request.reject_reason}
                  </Notice>
                </div>
              ) : null}

              {timeline.length > 0 ? (
                <>
                  <h3 className="mt-7 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Riwayat
                  </h3>
                  <ol className="mt-4 space-y-5">
                    {timeline.map((entry, index) => (
                      <li key={index} className="relative flex gap-4 pl-1">
                        <span
                          aria-hidden
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand ring-4 ring-brand/15"
                        />
                        {index < timeline.length - 1 ? (
                          <span
                            aria-hidden
                            className="absolute left-[9px] top-5 h-full w-px bg-[var(--border)]"
                          />
                        ) : null}
                        <div className="-mt-0.5 min-w-0">
                          <p className="text-sm font-semibold">
                            {LETTER_STATUS[entry.status]?.label ?? entry.status}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {formatDateTime(
                              entry.created_at,
                              locale,
                              village.timezone,
                            )}
                          </p>
                          {entry.note ? (
                            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                              {entry.note}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>
          </Card>
        ) : null}
      </Container>
    </SiteShell>
  );
}
