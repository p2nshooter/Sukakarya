import Link from "next/link";

import type { Viewer } from "@/lib/access";
import { mediaUrl } from "@/lib/media";
import type { ResolvedModule } from "@/lib/modules/registry";
import { shouldRender } from "@/lib/modules/registry";
import { filterNav, type NavItem } from "@/lib/navigation";
import type { Village } from "@/lib/village";
import type { Banner } from "@/lib/content";

import { Container } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderSearch } from "@/components/header-search";
import {
  IconAlert,
  IconChevronDown,
  IconClock,
  IconMail,
  IconPhone,
  IconPin,
} from "@/components/icons";

interface SiteHeaderProps {
  village: Village;
  viewer: Viewer;
  modules: Map<string, ResolvedModule>;
  nav: NavItem[];
  runningText: string[];
  emergency: Banner[];
  /** From village_settings; the office hours line in the utility strip. */
  officeHours?: string | null;
}

export function SiteHeader({
  village,
  viewer,
  modules,
  nav,
  runningText,
  emergency,
  officeHours,
}: SiteHeaderProps) {
  const ctx = { viewer };
  const show = (id: string) => shouldRender(modules.get(id), ctx);

  const items = filterNav(nav, viewer, show);
  const logo = mediaUrl(village.logoMediaId);
  const region = [village.district, village.regency].filter(Boolean).join(", ");

  return (
    <>
      {/* Emergency banners sit above everything and do not scroll away with
          the sticky header - an alert that scrolls off is not an alert. */}
      {show("emergency-alert") && emergency.length > 0 ? (
        <div className="relative z-50">
          {emergency.map((banner) => (
            <div
              key={banner.id}
              role="alert"
              className="bg-red-600 text-white"
            >
              <Container className="flex items-center justify-center gap-2.5 py-2 text-center text-sm font-medium">
                <IconAlert className="h-4 w-4 shrink-0" />
                <span>{banner.title}</span>
                {banner.linkUrl ? (
                  <Link
                    href={banner.linkUrl}
                    className="shrink-0 font-semibold underline underline-offset-2"
                  >
                    {banner.linkLabel ?? "Selengkapnya"}
                  </Link>
                ) : null}
              </Container>
            </div>
          ))}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-[var(--border)]">
        {/* Utility strip: the details a citizen looks for before anything else -
            where the office is, when it is open, how to reach it. Desktop only;
            on a phone these live in the footer instead of eating the viewport. */}
        <div className="hidden bg-brand-800 text-white/75 lg:block">
          <Container className="flex items-center justify-between gap-6 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-5">
              {village.address ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <IconPin className="h-3.5 w-3.5 shrink-0 text-brand-accent" />
                  <span className="truncate">{village.address}</span>
                </span>
              ) : null}
              {officeHours ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <IconClock className="h-3.5 w-3.5 text-brand-accent" />
                  {officeHours}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-5">
              {village.phone ? (
                <a
                  href={`tel:${village.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 py-1 transition-colors hover:text-white"
                >
                  <IconPhone className="h-3.5 w-3.5 text-brand-accent" />
                  {village.phone}
                </a>
              ) : null}
              {show("email") && village.email ? (
                <a
                  href={`mailto:${village.email}`}
                  className="flex items-center gap-1.5 py-1 transition-colors hover:text-white"
                >
                  <IconMail className="h-3.5 w-3.5 text-brand-accent" />
                  {village.email}
                </a>
              ) : null}
            </div>
          </Container>
        </div>

        {/* Main bar */}
        <div className="glass">
          <Container className="flex items-center gap-4 py-3">
            <Link
              href="/"
              className="group flex min-w-0 items-center gap-3"
              aria-label={`Beranda ${village.entityLabel} ${village.name}`}
            >
              {show("logo-desa") && logo ? (
                <img
                  src={logo}
                  alt=""
                  className="h-11 w-11 shrink-0 object-contain"
                  width={44}
                  height={44}
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-lg font-bold text-[var(--text-on-brand)] shadow-[var(--shadow-brand)]"
                >
                  {village.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-display text-[0.95rem] font-bold leading-tight tracking-tight">
                  {village.entityLabel} {village.name}
                </span>
                {region ? (
                  <span className="block truncate text-[0.6875rem] uppercase tracking-wider text-[var(--text-muted)]">
                    {region}
                  </span>
                ) : null}
              </span>
            </Link>

            <nav
              aria-label="Navigasi utama"
              className="ml-auto hidden items-center lg:flex"
            >
              {items.map((item) => (
                <div key={item.id} className="group relative">
                  <Link
                    href={item.url}
                    target={item.target}
                    className="nav-link inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
                  >
                    {item.label}
                    {item.children.length > 0 ? (
                      <IconChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:rotate-180" />
                    ) : null}
                  </Link>

                  {item.children.length > 0 ? (
                    <div className="nav-menu invisible absolute left-0 top-full z-50 pt-2 opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <div className="min-w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-xl)]">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.url}
                            target={child.target}
                            className="block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-2)]"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1.5 lg:ml-3">
              {show("search") ? <HeaderSearch /> : null}
              {show("dark-mode") ? <ThemeToggle /> : null}

              {show("pelayanan-online") ? (
                <Link
                  href="/layanan"
                  // `whitespace-nowrap`: the button is the last thing in the
                  // row, so it is the first to be squeezed, and without this it
                  // breaks into "Ajukan / Surat" and grows the whole header a
                  // line taller.
                  className="ml-1 hidden whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-brand)] transition-colors hover:bg-brand-600 xl:inline-flex"
                >
                  Ajukan Surat
                </Link>
              ) : null}

              <MobileNav items={items} village={village} />
            </div>
          </Container>
        </div>

        {show("running-text") && runningText.length > 0 ? (
          <div className="marquee-host overflow-hidden border-t border-black/10 bg-brand text-[var(--text-on-brand)]">
            <div className="flex items-center">
              <span className="z-10 shrink-0 bg-brand-700 px-4 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider">
                Info
              </span>
              <div className="marquee-track whitespace-nowrap py-1.5 text-sm">
                {[0, 1].map((pass) => (
                  <span key={pass} aria-hidden={pass === 1}>
                    {runningText.map((text, i) => (
                      <span key={i} className="mx-6 inline-flex items-center gap-2">
                        <span aria-hidden className="opacity-60">
                          •
                        </span>
                        {text}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
