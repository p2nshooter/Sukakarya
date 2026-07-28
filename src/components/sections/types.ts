import type { ReactNode } from "react";

import type { Viewer } from "@/lib/access";
import type { ResolvedModule } from "@/lib/modules/registry";
import type { Village } from "@/lib/village";

export interface PageSection {
  id: string;
  moduleId: string;
  title: string | null;
  subtitle: string | null;
  variant: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface SectionProps {
  village: Village;
  viewer: Viewer;
  module: ResolvedModule;
  section: PageSection;
}

export type SectionRenderer = (
  props: SectionProps,
) => Promise<ReactNode> | ReactNode;

/** Reads a numeric option from a section's JSON config with a safe default. */
export function configNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function configString(
  config: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}
