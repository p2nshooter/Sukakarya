import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { mediaUrl } from "@/lib/media";
import {
  buildLetterValues,
  getLetterForPrint,
  renderTemplate,
} from "@/lib/surat";
import { getVillageSettings, requireVillage } from "@/lib/village";

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

  // The regency arms, not the village logo. A surat desa in Indonesia is issued
  // under the kabupaten and carries its lambang; the village's own device is
  // the site's identity, not the letterhead's. Falls back to the village logo
  // for a village that has not set the emblem, because a kop with no mark at
  // all looks more wrong than one carrying the wrong mark.
  const settings = await getVillageSettings(village.id, "site.");
  const emblem =
    mediaUrl(settings["site.regency_emblem_media_id"]?.trim() || null) ??
    mediaUrl(village.logoMediaId);
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
           paper - not a wider column that reflows when it prints.

           Letterhead and signature live here rather than inside each template.
           They are identical on every letter a village sends, so putting them
           in the template would mean five copies of the same block, and five
           places to edit when the head of village changes. */
        <article className="mx-auto mt-6 max-w-[210mm] rounded-xl border border-[var(--border)] bg-white p-[20mm] font-serif text-[11pt] leading-relaxed text-black shadow-[var(--shadow-md)] print:m-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* The emblem sits beside the wording, as it does on every surat desa
              in the country. Both it and the logo it falls back to are chosen
              in Pengaturan Desa, so a village installing this script gets the
              right arms on its own letters without touching any code. */}
          <header className="flex items-center gap-4 border-b-[3px] border-double border-black pb-3">
            {emblem ? (
              // Not next/image: the print sheet wants the file at its natural
              // ratio inside a fixed box, and no optimisation pipeline.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={emblem}
                alt=""
                className="h-[22mm] w-[22mm] shrink-0 object-contain"
              />
            ) : null}
            <div className={`flex-1 text-center ${emblem ? "pr-[22mm]" : ""}`}>
              <p className="text-[13pt] font-bold uppercase leading-tight">
                Pemerintah {values.kabupaten || values.provinsi || "Kabupaten"}
              </p>
              <p className="text-[15pt] font-bold uppercase leading-tight">
                Pemerintah {values.sebutan_desa} {values.nama_desa}
              </p>
              {values.kecamatan ? (
                <p className="text-[10pt] uppercase">
                  Kecamatan {values.kecamatan}
                </p>
              ) : null}
              {values.alamat_desa ? (
                <p className="mt-1 text-[9pt]">{values.alamat_desa}</p>
              ) : null}
            </div>
          </header>

          <div className="mt-6 text-center">
            <h1 className="text-[12pt] font-bold uppercase underline">
              {values.jenis_surat}
            </h1>
            {/* The number is the operator's to assign from the village's own
                register; the ticket is printed beside it so the sheet on the
                desk can always be traced back to the request in the panel. */}
            <p className="mt-1 text-[10pt]">
              Nomor:{" "}
              {values.nomor_surat || `……. / ….. / ${values.nama_desa} / …….`}
            </p>
          </div>

          <div className="mt-6 whitespace-pre-wrap">{body}</div>

          <div className="mt-10 flex justify-end">
            <div className="w-[70mm] text-center">
              <p>
                {values.nama_desa}, {values.tanggal_surat}
              </p>
              <p>{values.jabatan_kepala_desa}</p>
              {/* Room for a wet signature and the village stamp. An official
                  letter is signed on paper; nothing here pretends otherwise. */}
              <div className="h-[25mm]" />
              <p className="font-bold underline">
                {values.nama_kepala_desa || "………………………………"}
              </p>
            </div>
          </div>

          <p className="mt-8 text-[8pt] text-neutral-500">
            Nomor tiket: {values.nomor_tiket}
          </p>
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
