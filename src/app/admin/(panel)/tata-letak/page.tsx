import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { newId } from "@/lib/id";
import { getVillageModules } from "@/lib/modules/registry";
import { getPageSectionsForAdmin } from "@/lib/page-builder";
import { requireVillage } from "@/lib/village";

import { hasRenderer } from "@/components/sections/registry";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SLUG = "home";

async function addSection(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) redirect("/admin/login");

  const village = await requireVillage();
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!moduleId) return;

  // Only modules that actually have a renderer can be placed on a page.
  if (!hasRenderer(moduleId)) return;

  const row = await getDb()
    .prepare(
      "SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM page_sections WHERE village_id = ? AND page_slug = ?",
    )
    .bind(village.id, PAGE_SLUG)
    .first<{ max_sort: number }>();

  const id = newId("sec");
  await getDb()
    .prepare(
      `INSERT INTO page_sections (id, village_id, page_slug, module_id, title,
                                  subtitle, variant, config, visible, sort_order,
                                  updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'default', '{}', 1, ?, ?)`,
    )
    .bind(
      id,
      village.id,
      PAGE_SLUG,
      moduleId,
      String(formData.get("title") ?? "").trim() || null,
      String(formData.get("subtitle") ?? "").trim() || null,
      (row?.max_sort ?? 0) + 10,
      new Date().toISOString(),
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "create",
    resource: "page_sections",
    resourceId: id,
    summary: `Tambah section ${moduleId} ke ${PAGE_SLUG}`,
  });

  revalidatePath("/admin/tata-letak");
  revalidatePath("/");
}

async function updateSection(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getDb()
    .prepare(
      `UPDATE page_sections
       SET title = ?, subtitle = ?, visible = ?, sort_order = ?, updated_at = ?
       WHERE id = ? AND village_id = ?`,
    )
    .bind(
      String(formData.get("title") ?? "").trim() || null,
      String(formData.get("subtitle") ?? "").trim() || null,
      formData.get("visible") === "on" ? 1 : 0,
      Number(formData.get("sortOrder") ?? 0) || 0,
      new Date().toISOString(),
      id,
      village.id,
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "page_sections",
    resourceId: id,
  });

  revalidatePath("/admin/tata-letak");
  revalidatePath("/");
}

/**
 * Deleting is its own action rather than an `intent` branch inside the update.
 *
 * It used to be one form with two submit buttons, the second carrying
 * `name="intent" value="delete"`. A browser sends the submitter's name and
 * value with a native submission, but a server action form does not: the value
 * never arrived, `intent` was always null, and every press of Hapus fell
 * through to the update branch and silently saved the row it was meant to
 * remove. Nothing errored, so the only symptom was a section that would not go
 * away.
 */
async function deleteSection(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getDb()
    .prepare("DELETE FROM page_sections WHERE id = ? AND village_id = ?")
    .bind(id, village.id)
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "delete",
    resource: "page_sections",
    resourceId: id,
  });

  revalidatePath("/admin/tata-letak");
  revalidatePath("/");
}

export default async function AdminLayoutPage() {
  const village = await requireVillage();
  const [sections, modules] = await Promise.all([
    getPageSectionsForAdmin(village.id, PAGE_SLUG),
    getVillageModules(village.id),
  ]);

  const placeable = [...modules.values()]
    .filter((m) => hasRenderer(m.id))
    .sort((a, b) => a.code - b.code);

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Tata Letak Beranda</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Beranda dirakit dari daftar di bawah. Urutan, judul dan visibilitas
        tersimpan di basis data — tidak ada susunan yang dikunci di dalam kode.
      </p>

      <section className="mt-7 rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold">Tambah section</h2>
        <form action={addSection} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="moduleId" className="block text-sm font-medium">
              Modul
            </label>
            <select
              id="moduleId"
              name="moduleId"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              {placeable.map((module) => (
                <option key={module.id} value={module.id}>
                  {String(module.code).padStart(3, "0")} — {module.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="section-title" className="block text-sm font-medium">
              Judul (opsional)
            </label>
            <input
              id="section-title"
              name="title"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="section-subtitle" className="block text-sm font-medium">
              Subjudul (opsional)
            </label>
            <input
              id="section-subtitle"
              name="subtitle"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Tambah
            </button>
          </div>
        </form>
      </section>

      <h2 className="mt-10 text-lg font-semibold">
        Susunan saat ini ({sections.length})
      </h2>

      {sections.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Beranda masih kosong." hint="Tambahkan section di atas." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sections.map((section) => {
            const module = modules.get(section.moduleId);
            return (
              <li
                key={section.id}
                className="rounded-xl border border-[var(--border)] p-4"
              >
                {/* Sibling of the update form, not a child: forms cannot nest.
                    The Hapus button below reaches it by id, so it can sit in
                    the same row of controls while belonging to this one. */}
                <form id={`hapus-${section.id}`} action={deleteSection} className="hidden">
                  <input type="hidden" name="id" value={section.id} />
                </form>

                <form action={updateSection} className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto_auto]">
                  <input type="hidden" name="id" value={section.id} />

                  <div>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {module?.name ?? section.moduleId}
                      {module && !module.visible ? " · modul disembunyikan" : ""}
                      {module && !module.enabled ? " · modul nonaktif" : ""}
                    </span>
                    <input
                      name="title"
                      defaultValue={section.title ?? ""}
                      placeholder="Judul section"
                      aria-label={`Judul section ${module?.name ?? section.moduleId}`}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </div>

                  <input
                    name="subtitle"
                    defaultValue={section.subtitle ?? ""}
                    placeholder="Subjudul"
                    aria-label={`Subjudul section ${module?.name ?? section.moduleId}`}
                    className="self-end rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />

                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={section.sortOrder}
                    aria-label="Urutan"
                    className="self-end rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />

                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={section.visible}
                    />
                    Tampil
                  </label>

                  <div className="flex items-end gap-2">
                    <button
                      type="submit"
                      className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium hover:border-brand hover:text-brand"
                    >
                      Simpan
                    </button>
                    <button
                      type="submit"
                      form={`hapus-${section.id}`}
                      className="rounded-md border border-[var(--border)] px-3 py-2 text-xs font-medium text-red-600 hover:border-red-500"
                    >
                      Hapus
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
