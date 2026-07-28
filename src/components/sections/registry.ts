import type { SectionRenderer } from "@/components/sections/types";

import {
  AgendaDesa,
  ApbdesRingkas,
  BannerEvent,
  BannerPengumuman,
  BeritaTerbaru,
  DownloadCenter,
  EventTerbaru,
  FaqSection,
  GaleriFoto,
  GaleriVideo,
  HeroBanner,
  KontakSection,
  LayananSection,
  MapsSection,
  PotensiDesa,
  QuickMenu,
  SambutanKepalaDesa,
  StatistikPenduduk,
  UmkmSection,
  VideoProfil,
  WisataSection,
} from "@/components/sections/home";

/**
 * Maps a module id to the component that renders it as a page section.
 *
 * A module without an entry here is still a real, toggleable module - it simply
 * has no section representation (admin tools, SEO switches, integrations). The
 * page renderer skips those silently, so adding a renderer later needs no other
 * change.
 */
export const SECTION_RENDERERS: Record<string, SectionRenderer> = {
  "hero-banner": HeroBanner,
  "banner-event": BannerEvent,
  "banner-pengumuman": BannerPengumuman,
  "sambutan-kepala-desa": SambutanKepalaDesa,
  "quick-menu": QuickMenu,
  "statistik-penduduk": StatistikPenduduk,
  berita: BeritaTerbaru,
  event: EventTerbaru,
  "agenda-desa": AgendaDesa,
  "galeri-foto": GaleriFoto,
  "galeri-video": GaleriVideo,
  "video-profil": VideoProfil,
  "potensi-desa": PotensiDesa,
  umkm: UmkmSection,
  wisata: WisataSection,
  apbdes: ApbdesRingkas,
  "realisasi-apbdes": ApbdesRingkas,
  "pelayanan-online": LayananSection,
  "download-center": DownloadCenter,
  faq: FaqSection,
  maps: MapsSection,
  kontak: KontakSection,
};

export function hasRenderer(moduleId: string): boolean {
  return moduleId in SECTION_RENDERERS;
}
