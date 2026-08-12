import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import { canAccess, type AccessLevel } from "@/lib/access";
import { RESOURCES } from "@/lib/admin/resource";
import { getViewer, SESSION_COOKIE, destroySession } from "@/lib/auth";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Grouped so the sidebar stays readable now that every content table has a
// screen. The declarative resources come from one list, so adding a resource
// adds its nav entry automatically.
const NAV_GROUPS: {
  heading: string;
  items: { href: string; label: string; level: AccessLevel }[];
}[] = [
  {
    heading: "Ringkasan",
    items: [{ href: "/admin", label: "Dashboard", level: "staff" }],
  },
  {
    heading: "Konten",
    items: [
      { href: "/admin/berita", label: "Berita & Artikel", level: "staff" },
      ...RESOURCES.filter((r) =>
        ["agenda", "galeri", "unduhan", "faq"].includes(r.key),
      ).map((r) => ({
        href: `/admin/kelola/${r.key}`,
        label: r.label,
        level: r.level,
      })),
      { href: "/admin/media", label: "Media", level: "staff" as AccessLevel },
    ],
  },
  {
    heading: "Profil Desa",
    items: RESOURCES.filter((r) =>
      ["perangkat", "potensi", "statistik", "apbdes"].includes(r.key),
    ).map((r) => ({
      href: `/admin/kelola/${r.key}`,
      label: r.label,
      level: r.level,
    })),
  },
  {
    heading: "Ekonomi & Wisata",
    items: RESOURCES.filter((r) => ["umkm", "wisata"].includes(r.key)).map(
      (r) => ({ href: `/admin/kelola/${r.key}`, label: r.label, level: r.level }),
    ),
  },
  {
    heading: "Pelayanan",
    items: [
      { href: "/admin/surat", label: "Pengajuan Surat", level: "staff" },
      ...RESOURCES.filter((r) => r.key === "layanan").map((r) => ({
        href: `/admin/kelola/${r.key}`,
        label: r.label,
        level: r.level,
      })),
      { href: "/admin/pengaduan", label: "Pengaduan", level: "staff" as AccessLevel },
    ],
  },
  {
    heading: "Tampilan",
    items: [
      ...RESOURCES.filter((r) => r.key === "banner").map((r) => ({
        href: `/admin/kelola/${r.key}`,
        label: r.label,
        level: r.level,
      })),
      { href: "/admin/pengaturan", label: "Pengaturan Desa", level: "admin" as AccessLevel },
      { href: "/admin/tata-letak", label: "Tata Letak", level: "admin" as AccessLevel },
      { href: "/admin/modul", label: "Modul", level: "admin" as AccessLevel },
    ],
  },
  {
    heading: "Sistem",
    items: [{ href: "/admin/audit", label: "Audit Log", level: "admin" }],
  },
];

async function signOut() {
  "use server";

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  // The login page renders its own shell; every other admin route requires
  // at least staff access.
  if (!canAccess(viewer, "staff")) {
    redirect("/admin/login");
  }

  const village = await requireVillage();

  // Groups with nothing the viewer may reach are dropped entirely, so an
  // operator never sees a heading sitting over an empty list.
  const groups = NAV_GROUPS.map((group) => ({
    heading: group.heading,
    items: group.items.filter((item) => canAccess(viewer, item.level)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-[var(--border)] bg-[var(--surface-1)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Panel Admin
          </p>
          <p className="mt-1 font-bold leading-tight">
            {village.entityLabel} {village.name}
          </p>
        </div>

        <nav
          aria-label="Navigasi admin"
          className="max-h-[55vh] overflow-y-auto px-3 pb-4 lg:max-h-none"
        >
          {groups.map((group) => (
            <div key={group.heading} className="mb-4 last:mb-0">
              <p className="px-3 pb-1.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                {group.heading}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--surface)]"
          >
            ← Lihat situs
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-[var(--surface)]"
            >
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[var(--surface)]">{children}</main>
    </div>
  );
}
