import type { Metadata, Viewport } from "next";

import "./globals.css";

import { getCurrentVillage } from "@/lib/village";
import { mediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1216" },
  ],
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
    <html lang={village?.locale ?? "id"} style={brandVars} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <a href="#konten" className="skip-link">
          Lompat ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
