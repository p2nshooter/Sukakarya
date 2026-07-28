import type { Viewer } from "@/lib/access";
import type { ResolvedModule } from "@/lib/modules/registry";
import { shouldRender } from "@/lib/modules/registry";
import type { Village } from "@/lib/village";

import { SECTION_RENDERERS } from "@/components/sections/registry";
import type { PageSection } from "@/components/sections/types";

/**
 * Renders the ordered sections of a page.
 *
 * A section is skipped when its module is switched off, hidden, outside its
 * schedule window, or above the viewer's access level - the same gate the rest
 * of the site uses. Sections whose module has no visual renderer (admin tools,
 * SEO switches) are skipped silently.
 */
export async function SectionList({
  sections,
  village,
  viewer,
  modules,
}: {
  sections: PageSection[];
  village: Village;
  viewer: Viewer;
  modules: Map<string, ResolvedModule>;
}) {
  const rendered = [];

  for (const section of sections) {
    const module = modules.get(section.moduleId);
    if (!shouldRender(module, { viewer })) continue;

    const Renderer = SECTION_RENDERERS[section.moduleId];
    if (!Renderer) continue;

    rendered.push(
      <Renderer
        key={section.id}
        village={village}
        viewer={viewer}
        module={module!}
        section={section}
      />,
    );
  }

  return <>{rendered}</>;
}
