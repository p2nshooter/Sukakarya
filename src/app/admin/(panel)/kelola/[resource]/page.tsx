import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Metadata } from "next";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { formatCurrency, formatNumber, stripHtml, truncate } from "@/lib/format";
import { requireVillage } from "@/lib/village";
import {
  createRow,
  deleteRow,
  getRow,
  listRows,
  updateRow,
} from "@/lib/admin/crud";
import { findResource, type ResourceField } from "@/lib/admin/resource";

import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  FIELD_CLASS,
  Notice,
} from "@/components/ui";
import { IconArrowRight, IconDocument } from "@/components/icons";
import { MediaPicker } from "@/components/admin/media-picker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ resource: string }>;
}): Promise<Metadata> {
  const { resource } = await params;
  const def = findResource(resource);
  return { title: def ? def.label : "Kelola" };
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One action serves create and update for every resource.
 *
 * The resource key arrives in the form body, so it is re-resolved and
 * re-authorised here rather than trusted from the page that rendered the form -
 * a server action is a public endpoint, and the caller chooses what to post.
 */
async function saveAction(formData: FormData) {
  "use server";

  const key = String(formData.get("__resource") ?? "");
  const id = String(formData.get("__id") ?? "");

  const def = findResource(key);
  if (!def) notFound();

  const viewer = await getViewer();
  if (!canAccess(viewer, def.level)) redirect("/admin/login");

  const village = await requireVillage();
  const base = `/admin/kelola/${def.key}`;

  const result = id
    ? await updateRow(def, village.id, viewer.userId, id, formData)
    : await createRow(def, village.id, viewer.userId, formData);

  if (!result.ok) {
    const message = result.errors[0]?.message ?? "Gagal menyimpan.";
    redirect(`${base}?${id ? `edit=${id}&` : "new=1&"}error=${encodeURIComponent(message)}`);
  }

  for (const path of def.revalidate ?? []) revalidatePath(path);
  revalidatePath(base);
  redirect(`${base}?ok=1`);
}

async function deleteAction(formData: FormData) {
  "use server";

  const key = String(formData.get("__resource") ?? "");
  const id = String(formData.get("__id") ?? "");

  const def = findResource(key);
  if (!def || !id) notFound();

  const viewer = await getViewer();
  if (!canAccess(viewer, def.level)) redirect("/admin/login");

  const village = await requireVillage();
  await deleteRow(def, village.id, viewer.userId, id);

  for (const path of def.revalidate ?? []) revalidatePath(path);
  revalidatePath(`/admin/kelola/${def.key}`);
  redirect(`/admin/kelola/${def.key}?deleted=1`);
}

/* -------------------------------------------------------------------------- */
/* Field rendering                                                             */
/* -------------------------------------------------------------------------- */

function FormControl({
  field,
  value,
}: {
  field: ResourceField;
  value: unknown;
}) {
  const id = `f_${field.name}`;
  const current =
    value === null || value === undefined ? (field.default ?? "") : value;

  if (field.kind === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3.5 py-3">
        <input
          id={id}
          name={field.name}
          type="checkbox"
          defaultChecked={Number(current) === 1}
          className="h-4 w-4 accent-[var(--color-brand)]"
        />
        <span className="text-sm font-medium">{field.label}</span>
        {field.hint ? (
          <span className="ml-auto text-xs text-[var(--text-muted)]">
            {field.hint}
          </span>
        ) : null}
      </label>
    );
  }

  // The label already carries an asterisk; marking the control itself lets the
  // browser say so before a round-trip to the server and a red banner.
  const control =
    field.kind === "media" ? (
      <MediaPicker name={field.name} defaultValue={String(current ?? "")} />
    ) : field.kind === "textarea" || field.kind === "html" ? (
      <textarea
        id={id}
        name={field.name}
        rows={field.kind === "html" ? 10 : 3}
        defaultValue={String(current ?? "")}
        maxLength={field.maxLength ?? 40000}
        required={field.required}
        className={`${FIELD_CLASS} ${field.kind === "html" ? "font-mono text-[0.8125rem]" : ""}`}
        placeholder={field.placeholder}
      />
    ) : field.kind === "select" ? (
      <select
        id={id}
        name={field.name}
        defaultValue={String(current ?? "")}
        className={FIELD_CLASS}
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        id={id}
        name={field.name}
        type={field.kind === "date" ? "date" : "text"}
        inputMode={
          field.kind === "number" || field.kind === "currency"
            ? "numeric"
            : undefined
        }
        defaultValue={
          field.kind === "date"
            ? String(current ?? "").slice(0, 10)
            : String(current ?? "")
        }
        maxLength={field.maxLength ?? 500}
        placeholder={field.placeholder}
        required={field.required}
        className={FIELD_CLASS}
      />
    );

  return (
    <Field
      label={field.label}
      htmlFor={id}
      hint={
        field.kind === "html"
          ? (field.hint ?? "HTML sederhana. Tag berbahaya dibuang saat disimpan.")
          : field.hint
      }
      required={field.required}
    >
      {control}
    </Field>
  );
}

/** Compact rendering of a value for the list table. */
function cell(field: ResourceField, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[var(--text-subtle)]">—</span>;
  }
  if (field.kind === "boolean") {
    return Number(value) === 1 ? (
      <Badge tone="success">Ya</Badge>
    ) : (
      <Badge tone="neutral">Tidak</Badge>
    );
  }
  if (field.kind === "currency") return formatCurrency(Number(value));
  if (field.kind === "number") return formatNumber(Number(value));
  if (field.kind === "select") {
    const option = field.options?.find((o) => o.value === String(value));
    const label = option?.label ?? String(value);
    if (field.name === "status") {
      return (
        <Badge tone={value === "published" ? "success" : "neutral"}>{label}</Badge>
      );
    }
    return label;
  }
  if (field.kind === "html") return truncate(stripHtml(String(value)), 60);
  if (field.kind === "date") return String(value).slice(0, 10);
  return truncate(String(value), 60);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default async function ManageResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{
    new?: string;
    edit?: string;
    ok?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { resource } = await params;
  const query = await searchParams;

  const def = findResource(resource);
  if (!def) notFound();

  const viewer = await getViewer();
  if (!canAccess(viewer, def.level)) redirect("/admin/login");

  const village = await requireVillage();

  const editing = query.edit ? await getRow(def, village.id, query.edit) : null;
  if (query.edit && !editing) notFound();

  const showForm = Boolean(query.new || editing);
  const rows = showForm ? [] : await listRows(def, village.id);

  const listFields = def.fields.filter((f) => f.inList);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold">{def.label}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {def.description}
          </p>
        </div>
        {!showForm ? (
          <ButtonLink href={`/admin/kelola/${def.key}?new=1`}>
            Tambah {def.singular}
          </ButtonLink>
        ) : (
          <ButtonLink href={`/admin/kelola/${def.key}`} variant="secondary">
            Kembali ke daftar
          </ButtonLink>
        )}
      </div>

      {query.ok ? (
        <div className="mt-5">
          <Notice tone="success" title="Tersimpan." />
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mt-5">
          <Notice tone="success" title="Data dihapus." />
        </div>
      ) : null}
      {query.error ? (
        <div className="mt-5">
          <Notice tone="error" title={query.error} />
        </div>
      ) : null}

      {showForm ? (
        <Card className="mt-6 p-6">
          <form action={saveAction} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="__resource" value={def.key} />
            {editing ? (
              <input type="hidden" name="__id" value={String(editing.id)} />
            ) : null}

            {def.fields.map((field) => (
              <div
                key={field.name}
                className={field.span === 2 ? "sm:col-span-2" : ""}
              >
                <FormControl field={field} value={editing?.[field.name]} />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5 sm:col-span-2">
              <Button type="submit" size="lg">
                Simpan
                <IconArrowRight className="h-4 w-4" />
              </Button>
              <ButtonLink
                href={`/admin/kelola/${def.key}`}
                variant="ghost"
                size="lg"
              >
                Batal
              </ButtonLink>
            </div>
          </form>
        </Card>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={`Belum ada ${def.singular}.`}
            hint={def.description}
            action={
              <ButtonLink href={`/admin/kelola/${def.key}?new=1`}>
                Tambah {def.singular}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-1)] text-left">
                {listFields.map((field) => (
                  <th key={field.name} className="px-4 py-3 font-semibold">
                    {field.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-1)]"
                >
                  {listFields.map((field) => (
                    <td key={field.name} className="px-4 py-3 align-top">
                      {cell(field, row[field.name])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right align-top">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/admin/kelola/${def.key}?edit=${String(row.id)}`}
                        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-brand hover:bg-brand/10"
                      >
                        Ubah
                      </Link>
                      <form action={deleteAction} className="inline">
                        <input type="hidden" name="__resource" value={def.key} />
                        <input type="hidden" name="__id" value={String(row.id)} />
                        <button
                          type="submit"
                          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          Hapus
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!showForm && rows.length > 0 ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <IconDocument className="h-3.5 w-3.5" />
          {rows.length} baris. Setiap perubahan tercatat di Audit Log.
        </p>
      ) : null}
    </div>
  );
}
