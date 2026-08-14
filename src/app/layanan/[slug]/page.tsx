import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";

import { logAudit } from "@/lib/audit";
import { getViewer, hashIp } from "@/lib/auth";
import { getDb } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { newId, newTicket } from "@/lib/id";
import { newPaymentCode } from "@/lib/payment";
import { getVillageModules, shouldRender } from "@/lib/modules/registry";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  BASE_FIELDS,
  parseFormSchema,
  validateSubmission,
  type ServiceField,
} from "@/lib/service-form";
import { requireVillage } from "@/lib/village";

import { SiteShell } from "@/components/site-shell";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Container,
  Field,
  FIELD_CLASS,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDocument,
  IconWallet,
} from "@/components/icons";

export const dynamic = "force-dynamic";

interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  requirements: string | null;
  form_schema: string;
  sla_days: number;
  requires_login: number;
  fee: number;
}

async function getService(
  villageId: string,
  slug: string,
): Promise<ServiceRow | null> {
  return getDb()
    .prepare(
      `SELECT id, slug, name, description, requirements, form_schema,
              sla_days, requires_login, fee
       FROM services
       WHERE village_id = ? AND slug = ? AND status = 'published' AND visible = 1`,
    )
    .bind(villageId, slug)
    .first<ServiceRow>();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const village = await requireVillage();
  const service = await getService(village.id, slug);

  if (!service) return { title: "Layanan tidak ditemukan" };

  return {
    title: service.name,
    description: service.description ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                  */
/* -------------------------------------------------------------------------- */

async function submitRequest(formData: FormData) {
  "use server";

  const slug = String(formData.get("__slug") ?? "");
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("pelayanan-online"), { viewer })) notFound();

  const service = await getService(village.id, slug);
  if (!service) notFound();

  const base = `/layanan/${slug}`;

  // A service can be marked login-only. Enforce it on the write path, not just
  // by hiding the form, or the action is trivially callable without a session.
  if (service.requires_login && !viewer.userId) {
    redirect(`${base}?error=login`);
  }

  const headerList = await headers();
  const ipHash = await hashIp(headerList.get("cf-connecting-ip"));

  // Public write path: throttle per client so it cannot be used to flood the
  // queue. Fails open, so an unreachable KV never blocks a citizen.
  const allowed = await checkRateLimit({
    key: `letter:${village.id}:${ipHash ?? "anon"}`,
    limit: 5,
    windowSeconds: 900,
  });
  if (!allowed) redirect(`${base}?error=rate`);

  const fields = [...BASE_FIELDS, ...parseFormSchema(service.form_schema)];
  const { values, errors } = validateSubmission(fields, formData);

  if (Object.keys(errors).length > 0) {
    redirect(`${base}?error=validasi`);
  }

  const { applicantName, contact, ...payload } = values;
  const ticket = newTicket("SRT");

  // The fee is copied onto the request, not read from the service later. A
  // village that raises its tariff next month must not change what somebody
  // who applied today owes.
  const fee = Math.max(0, Math.floor(Number(service.fee) || 0));

  await getDb()
    .prepare(
      `INSERT INTO letter_requests
         (id, village_id, service_id, ticket, user_id, applicant_name,
          contact, payload, status, fee_amount, payment_code, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
    )
    .bind(
      newId("ltr"),
      village.id,
      service.id,
      ticket,
      viewer.userId,
      applicantName,
      contact || null,
      JSON.stringify(payload),
      fee,
      // A free letter has nothing to reconcile, so it carries no code at all
      // rather than a code that means nothing.
      fee > 0 ? newPaymentCode() : null,
      fee > 0 ? "unpaid" : "waived",
    )
    .run();

  // The audit entry deliberately records the ticket only. Applicant name and
  // contact stay out of the log, which has a longer retention than the request.
  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "create",
    resource: "letter_requests",
    summary: `Pengajuan surat ${ticket} (${service.name})`,
    ipHash,
  });

  redirect(`${base}?ticket=${ticket}`);
}

/* -------------------------------------------------------------------------- */
/* Field rendering                                                             */
/* -------------------------------------------------------------------------- */

function FormField({ field }: { field: ServiceField }) {
  const id = `f_${field.name}`;
  const shared = {
    id,
    name: field.name,
    required: field.required,
    className: FIELD_CLASS,
    placeholder: field.placeholder,
    maxLength: field.maxLength ?? 500,
  };

  return (
    <Field
      label={field.label}
      htmlFor={id}
      hint={field.hint}
      required={field.required}
    >
      {field.type === "textarea" ? (
        <textarea {...shared} rows={4} />
      ) : field.type === "select" ? (
        <select id={id} name={field.name} required={field.required} className={FIELD_CLASS}>
          <option value="">Pilih…</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...shared}
          type={
            field.type === "number"
              ? "text"
              : field.type === "date"
                ? "date"
                : field.type
          }
          inputMode={field.type === "number" ? "numeric" : undefined}
        />
      )}
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const ERRORS: Record<string, string> = {
  rate: "Terlalu banyak pengajuan dari perangkat ini. Coba lagi dalam beberapa menit.",
  validasi: "Beberapa isian belum benar. Periksa kembali formulir di bawah.",
  login: "Layanan ini hanya untuk warga yang sudah masuk ke akun.",
};

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string; error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  if (!shouldRender(modules.get("pelayanan-online"), { viewer })) notFound();

  const service = await getService(village.id, slug);
  if (!service) notFound();

  const fields = [...BASE_FIELDS, ...parseFormSchema(service.form_schema)];
  const trackingEnabled = shouldRender(modules.get("tracking-surat"), { viewer });
  const needsLogin = Boolean(service.requires_login) && !viewer.userId;

  return (
    <SiteShell>
      <PageHeader
        tone="brand"
        eyebrow="Layanan Surat"
        title={service.name}
        description={service.description}
        breadcrumb={[
          { label: "Beranda", href: "/" },
          { label: "Layanan", href: "/layanan" },
          { label: service.name, href: `/layanan/${service.slug}` },
        ]}
      />

      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          <div className="min-w-0">
            {query.ticket ? (
              <div className="mb-8">
                <Notice
                  tone="success"
                  title="Pengajuan Anda berhasil dikirim."
                >
                  <p>
                    Simpan nomor tiket ini untuk memantau statusnya:
                  </p>
                  <p className="mt-3 inline-block rounded-lg border border-current/20 bg-[var(--surface)] px-4 py-2 font-display text-lg font-bold tracking-wider text-[var(--text)]">
                    {query.ticket}
                  </p>
                  {trackingEnabled ? (
                    <p className="mt-3">
                      <Link
                        href={`/layanan/lacak?ticket=${encodeURIComponent(query.ticket)}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        Lacak status pengajuan
                      </Link>
                    </p>
                  ) : null}
                </Notice>
              </div>
            ) : null}

            {query.error && ERRORS[query.error] ? (
              <div className="mb-8">
                <Notice tone="error" title={ERRORS[query.error]} />
              </div>
            ) : null}

            {service.requirements ? (
              <section className="mb-10">
                <h2 className="font-display text-lg font-bold">
                  Persyaratan
                </h2>
                <div
                  className="prose-cms mt-3 text-[0.9375rem]"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(service.requirements),
                  }}
                />
              </section>
            ) : null}

            <section id="form">
              <h2 className="font-display text-lg font-bold">
                Formulir Pengajuan
              </h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                Data yang Anda isi hanya dapat dilihat petugas desa dan tidak
                pernah ditampilkan di halaman publik.
              </p>

              {needsLogin ? (
                <div className="mt-6">
                  <Notice
                    tone="info"
                    title="Layanan ini memerlukan akun warga."
                  >
                    <p className="mt-2">
                      Masuk terlebih dahulu untuk mengajukan{" "}
                      {service.name.toLowerCase()}.
                    </p>
                    <ButtonLink
                      href="/admin/login"
                      size="sm"
                      className="mt-4"
                    >
                      Masuk
                      <IconArrowRight className="h-4 w-4" />
                    </ButtonLink>
                  </Notice>
                </div>
              ) : (
                <Card className="mt-6 p-6">
                  <form action={submitRequest} className="space-y-5">
                    <input type="hidden" name="__slug" value={service.slug} />
                    {fields.map((field) => (
                      <FormField key={field.name} field={field} />
                    ))}

                    <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-5">
                      <Button type="submit" size="lg">
                        Kirim Pengajuan
                        <IconArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="text-xs text-[var(--text-muted)]">
                        Anda akan menerima nomor tiket setelah mengirim.
                      </p>
                    </div>
                  </form>
                </Card>
              )}
            </section>
          </div>

          {/* Summary rail */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Card tone="raised" className="p-6">
              <h2 className="font-display font-bold">Ringkasan Layanan</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <dt className="text-[var(--text-muted)]">Estimasi selesai</dt>
                    <dd className="font-semibold">
                      {service.sla_days} hari kerja
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconWallet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <dt className="text-[var(--text-muted)]">Biaya</dt>
                    <dd className="font-semibold">
                      {service.fee > 0 ? formatCurrency(service.fee) : "Gratis"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IconDocument className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <dt className="text-[var(--text-muted)]">Isian formulir</dt>
                    <dd className="font-semibold">{fields.length} kolom</dd>
                  </div>
                </div>
              </dl>

              {service.requires_login ? (
                <p className="mt-5 border-t border-[var(--border)] pt-4">
                  <Badge tone="info">Perlu akun warga</Badge>
                </p>
              ) : (
                <p className="mt-5 border-t border-[var(--border)] pt-4">
                  <Badge tone="success">
                    <IconCheck className="h-3 w-3" />
                    Tanpa akun
                  </Badge>
                </p>
              )}
            </Card>

            {trackingEnabled ? (
              <Card className="mt-4 p-6">
                <p className="text-sm font-semibold">Sudah pernah mengajukan?</p>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  Pantau statusnya dengan nomor tiket.
                </p>
                <ButtonLink
                  href="/layanan/lacak"
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                >
                  Lacak Surat
                </ButtonLink>
              </Card>
            ) : null}
          </aside>
        </div>
      </Container>
    </SiteShell>
  );
}
