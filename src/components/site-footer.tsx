import Link from "next/link";

import type { Viewer } from "@/lib/access";
import type { SocialLink } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import type { ResolvedModule } from "@/lib/modules/registry";
import { shouldRender } from "@/lib/modules/registry";
import { filterNav, type NavItem } from "@/lib/navigation";
import type { Village } from "@/lib/village";

import { Container } from "@/components/ui";
import {
  IconClock,
  IconMail,
  IconPhone,
  IconPin,
  SocialIcon,
} from "@/components/icons";

interface SiteFooterProps {
  village: Village;
  viewer: Viewer;
  modules: Map<string, ResolvedModule>;
  nav: NavItem[];
  socials: SocialLink[];
  visitorCount: number | null;
  officeHours?: string | null;
}

const SOCIAL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
  x: "X",
  linkedin: "LinkedIn",
};

export function SiteFooter({
  village,
  viewer,
  modules,
  nav,
  socials,
  visitorCount,
  officeHours,
}: SiteFooterProps) {
  const ctx = { viewer };
  const show = (id: string) => shouldRender(modules.get(id), ctx);

  if (!show("footer")) return null;

  const items = filterNav(nav, viewer, show);
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  const visibleSocials = socials.filter((s) => show(s.platform));
  const logo = mediaUrl(village.logoMediaId);

  // Two link columns instead of one long list: eight items in a single column
  // makes the footer tall and thin on desktop and reads as an afterthought.
  const half = Math.ceil(Math.min(items.length, 10) / 2);
  const columns = [items.slice(0, half), items.slice(half, 10)];

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface-1)]">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Identity */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                  width={48}
                  height={48}
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-lg font-bold text-[var(--text-on-brand)]"
                >
                  {village.name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-display text-base font-bold leading-tight">
                  {village.entityLabel} {village.name}
                </p>
                {region ? (
                  <p className="truncate text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    {region}
                  </p>
                ) : null}
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-[var(--text-muted)]">
              {village.address ? (
                <li className="flex gap-2.5">
                  <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="leading-relaxed">{village.address}</span>
                </li>
              ) : null}
              {officeHours ? (
                <li className="flex gap-2.5">
                  <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{officeHours}</span>
                </li>
              ) : null}
              {village.phone ? (
                <li className="flex gap-2.5">
                  <IconPhone className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <a
                    href={`tel:${village.phone.replace(/\s/g, "")}`}
                    className="link-underline inline-block py-0.5"
                  >
                    {village.phone}
                  </a>
                </li>
              ) : null}
              {show("email") && village.email ? (
                <li className="flex gap-2.5">
                  <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <a
                    href={`mailto:${village.email}`}
                    className="link-underline inline-block break-all py-0.5"
                  >
                    {village.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-5">
            {columns.map((column, index) =>
              column.length === 0 ? null : (
                <div key={index}>
                  {index === 0 ? (
                    <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
                      Jelajahi
                    </h2>
                  ) : (
                    <span aria-hidden className="block h-4" />
                  )}
                  <ul className="mt-4 space-y-2.5">
                    {column.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.url}
                          className="link-underline inline-block py-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>

          {/* Contact / social */}
          <div className="lg:col-span-3">
            {show("whatsapp") && village.whatsapp ? (
              <a
                href={`https://wa.me/${village.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--text-on-brand)] shadow-[var(--shadow-brand)] transition-colors hover:bg-brand-600"
              >
                <SocialIcon platform="whatsapp" className="h-4 w-4" />
                Hubungi via WhatsApp
              </a>
            ) : null}

            {visibleSocials.length > 0 ? (
              <>
                <h2 className="mt-7 text-[0.6875rem] font-bold uppercase tracking-[0.14em]">
                  Ikuti Kami
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {visibleSocials.map((social) => {
                    const label =
                      social.label ??
                      SOCIAL_LABELS[social.platform] ??
                      social.platform;
                    return (
                      <li key={social.platform}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          title={label}
                          className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-all hover:border-brand hover:text-brand"
                        >
                          <SocialIcon
                            platform={social.platform}
                            className="h-[18px] w-[18px]"
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}

            {show("visitor-counter") && visitorCount !== null ? (
              <p className="mt-7 text-xs text-[var(--text-muted)]">
                Total kunjungan
                <span className="mt-0.5 block font-display text-lg font-bold tabular-nums text-[var(--text)]">
                  {visitorCount.toLocaleString("id-ID")}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </Container>

      {show("copyright") ? (
        <div className="border-t border-[var(--border)]">
          <Container className="flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-[var(--text-muted)]">
            <p>
              © {new Date().getFullYear()} {village.entityLabel} {village.name}.
              Seluruh hak cipta dilindungi.
            </p>
            <p className="flex items-center gap-4">
              <Link href="/ppid" className="link-underline">
                PPID
              </Link>
              <Link href="/sitemap.xml" className="link-underline">
                Peta Situs
              </Link>
            </p>
          </Container>
        </div>
      ) : null}
    </footer>
  );
}
