import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import { canAccess } from "@/lib/access";
import { getViewer, SESSION_COOKIE, destroySession } from "@/lib/auth";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", level: "staff" as const },
  { href: "/admin/berita", label: "Berita & Artikel", level: "staff" as const },
  { href: "/admin/media", label: "Media", level: "staff" as const },
  { href: "/admin/tata-letak", label: "Tata Letak", level: "admin" as const },
  { href: "/admin/modul", label: "Modul", level: "admin" as const },
  { href: "/admin/pengaduan", label: "Pengaduan", level: "staff" as const },
  { href: "/admin/surat", label: "Pengajuan Surat", level: "staff" as const },
  { href: "/admin/audit", label: "Audit Log", level: "admin" as const },
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
  const items = NAV.filter((item) => canAccess(viewer, item.level));

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-[var(--border)] bg-[var(--surface-muted)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Panel Admin
          </p>
          <p className="mt-1 font-bold leading-tight">
            {village.entityLabel} {village.name}
          </p>
        </div>

        <nav aria-label="Navigasi admin" className="px-3 pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--surface)]"
            >
              {item.label}
            </Link>
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
