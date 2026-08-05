import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

import { getCurrentVillage } from "@/lib/village";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Typography.
 *
 * Both faces are fetched at build time and served from our own origin as static
 * assets, so a page never makes a request to Google at runtime. That keeps the
 * Worker self-contained, removes a third-party dependency from the render path,
 * and means no visitor's IP is handed to a font CDN.
 *
 * Plus Jakarta Sans carries the headings: it was commissioned as the typeface
 * for Jakarta's city identity, so an Indonesian civic site is exactly what it
 * was drawn for. Inter runs the body text, where its larger x-height and open
 * apertures hold up better at small sizes on low-DPI screens.
 *
 * `display: "swap"` shows the fallback immediately rather than blocking the
 * first paint on a font that may still be in flight.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-loaded",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

/**
 * Title, description and icons all come from the resolved tenant. Nothing about
 * a specific village is compiled in - an unprovisioned deployment falls back to
 * the generic platform name.
 */
export async function generateMetadata(): Promise<Metadata> {
  const village = await getCurrentVillage().catch(() => null);

  if (!village) {
    return {
      title: "Website Desa",
      description: "Portal informasi dan layanan desa.",
    };
  }

  const fullName = `${village.entityLabel} ${village.name}`;
  const region = [village.district, village.regency, village.province]
    .filter(Boolean)
    .join(", ");

  return {
    title: {
      default: `Website Resmi ${fullName}`,
      template: `%s | ${fullName}`,
    },
    description:
      `Portal resmi ${fullName}${region ? `, ${region}` : ""}. Informasi, ` +
      `transparansi anggaran, layanan surat online dan pengaduan warga.`,
    applicationName: fullName,
    icons: village.faviconMediaId
      ? { icon: mediaUrl(village.faviconMediaId)! }
      : undefined,
    openGraph: {
      type: "website",
      siteName: fullName,
      locale: village.locale === "id" ? "id_ID" : village.locale,
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // One value, not a light/dark pair: the site no longer follows the OS
  // setting, so advertising a dark theme colour would tint the browser chrome
  // to something the page never renders.
  themeColor: "#fefdfb",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const village = await getCurrentVillage().catch(() => null);

  // Brand colours become CSS variables, which Tailwind's @theme maps onto the
  // `brand` colour utilities used throughout the components.
  const brandVars = village
    ? ({
        "--village-primary": village.primaryColor,
        "--village-secondary": village.secondaryColor,
        "--village-accent": village.accentColor,
      } as React.CSSProperties)
    : undefined;

  return (
    <html
      lang={village?.locale ?? "id"}
      className={`${display.variable} ${body.variable}`}
      style={brandVars}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <a href="#konten" className="skip-link">
          Lompat ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
