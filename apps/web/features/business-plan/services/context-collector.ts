import type { BusinessPlanContext } from '@repo/types/validation';

import { collectValidationContext } from '@/features/ai-report/services/context-collector';
import { findReportWithSections } from '@/features/reports/services/report-service';
import { listReports } from '@/features/reports/services/report-service';

/** Collect validation context plus latest validation report for business plan AI. */
export async function collectBusinessPlanContext(
  projectId: string,
): Promise<BusinessPlanContext | null> {
  const base = await collectValidationContext(projectId);
  if (!base) return null;

  const reports = await listReports(projectId);
  const latestReport = reports[0];
  let validationReport: BusinessPlanContext['validationReport'] = null;

  if (latestReport) {
    const withSections = await findReportWithSections(projectId, latestReport.id);
    if (withSections) {
      validationReport = {
        title: withSections.title,
        summary: withSections.summary,
        sections: withSections.sections.map((section) => ({
          sectionType: section.sectionType,
          title: section.title,
          content: section.content,
        })),
      };
    }
  }

  return { ...base, validationReport };
}
