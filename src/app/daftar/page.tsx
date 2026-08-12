import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getDb } from "@/lib/env";
import { newId } from "@/lib/id";
import { hashNik, readKtp, verifyAgainstVillage } from "@/lib/ktp";
import { storeMedia } from "@/lib/media";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pendaftaran Warga" };

/**
 * Resident registration.
 *
 * The applicant photographs their KTP; the card is read, and the regency and
 * village printed on it are compared with this village's own. A card from
 * elsewhere is refused - that is the whole point of the screen.
 *
 * Nothing is decided by the machine alone. Even a clean match is queued as
 * `pending` for an officer to approve, and an unreadable photograph is queued
 * too rather than turned away. Handing an automated reader the power to refuse
 * someone their own village's services, with no person in the loop, is not a
 * trade worth making for a few minutes of an officer's time.
 */

const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function register(formData: FormData) {
  "use server";

  const village = await requireVillage();

  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 120);
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 120);
  const photo = formData.get("ktp");

  if (!fullName || !(photo instanceof File) || photo.size === 0) {
    redirect("/daftar?error=lengkap");
  }
  if (!OK_TYPES.has(photo.type)) {
    redirect("/daftar?error=format");
  }
  // 8MB: a phone photograph comfortably fits, and anything larger is either a
  // mistake or someone probing the endpoint.
  if (photo.size > 8 * 1024 * 1024) {
    redirect("/daftar?error=besar");
  }

  // Reading a card costs a call to a third party, so the endpoint is limited
  // before anything is uploaded or read.
  const allowed = await checkRateLimit({
    key: `daftar:${village.id}`,
    limit: 20,
    windowSeconds: 600,
  });
  if (!allowed) redirect("/daftar?error=sibuk");

  const bytes = await photo.arrayBuffer();
  const base64 = btoa(
    [...new Uint8Array(bytes)].map((b) => String.fromCharCode(b)).join(""),
  );
  const reading = await readKtp(`data:${photo.type};base64,${base64}`);
  const verdict = verifyAgainstVillage(reading, village);

  // A card from another regency is turned away before its photograph is
  // written anywhere. There is no reason to hold the identity document of
  // someone this village has just told it cannot serve.
  if (verdict.result === "mismatch") {
    redirect("/daftar?error=wilayah");
  }

  const stored = await storeMedia({
    villageId: village.id,
    file: photo,
    folder: "/ktp",
    visibility: "private",
    altText: null,
  });

  const nik = verdict.reading.nik;
  await getDb()
    .prepare(
      `INSERT INTO resident_registrations
         (id, village_id, full_name, nik_hash, nik_last4, contact,
          read_name, read_village, read_district, read_regency, read_province,
          ktp_media_id, match_result, match_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
       ON CONFLICT (village_id, nik_hash) DO UPDATE SET
         full_name    = excluded.full_name,
         contact      = excluded.contact,
         ktp_media_id = excluded.ktp_media_id,
         match_result = excluded.match_result,
         status       = 'pending',
         updated_at   = datetime('now')`,
    )
    .bind(
      newId("reg"),
      village.id,
      fullName,
      // An unreadable card has no number to key on, so the upload id stands in
      // and the application queues on its own rather than colliding with
      // another unreadable one.
      nik ? await hashNik(nik, village.id) : `unread:${stored.id}`,
      nik ? nik.slice(-4) : null,
      contact || null,
      verdict.reading.name,
      verdict.reading.village,
      verdict.reading.district,
      verdict.reading.regency,
      verdict.reading.province,
      stored.id,
      verdict.result,
      verdict.message,
    )
    .run();

  redirect("/daftar?ok=1");
}

export default async function DaftarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const where = [village.regency, village.province].filter(Boolean).join(", ");

  const errors: Record<string, string> = {
    lengkap: "Nama dan foto KTP wajib diisi.",
    format: "Foto harus berformat JPG, PNG atau WEBP.",
    besar: "Ukuran foto melebihi 8 MB. Potret ulang dengan resolusi lebih kecil.",
    sibuk: "Pendaftaran sedang ramai. Coba lagi beberapa menit lagi.",
    wilayah:
      `Pendaftaran hanya untuk warga ${village.entityLabel} ${village.name}` +
      `${where ? `, ${where}` : ""}. KTP yang Anda unggah tercatat di wilayah lain.`,
  };

  return (
    <SiteShell>
      <PageHeader
        title="Pendaftaran Warga"
        description={`Khusus warga ${village.entityLabel} ${village.name}${where ? `, ${where}` : ""}.`}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Pendaftaran", href: "/daftar" },
        ]}
      />

      <div className="mx-auto max-w-2xl px-4 py-10">
        {params.ok ? (
          <div
            role="status"
            className="rounded-xl border border-green-300 bg-green-50 p-5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
          >
            <p className="font-semibold">Pendaftaran Anda sudah kami terima.</p>
            <p className="mt-1">
              Petugas desa akan memeriksanya. Anda akan dihubungi melalui kontak
              yang dicantumkan.
            </p>
          </div>
        ) : null}

        {params.error && errors[params.error] ? (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {errors[params.error]}
          </div>
        ) : null}

        <form action={register} className="mt-6 grid gap-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium">
              Nama Lengkap
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              maxLength={120}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </div>

          <div>
            <label htmlFor="contact" className="block text-sm font-medium">
              Nomor WhatsApp atau Email
            </label>
            <input
              id="contact"
              name="contact"
              maxLength={120}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Dipakai petugas untuk menghubungi Anda soal pendaftaran ini.
            </p>
          </div>

          <div>
            <label htmlFor="ktp" className="block text-sm font-medium">
              Foto KTP
            </label>
            <input
              id="ktp"
              name="ktp"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Pastikan seluruh kartu masuk dalam bingkai dan tulisannya terbaca.
            </p>
          </div>

          {/* Said plainly and before the button, not buried in a policy page.
              Someone is about to hand over their identity card. */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text)]">
              Yang terjadi dengan data Anda
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Foto KTP disimpan tertutup dan hanya dapat dilihat petugas desa —
                tidak pernah tampil di situs.
              </li>
              <li>
                Nomor NIK <strong>tidak disimpan</strong>. Yang tersimpan hanya
                sidik pengaman dan empat digit terakhir.
              </li>
              <li>
                Foto dibaca otomatis untuk memastikan Anda warga{" "}
                {village.entityLabel} {village.name}. Agama, golongan darah dan
                status perkawinan tidak dibaca.
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Kirim Pendaftaran
          </button>
        </form>
      </div>
    </SiteShell>
  );
}
