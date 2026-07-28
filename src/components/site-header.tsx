import Link from "next/link";

import type { Viewer } from "@/lib/access";
import { mediaUrl } from "@/lib/media";
import type { ResolvedModule } from "@/lib/modules/registry";
import { shouldRender } from "@/lib/modules/registry";
import { filterNav, type NavItem } from "@/lib/navigation";
import type { Village } from "@/lib/village";
import type { Banner } from "@/lib/content";

import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";

interface SiteHeaderProps {
  village: Village;
  viewer: Viewer;
  modules: Map<string, ResolvedModule>;
  nav: NavItem[];
  runningText: string[];
  emergency: Banner[];
}

export function SiteHeader({
  village,
  viewer,
  modules,
  nav,
  runningText,
  emergency,
}: SiteHeaderProps) {
  const ctx = { viewer };
  const show = (id: string) => shouldRender(modules.get(id), ctx);

  const items = filterNav(nav, viewer, show);
  const logo = mediaUrl(village.logoMediaId);
  const region = [village.district, village.regency].filter(Boolean).join(", ");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      {show("emergency-alert") &&
        emergency.map((banner) => (
          <div
            key={banner.id}
            role="alert"
            className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white"
          >
            {banner.title}
            {banner.linkUrl ? (
              <Link href={banner.linkUrl} className="ml-2 underline">
                {banner.linkLabel ?? "Selengkapnya"}
              </Link>
            ) : null}
          </div>
        ))}

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {show("logo-desa") && logo ? (
            <img
              src={logo}
              alt={`Logo ${village.entityLabel} ${village.name}`}
              className="h-11 w-11 shrink-0 object-contain"
              width={44}
              height={44}
            />
          ) : (
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-white"
            >
              {village.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight">
              {village.entityLabel} {village.name}
            </span>
            {region ? (
              <span className="block truncate text-xs text-[var(--text-muted)]">
                {region}
              </span>
            ) : null}
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <Link
                href={item.url}
                target={item.target}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                {item.label}
                {item.children.length > 0 ? (
                  <span aria-hidden className="ml-1 text-[10px]">
                    ▾
                  </span>
                ) : null}
              </Link>

              {item.children.length > 0 ? (
                <div className="invisible absolute left-0 top-full z-50 min-w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.url}
                      target={child.target}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          {show("search") ? (
            <form action="/cari" role="search" className="hidden md:block">
              <label htmlFor="q" className="sr-only">
                Cari
              </label>
              <input
                id="q"
                name="q"
                type="search"
                placeholder="Cari…"
                className="w-40 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm outline-none focus:w-56"
              />
            </form>
          ) : null}

          {show("dark-mode") ? <ThemeToggle /> : null}

          <MobileNav items={items} />
        </div>
      </div>

      {show("running-text") && runningText.length > 0 ? (
        <div className="overflow-hidden border-t border-[var(--border)] bg-brand text-white">
          <div className="marquee-track whitespace-nowrap py-1.5 text-sm">
            {[0, 1].map((pass) => (
              <span key={pass} aria-hidden={pass === 1}>
                {runningText.map((text, i) => (
                  <span key={i} className="mx-6">
                    {text}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
