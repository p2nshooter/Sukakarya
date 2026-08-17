import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

import { getCurrentVillage } from "@/lib/village";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Typography.
 *
 * Plus Jakarta Sans carries the headings: it was commissioned as the typeface
 * for Jakarta's city identity, so an Indonesian civic site is exactly what it
 * was drawn for. Inter runs the body text, where its larger x-height and open
 * apertures hold up better at small sizes on low-DPI screens.
 *
 * The files are committed to this repository rather than fetched by
 * `next/font/google`. That loader downloads from fonts.gstatic.com *during the
 * build*, and a build that reaches the network is a build that fails when the
 * network says no: CI failed two of three consecutive pushes with
 * `Failed to fetch font file`, each time on a different weight. Anyone who
 * takes this script and builds it behind a firewall, or on a bad connection,
 * would hit the same wall with no obvious cause.
 *
 * Both are the latin subset of the variable font, so one file per family
 * covers every weight used - 48KB and 27KB respectively. Both are licensed
 * under the SIL Open Font License, which permits redistribution; the licence
 * travels with them in fonts/OFL.txt.
 *
 * `display: "swap"` shows the fallback immediately rather than blocking the
 * first paint on a font that may still be in flight.
 */
const display = localFont({
  src: "./fonts/fraunces-latin.woff2",
  // A range, not a list: this is the variable font, and naming the range lets
  // the browser interpolate every weight between rather than snapping to one.
  weight: "400 700",
  style: "normal",
  variable: "--font-display-loaded",
  display: "swap",
});

const body = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "400 700",
  style: "normal",
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
    // Jatuh ke lambang desa bila favicon khusus belum diunggah. Tanpa ini,
    // pemasangan baru tidak menyatakan ikon sama sekali, peramban meminta
    // /favicon.ico, dan dijawab 404 pada setiap kunjungan - tab tanpa lambang
    // di situs pemerintah desa. Lambangnya sudah ada di sana; yang kurang
    // hanya menyebutkannya.
    icons: (() => {
      const id = village.faviconMediaId ?? village.logoMediaId;
      return id ? { icon: mediaUrl(id)! } : undefined;
    })(),
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
