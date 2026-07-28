import { getViewer } from "@/lib/auth";
import { getVillageModules } from "@/lib/modules/registry";
import { getPageSections } from "@/lib/page-builder";
import { requireVillage } from "@/lib/village";

import { SectionList } from "@/components/section-list";
import { SiteShell } from "@/components/site-shell";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The homepage is assembled entirely from `page_sections`. There is no fixed
 * layout in the code: reorder the rows and the page reorders.
 */
export default async function HomePage() {
  const village = await requireVillage();
  const viewer = await getViewer();
  const [modules, sections] = await Promise.all([
    getVillageModules(village.id),
    getPageSections(village.id, "home"),
  ]);

  return (
    <SiteShell>
      {sections.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState
            title="Beranda belum dikonfigurasi."
            hint="Tambahkan section beranda melalui Panel Admin › Tata Letak."
          />
        </div>
      ) : (
        <SectionList
          sections={sections}
          village={village}
          viewer={viewer}
          modules={modules}
        />
      )}
    </SiteShell>
  );
}
