import type { ReactNode } from "react";

import { getViewer } from "@/lib/auth";
import { listBanners, listSocialLinks } from "@/lib/content";
import { getDb } from "@/lib/env";
import { getVillageModules } from "@/lib/modules/registry";
import { getMenu } from "@/lib/navigation";
import { requireVillage } from "@/lib/village";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Total page views across the village, used by the footer counter. */
async function getVisitorCount(villageId: string): Promise<number | null> {
  try {
    const row = await getDb()
      .prepare(
        "SELECT COALESCE(SUM(views), 0) AS total FROM analytics_daily WHERE village_id = ?",
      )
      .bind(villageId)
      .first<{ total: number }>();
    return row?.total ?? 0;
  } catch {
    return null;
  }
}

/**
 * Shared chrome for every public page: resolves the tenant, the viewer and the
 * module state once, then renders header, content and footer around it.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const village = await requireVillage();
  const viewer = await getViewer();
  const modules = await getVillageModules(village.id);

  const [primaryNav, footerNav, socials, runningBanners, emergency, visitors] =
    await Promise.all([
      getMenu(village.id, "primary"),
      getMenu(village.id, "footer"),
      listSocialLinks(village.id),
      listBanners(village.id, "announcement"),
      listBanners(village.id, "emergency"),
      getVisitorCount(village.id),
    ]);

  const runningText = runningBanners
    .map((banner) => banner.title)
    .filter((text): text is string => Boolean(text));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        village={village}
        viewer={viewer}
        modules={modules}
        nav={primaryNav}
        runningText={runningText}
        emergency={emergency}
      />

      <main id="konten" className="flex-1">
        {children}
      </main>

      <SiteFooter
        village={village}
        viewer={viewer}
        modules={modules}
        nav={footerNav.length > 0 ? footerNav : primaryNav}
        socials={socials}
        visitorCount={visitors}
      />
    </div>
  );
}
