import Link from "next/link";

import type { Viewer } from "@/lib/access";
import type { SocialLink } from "@/lib/content";
import type { ResolvedModule } from "@/lib/modules/registry";
import { shouldRender } from "@/lib/modules/registry";
import { filterNav, type NavItem } from "@/lib/navigation";
import type { Village } from "@/lib/village";

interface SiteFooterProps {
  village: Village;
  viewer: Viewer;
  modules: Map<string, ResolvedModule>;
  nav: NavItem[];
  socials: SocialLink[];
  visitorCount: number | null;
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
}: SiteFooterProps) {
  const ctx = { viewer };
  const show = (id: string) => shouldRender(modules.get(id), ctx);

  if (!show("footer")) return null;

  const items = filterNav(nav, viewer, show);
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  const visibleSocials = socials.filter((s) => show(s.platform));

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-base font-bold">
            {village.entityLabel} {village.name}
          </h2>
          {region ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{region}</p>
          ) : null}
          {village.address ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">{village.address}</p>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Tautan</h2>
          <ul className="mt-3 space-y-2">
            {items.slice(0, 8).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.url}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Kontak</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            {show("whatsapp") && village.whatsapp ? (
              <li>
                <a
                  href={`https://wa.me/${village.whatsapp.replace(/\D/g, "")}`}
                  className="hover:text-[var(--text)]"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  WhatsApp: {village.whatsapp}
                </a>
              </li>
            ) : null}
            {show("email") && village.email ? (
              <li>
                <a href={`mailto:${village.email}`} className="hover:text-[var(--text)]">
                  {village.email}
                </a>
              </li>
            ) : null}
            {village.phone ? <li>Telepon: {village.phone}</li> : null}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">Ikuti Kami</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {visibleSocials.map((social) => (
              <li key={social.platform}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface)]"
                >
                  {social.label ?? SOCIAL_LABELS[social.platform] ?? social.platform}
                </a>
              </li>
            ))}
          </ul>

          {show("visitor-counter") && visitorCount !== null ? (
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Pengunjung: {visitorCount.toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      </div>

      {show("copyright") ? (
        <div className="border-t border-[var(--border)] px-4 py-4">
          <p className="mx-auto max-w-7xl text-center text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} {village.entityLabel} {village.name}. Seluruh
            hak cipta dilindungi.
          </p>
        </div>
      ) : null}
    </footer>
  );
}
