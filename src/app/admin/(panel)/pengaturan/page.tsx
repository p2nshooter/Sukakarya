import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { listMedia } from "@/lib/media";
import { getVillageSettings, requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Village identity, contact details and branding.
 *
 * Every value here already had a column on `villages`, but nothing in the panel
 * could reach them: changing a logo, a colour or even the village's telephone
 * number meant running SQL by hand. For a codebase meant to be installed for
 * more than one village that is a hole, not a missing nicety - a buyer cannot
 * put their own name and crest on the site without calling a developer.
 *
 * Nothing here is global. Every write is scoped to the tenant resolved for the
 * request, so two villages on the same deployment cannot see or overwrite each
 * other's branding.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Colours land in a stylesheet, so anything that is not a plain hex is dropped. */
function colour(value: FormDataEntryValue | null, fallback: string): string {
  const text = String(value ?? "").trim();
  return HEX.test(text) ? text : fallback;
}

/**
 * A coordinate, or null.
 *
 * Out-of-range values are dropped rather than clamped: a latitude of 200 is a
 * typo, and silently turning it into 90 would put the village office in the
 * Arctic and look deliberate.
 */
function coord(
  value: FormDataEntryValue | null,
  limit: number,
  fallback: number | null,
): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) return fallback;
  return parsed;
}

function text(value: FormDataEntryValue | null, max: number): string | null {
  const trimmed = String(value ?? "").trim().slice(0, max);
  return trimmed || null;
}

async function saveSettings(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) redirect("/admin/login");

  const village = await requireVillage();

  const name = text(formData.get("name"), 120);
  if (!name) redirect("/admin/pengaturan?error=nama");

  await getDb()
    .prepare(
      `UPDATE villages
          SET name = ?, entity_label = ?, district = ?, regency = ?,
              province = ?, address = ?, phone = ?, whatsapp = ?, email = ?,
              latitude = ?, longitude = ?, map_zoom = ?,
              logo_media_id = ?, favicon_media_id = ?,
              primary_color = ?, secondary_color = ?, accent_color = ?,
              updated_at = ?
        WHERE id = ?`,
    )
    .bind(
      name,
      text(formData.get("entityLabel"), 40) ?? "Desa",
      text(formData.get("district"), 120),
      text(formData.get("regency"), 120),
      text(formData.get("province"), 120),
      text(formData.get("address"), 240),
      text(formData.get("phone"), 40),
      text(formData.get("whatsapp"), 40),
      text(formData.get("email"), 160),
      coord(formData.get("latitude"), 90, village.latitude),
      coord(formData.get("longitude"), 180, village.longitude),
      Math.min(19, Math.max(3, Number(formData.get("mapZoom")) || village.mapZoom)),
      text(formData.get("logoMediaId"), 60),
      text(formData.get("faviconMediaId"), 60),
      colour(formData.get("primaryColor"), village.primaryColor),
      colour(formData.get("secondaryColor"), village.secondaryColor),
      colour(formData.get("accentColor"), village.accentColor),
      new Date().toISOString(),
      village.id,
    )
    .run();

  // Kept in village_settings rather than a column on villages: it is an
  // operational flag, not part of the village's identity, and the key/value
  // table is exactly where per-village switches belong.
  await getDb()
    .prepare(
      `INSERT INTO village_settings (village_id, key, value, value_type, updated_at)
       VALUES (?, 'site.demo_stamp', ?, 'boolean', ?)
       ON CONFLICT (village_id, key)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(
      village.id,
      formData.get("demoStamp") === "on" ? "1" : "0",
      new Date().toISOString(),
    )
    .run();

  // The arms of the regency, for the letterhead. Held as a setting rather than
  // a column on villages because the emblem belongs to the kabupaten, not to
  // this village - a second village in the same regency points at the same one.
  await getDb()
    .prepare(
      `INSERT INTO village_settings (village_id, key, value, value_type, updated_at)
       VALUES (?, 'site.regency_emblem_media_id', ?, 'string', ?)
       ON CONFLICT (village_id, key)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(
      village.id,
      text(formData.get("regencyEmblemMediaId"), 60) ?? "",
      new Date().toISOString(),
    )
    .run();

  // Letters, digits, dash and underscore only: the code becomes a URL segment,
  // and anything needing escaping there would be typed wrong at least once.
  const knock = String(formData.get("adminKnock") ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48);
  await getDb()
    .prepare(
      `INSERT INTO village_settings (village_id, key, value, value_type, updated_at)
       VALUES (?, 'site.admin_knock', ?, 'string', ?)
       ON CONFLICT (village_id, key)
       DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(village.id, knock, new Date().toISOString())
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "villages",
    resourceId: village.id,
    summary: "Pengaturan desa diperbarui",
  });

  // The name, logo and colours appear in the shell of every page, so the whole
  // site is revalidated rather than this screen alone.
  revalidatePath("/", "layout");
  redirect("/admin/pengaturan?ok=1");
}

const field =
  "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm";

function Text({
  name,
  label,
  value,
  hint,
  type = "text",
}: {
  name: string;
  label: string;
  value: string | null;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        className={field}
      />
      {hint ? (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function MediaPicker({
  name,
  label,
  value,
  options,
  hint,
}: {
  name: string;
  label: string;
  value: string | null;
  options: { id: string; fileName: string }[];
  hint: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <select id={name} name={name} defaultValue={value ?? ""} className={field}>
        <option value="">— tidak dipakai —</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.fileName}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function Colour({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {/* A text field rather than a colour picker. `<input type="color">`
          would need a client component to keep the two controls in step, and a
          picker sitting beside a box it does not update is worse than no picker
          at all. The value is validated as a plain hex on save. */}
      <input
        id={name}
        name={name}
        defaultValue={value}
        spellCheck={false}
        pattern="#[0-9a-fA-F]{6}"
        className={`${field} font-mono`}
      />
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Format #rrggbb. Nilai di luar format itu diabaikan.
      </p>
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const village = await requireVillage();

  const [images, settings] = await Promise.all([
    listMedia({ villageId: village.id, kind: "image", limit: 100 }).then(
      (list) => list.map((m) => ({ id: m.id, fileName: m.fileName })),
    ),
    getVillageSettings(village.id, "site."),
  ]);
  const demoStamp = settings["site.demo_stamp"] === "1";
  const adminKnock = settings["site.admin_knock"] ?? "";
  const regencyEmblem = settings["site.regency_emblem_media_id"] ?? "";

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Pengaturan Desa</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Identitas, kontak dan tampilan situs. Semua tersimpan per desa — tidak
        ada nilai yang dikunci di dalam kode.
      </p>

      {params.ok ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
        >
          Pengaturan tersimpan.
        </p>
      ) : null}
      {params.error === "nama" ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          Nama desa wajib diisi.
        </p>
      ) : null}

      <form action={saveSettings} className="mt-7 space-y-8">
        <section className="rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold">Identitas</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Text name="name" label="Nama Desa" value={village.name} />
            <Text
              name="entityLabel"
              label="Sebutan"
              value={village.entityLabel}
              hint="Desa, Kelurahan, Nagari, Kampung, dan sebagainya."
            />
            <Text name="district" label="Kecamatan" value={village.district} />
            <Text name="regency" label="Kabupaten / Kota" value={village.regency} />
            <Text name="province" label="Provinsi" value={village.province} />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold">Kontak</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Tampil di situs publik. Kosongkan yang belum ada — lebih baik kosong
            daripada nomor yang salah, karena warga benar-benar meneleponnya.
            Peta di beranda tidak muncul sampai titiknya diisi: pin yang
            ditebak akan dibaca warga sebagai alamat.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Text name="address" label="Alamat Kantor" value={village.address} />
            <Text name="phone" label="Telepon" value={village.phone} />
            <Text
              name="whatsapp"
              label="WhatsApp"
              value={village.whatsapp}
              hint="Format 628xxxxxxxxxx."
            />
            <Text name="email" label="Email" value={village.email} type="email" />
            <Text
              name="latitude"
              label="Titik Peta — Lintang"
              value={village.latitude === null ? null : String(village.latitude)}
              hint="Contoh: -6.2419. Buka kantor desa di Google Maps, klik kanan titiknya, lalu salin angka pertama."
            />
            <Text
              name="longitude"
              label="Titik Peta — Bujur"
              value={
                village.longitude === null ? null : String(village.longitude)
              }
              hint="Angka kedua dari koordinat yang sama. Contoh: 107.1523."
            />
            <Text
              name="mapZoom"
              label="Perbesaran Peta"
              value={String(village.mapZoom)}
              hint="3 sampai 19. 15 menampilkan kantor desa dan sekitarnya."
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold">Tampilan</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Logo dan favicon dipilih dari berkas yang sudah diunggah di Media.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MediaPicker
              name="logoMediaId"
              label="Logo Desa"
              value={village.logoMediaId}
              options={images}
              hint="Tampil di kepala setiap halaman."
            />
            <MediaPicker
              name="faviconMediaId"
              label="Favicon"
              value={village.faviconMediaId}
              options={images}
              hint="Ikon kecil di tab peramban. Gambar persegi paling rapi."
            />
            <MediaPicker
              name="regencyEmblemMediaId"
              label="Lambang Kabupaten"
              value={regencyEmblem}
              options={images}
              hint="Tampil di kop surat resmi, bukan di situs. Surat desa dikeluarkan atas nama kabupaten, jadi yang dipakai lambang kabupaten - bukan logo desa."
            />
            <Colour
              name="primaryColor"
              label="Warna Utama"
              value={village.primaryColor}
            />
            <Colour
              name="secondaryColor"
              label="Warna Kedua"
              value={village.secondaryColor}
            />
            <Colour
              name="accentColor"
              label="Warna Aksen"
              value={village.accentColor}
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold">Kode Ketuk Panel Admin</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Selama kode ini terisi, <code>/admin/login</code> menjawab 404 untuk
            siapa pun yang belum mengetuk. Halaman masuk dibuka lewat{" "}
            <code>/k/kode-anda</code>, dan terbuka selama 15 menit.
          </p>
          <div className="mt-3">
            <label htmlFor="adminKnock" className="block text-sm font-medium">
              Kode Ketuk
            </label>
            <input
              id="adminKnock"
              name="adminKnock"
              defaultValue={adminKnock}
              spellCheck={false}
              autoComplete="off"
              className={`${field} font-mono`}
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Huruf, angka, tanda hubung dan garis bawah. <strong>Kosongkan
              untuk mematikan</strong> — halaman masuk kembali terbuka seperti
              biasa. Catat kodenya sebelum menyimpan: tanpa itu Anda ikut
              terkunci di luar.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-5">
          <h2 className="font-semibold">Mode Demo</h2>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="demoStamp"
              defaultChecked={demoStamp}
              className="mt-1"
            />
            <span>
              Tampilkan stempel <strong>DEMO WEBSITE</strong> di video pembuka.
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                Nyalakan saat situs ini dipakai untuk memperagakan produk, supaya
                pengunjung tidak menyangka isinya data desa yang sebenarnya.
                Matikan sebelum diserahkan ke desa.
              </span>
            </span>
          </label>
        </section>

        <button
          type="submit"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}
