import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  buildLetterValues,
  getLetterForPrint,
  renderTemplate,
} from "@/lib/surat";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * The finished letter, ready for the printer.
 *
 * Rendered as plain text inside a sheet sized to A4 rather than as HTML the
 * operator can style. An official letter has to come out of every printer the
 * same way, and the fastest route to a document that does not is to let each
 * template carry its own markup.
 *
 * There is no "download" here on purpose. The browser's own print dialogue
 * already produces a PDF on every platform the village office is likely to
 * have, and it does so without this Worker having to lay out a page.
 */
export default async function CetakSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const letter = await getLetterForPrint(id, village.id);
  if (!letter) notFound();

  const values = await buildLetterValues(letter, village);
  const body = letter.letter_template
    ? renderTemplate(letter.letter_template, values)
    : null;

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "read",
    resource: "letter_requests",
    resourceId: letter.id,
    summary: `Cetak surat ${letter.ticket}`,
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[210mm] print:hidden">
        <Link
          href="/admin/surat"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Kembali ke Pengajuan Surat
        </Link>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Tekan Ctrl+P (atau Cmd+P) untuk mencetak atau menyimpan sebagai PDF.
          Bagian ini tidak ikut tercetak.
        </p>
      </div>

      {body === null ? (
        <div className="mx-auto mt-6 max-w-[210mm] rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">
            Layanan “{letter.service_name}” belum punya naskah surat.
          </p>
          <p className="mt-1">
            Isi kolom <strong>Naskah Surat</strong> di Panel Admin › Layanan
            Surat, lalu buka halaman ini lagi.
          </p>
        </div>
      ) : (
        /* A4 at 96dpi is 210mm wide. The sheet keeps that width on screen too,
           so what the operator reviews is the line breaking they will get on
           paper - not a wider column that reflows when it prints. */
        <article className="mx-auto mt-6 max-w-[210mm] whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-white p-[20mm] font-serif text-[11pt] leading-relaxed text-black shadow-[var(--shadow-md)] print:m-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {body}
        </article>
      )}

      <details className="mx-auto mt-6 max-w-[210mm] rounded-xl border border-[var(--border)] p-4 text-sm print:hidden">
        <summary className="cursor-pointer font-semibold">
          Data yang tersedia untuk naskah ini
        </summary>
        <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
          {Object.entries(values).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-xs text-[var(--text-muted)]">
                {`{{${key}}}`}
              </dt>
              <dd className="text-sm">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
