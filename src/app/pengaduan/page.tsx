import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";

import { getViewer, hashIp } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { newId, newTicket } from "@/lib/id";
import { checkRateLimit } from "@/lib/rate-limit";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pengaduan Warga" };

const CATEGORIES = [
  "umum",
  "infrastruktur",
  "kebersihan",
  "keamanan",
  "kesehatan",
  "pelayanan",
  "bantuan_sosial",
];

async function submitComplaint(formData: FormData) {
  "use server";

  const village = await requireVillage();
  const viewer = await getViewer();
  const headerList = await headers();

  const ipHash = await hashIp(headerList.get("cf-connecting-ip"));

  // Public, unauthenticated form: throttle per client so it cannot be used to
  // flood the table.
  const allowed = await checkRateLimit({
    key: `complaint:${village.id}:${ipHash ?? "anon"}`,
    limit: 5,
    windowSeconds: 600,
  });
  if (!allowed) redirect("/pengaduan?error=rate");

  const subject = String(formData.get("subject") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  const reporterName = String(formData.get("reporterName") ?? "").trim();
  const category = String(formData.get("category") ?? "umum");

  if (!subject || !detail || !reporterName) {
    redirect("/pengaduan?error=kosong");
  }
  if (!CATEGORIES.includes(category)) {
    redirect("/pengaduan?error=kategori");
  }

  const ticket = newTicket("PGD");

  await getDb()
    .prepare(
      `INSERT INTO complaints (id, village_id, ticket, user_id, reporter_name,
                               contact, category, subject, detail, location,
                               is_anonymous, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
    )
    .bind(
      newId("cpl"),
      village.id,
      ticket,
      viewer.userId,
      reporterName,
      String(formData.get("contact") ?? "").trim() || null,
      category,
      subject.slice(0, 200),
      detail.slice(0, 5000),
      String(formData.get("location") ?? "").trim() || null,
      formData.get("anonymous") === "on" ? 1 : 0,
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "create",
    resource: "complaints",
    summary: `Pengaduan baru ${ticket}`,
    ipHash,
  });

  redirect(`/pengaduan?ticket=${ticket}`);
}

export default async function ComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; error?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("pengaduan"), { viewer })) notFound();

  const errorMessage =
    params.error === "rate"
      ? "Terlalu banyak pengiriman. Silakan coba lagi beberapa saat lagi."
      : params.error === "kosong"
        ? "Nama, judul dan uraian pengaduan wajib diisi."
        : params.error === "kategori"
          ? "Kategori tidak dikenal."
          : null;

  return (
    <SiteShell>
      <PageHeader
        title="Pengaduan Warga"
        description="Sampaikan laporan atau keluhan. Anda akan menerima nomor tiket untuk melacak status."
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Pengaduan", href: "/pengaduan" },
        ]}
      />

      <div className="mx-auto max-w-2xl px-4 py-10">
        {params.ticket ? (
          <Card className="mb-8 border-green-500 p-5">
            <p className="font-semibold text-green-700 dark:text-green-400">
              Pengaduan Anda telah diterima.
            </p>
            <p className="mt-2 text-sm">
              Nomor tiket:{" "}
              <code className="rounded bg-[var(--surface-muted)] px-2 py-1 font-mono text-base">
                {params.ticket}
              </code>
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Simpan nomor ini untuk memeriksa status di halaman{" "}
              <a href="/pengaduan/lacak" className="text-brand hover:underline">
                Lacak Pengaduan
              </a>
              .
            </p>
          </Card>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={submitComplaint} className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="reporterName" className="block text-sm font-medium">
                Nama pelapor <span aria-hidden>*</span>
              </label>
              <input
                id="reporterName"
                name="reporterName"
                required
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="contact" className="block text-sm font-medium">
                Kontak (opsional)
              </label>
              <input
                id="contact"
                name="contact"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Hanya dilihat petugas, tidak pernah dipublikasikan.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium">
              Judul pengaduan <span aria-hidden>*</span>
            </label>
            <input
              id="subject"
              name="subject"
              required
              maxLength={200}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="detail" className="block text-sm font-medium">
              Uraian <span aria-hidden>*</span>
            </label>
            <textarea
              id="detail"
              name="detail"
              rows={6}
              required
              maxLength={5000}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium">
              Lokasi kejadian (opsional)
            </label>
            <input
              id="location"
              name="location"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anonymous" />
            Sembunyikan nama saya dari daftar petugas
          </label>

          <div>
            <button
              type="submit"
              className="rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Kirim Pengaduan
            </button>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}
