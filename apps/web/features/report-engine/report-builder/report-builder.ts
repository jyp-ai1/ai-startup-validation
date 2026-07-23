import { randomUUID } from 'crypto';

import type { ReportBuildContext } from './report-build-context';
import { buildAllSections } from '../sections/section-builder';
import {
  getTemplateConfig,
  reorderSections,
  resolveTemplateForProjectType,
} from '../template-engine/template-engine';
import type {
  ExecutiveReport,
  ReportBuildInput,
  ReportSectionId,
  ReportTemplateId,
  ReportVersion,
} from '../types/report-types';
import { saveReport, updateReport } from '../repositories/report-store';

function createVersion(stage: ReportVersion['stage'] = 'DRAFT'): ReportVersion {
  return {
    major: 0,
    minor: 1,
    stage,
    labelKey: 'version.draft',
    labelParams: { major: 0, minor: 1 },
  };
}

function createReviewState(): ExecutiveReport['review'] {
  return {
    status: 'AI_GENERATED',
    comments: [
      {
        id: randomUUID(),
        sectionId: 'DECISION',
        authorKey: 'review.sampleAuthor',
        bodyKey: 'review.sampleComment',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export class ReportBuilder {
  build(
    input: ReportBuildInput,
    ctx: ReportBuildContext,
  ): ExecutiveReport {
    const templateId =
      input.templateId ?? resolveTemplateForProjectType(input.projectType);
    const template = getTemplateConfig(templateId);
    const { sections, appendix } = buildAllSections(template.sectionOrder, ctx);
    const now = new Date().toISOString();

    const report: ExecutiveReport = {
      id: randomUUID(),
      title: input.projectTitle,
      subtitle: template.subtitleKey,
      author: 'LaunchLens AI',
      createdAt: now,
      updatedAt: now,
      version: createVersion(),
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      projectType: input.projectType,
      language: input.language,
      templateId,
      sections,
      appendix,
      review: createReviewState(),
    };

    return report;
  }

  async generateAndSave(
    input: ReportBuildInput,
    ctx: ReportBuildContext,
  ): Promise<ExecutiveReport> {
    const report = this.build(input, ctx);
    await saveReport(report);
    return report;
  }

  reorderReportSections(
    report: ExecutiveReport,
    orderedIds: ReportSectionId[],
  ): ExecutiveReport {
    const reordered = reorderSections(report.sections, orderedIds);
    return {
      ...report,
      sections: reordered,
      updatedAt: new Date().toISOString(),
    };
  }

  changeTemplate(report: ExecutiveReport, templateId: ReportTemplateId, ctx: ReportBuildContext): ExecutiveReport {
    const template = getTemplateConfig(templateId);
    const { sections, appendix } = buildAllSections(template.sectionOrder, ctx);
    return {
      ...report,
      templateId,
      subtitle: template.subtitleKey,
      sections,
      appendix,
      updatedAt: new Date().toISOString(),
      version: bumpMinorVersion(report.version, 'INTERNAL_REVIEW'),
    };
  }

  approveReport(report: ExecutiveReport): ExecutiveReport {
    return {
      ...report,
      review: { ...report.review, status: 'APPROVED' },
      version: bumpMinorVersion(report.version, 'APPROVED'),
      updatedAt: new Date().toISOString(),
    };
  }

  resolveComment(report: ExecutiveReport, commentId: string): ExecutiveReport {
    return {
      ...report,
      review: {
        ...report.review,
        status: 'IN_REVIEW',
        comments: report.review.comments.map((c) =>
          c.id === commentId ? { ...c, status: 'RESOLVED' as const } : c,
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async persist(report: ExecutiveReport): Promise<void> {
    await updateReport(report);
  }
}

function bumpMinorVersion(
  current: ReportVersion,
  stage: ReportVersion['stage'],
): ReportVersion {
  const minor = current.minor + 1;
  const major = stage === 'APPROVED' && minor >= 10 ? current.major + 1 : current.major;
  const normalizedMinor = stage === 'APPROVED' && minor >= 10 ? 0 : minor;

  const labelKey =
    stage === 'APPROVED'
      ? 'version.approved'
      : stage === 'INTERNAL_REVIEW'
        ? 'version.internalReview'
        : 'version.draft';

  return {
    major,
    minor: normalizedMinor,
    stage,
    labelKey,
    labelParams: { major, minor: normalizedMinor },
  };
}

export const reportBuilder = new ReportBuilder();
