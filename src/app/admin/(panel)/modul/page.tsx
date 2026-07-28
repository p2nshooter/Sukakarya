import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ACCESS_LEVEL_OPTIONS,
  DEVICE_OPTIONS,
  canAccess,
  isAccessLevel,
  isDevice,
} from "@/lib/access";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { getVillageModules } from "@/lib/modules/registry";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Writes a per-village override for one module.
 *
 * Uses an upsert so a village that has never touched a module (and therefore
 * inherits the catalogue default) gets its first row created here.
 */
async function saveModule(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "admin")) redirect("/admin/login");

  const village = await requireVillage();
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!moduleId) return;

  const enabled = formData.get("enabled") === "on" ? 1 : 0;
  const visible = formData.get("visible") === "on" ? 1 : 0;
  const accessLevel = String(formData.get("accessLevel") ?? "public");
  const device = String(formData.get("device") ?? "all");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;

  if (!isAccessLevel(accessLevel) || !isDevice(device)) return;

  await getDb()
    .prepare(
      `INSERT INTO module_settings
         (village_id, module_id, enabled, visible, access_level, device,
          sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (village_id, module_id) DO UPDATE SET
         enabled = excluded.enabled,
         visible = excluded.visible,
         access_level = excluded.access_level,
         device = excluded.device,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at`,
    )
    .bind(
      village.id,
      moduleId,
      enabled,
      visible,
      accessLevel,
      device,
      sortOrder,
      new Date().toISOString(),
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "module_settings",
    resourceId: moduleId,
    summary: `enabled=${enabled} visible=${visible} access=${accessLevel} device=${device}`,
  });

  revalidatePath("/admin/modul");
  revalidatePath("/");
}

export default async function AdminModulesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; q?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const modules = await getVillageModules(village.id);

  const all = [...modules.values()].sort((a, b) => a.code - b.code);
  const categories = [...new Set(all.map((m) => m.category))].sort();

  const query = (params.q ?? "").trim().toLowerCase();
  const filtered = all.filter((m) => {
    if (params.kategori && m.category !== params.kategori) return false;
    if (query && !m.name.toLowerCase().includes(query) && !m.id.includes(query)) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Modul</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {all.length} modul terpasang. Setiap modul dapat dinyalakan, disembunyikan,
        dibatasi per level akses maupun per perangkat — tanpa deploy ulang.
      </p>

      <form className="mt-6 flex flex-wrap gap-3" role="search">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Cari modul…"
          aria-label="Cari modul"
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <select
          name="kategori"
          defaultValue={params.kategori ?? ""}
          aria-label="Filter kategori"
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Terapkan
        </button>
      </form>

      <p className="mt-4 text-sm text-[var(--text-muted)]">
        Menampilkan {filtered.length} modul.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[54rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Modul</th>
              <th className="px-3 py-2 font-semibold">Aktif</th>
              <th className="px-3 py-2 font-semibold">Tampil</th>
              <th className="px-3 py-2 font-semibold">Akses</th>
              <th className="px-3 py-2 font-semibold">Perangkat</th>
              <th className="px-3 py-2 font-semibold">Urutan</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((module) => (
              <tr key={module.id} className="border-b border-[var(--border)]">
                <td className="px-3 py-2 text-[var(--text-muted)]">
                  {String(module.code).padStart(3, "0")}
                </td>
                <td className="px-3 py-2">
                  <form
                    id={`form-${module.id}`}
                    action={saveModule}
                    className="contents"
                  >
                    <input type="hidden" name="moduleId" value={module.id} />
                  </form>
                  <span className="font-medium">{module.name}</span>
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {module.category} · {module.placement}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    form={`form-${module.id}`}
                    type="checkbox"
                    name="enabled"
                    defaultChecked={module.enabled}
                    aria-label={`Aktifkan ${module.name}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    form={`form-${module.id}`}
                    type="checkbox"
                    name="visible"
                    defaultChecked={module.visible}
                    aria-label={`Tampilkan ${module.name}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    form={`form-${module.id}`}
                    name="accessLevel"
                    defaultValue={module.accessLevel}
                    aria-label={`Level akses ${module.name}`}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                  >
                    {ACCESS_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    form={`form-${module.id}`}
                    name="device"
                    defaultValue={module.device}
                    aria-label={`Perangkat ${module.name}`}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                  >
                    {DEVICE_OPTIONS.map((device) => (
                      <option key={device} value={device}>
                        {device}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    form={`form-${module.id}`}
                    type="number"
                    name="sortOrder"
                    defaultValue={module.sortOrder}
                    aria-label={`Urutan ${module.name}`}
                    className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    form={`form-${module.id}`}
                    type="submit"
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium hover:border-brand hover:text-brand"
                  >
                    Simpan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
