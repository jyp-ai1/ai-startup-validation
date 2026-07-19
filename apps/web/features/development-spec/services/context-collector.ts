import type { DevelopmentSpecContext } from '@repo/types/validation';

import { collectPRDContext } from '@/features/prd/services/context-collector';
import { findPRDWithSections } from '@/features/prd/services/prd-service';

/** Collect PRD context plus linked PRD sections for Development Spec AI generation. */
export async function collectDevelopmentSpecContext(
  projectId: string,
  prdId: string,
): Promise<DevelopmentSpecContext | null> {
  const base = await collectPRDContext(projectId);
  if (!base) return null;

  const withSections = await findPRDWithSections(projectId, prdId);
  let prd: DevelopmentSpecContext['prd'] = null;

  if (withSections) {
    prd = {
      id: withSections.id,
      title: withSections.title,
      summary: withSections.summary,
      sections: withSections.sections.map((section) => ({
        sectionType: section.sectionType,
        title: section.title,
        content: section.content,
      })),
    };
  }

  return { ...base, prd };
}
