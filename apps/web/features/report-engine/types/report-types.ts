import type { AppLocale } from '@repo/i18n/config';

/** Report template identifiers — future Template Marketplace. */
export type ReportTemplateId =
  | 'EXECUTIVE'
  | 'BOARD_MEETING'
  | 'INVESTMENT'
  | 'STARTUP'
  | 'ENTERPRISE';

/** Canonical report section IDs. */
export type ReportSectionId =
  | 'EXECUTIVE_SUMMARY'
  | 'DECISION'
  | 'STRATEGIC_KPI'
  | 'MARKET_INTELLIGENCE'
  | 'FRAMEWORK_ANALYSIS'
  | 'STRATEGIC_RISKS'
  | 'STRATEGIC_OPPORTUNITIES'
  | 'RECOMMENDED_ACTIONS'
  | 'EXECUTION_STATUS'
  | 'SUPPORTING_EVIDENCE'
  | 'APPENDIX';

export type ReportVersionStage = 'DRAFT' | 'INTERNAL_REVIEW' | 'APPROVED';

export type ReportVersion = {
  major: number;
  minor: number;
  stage: ReportVersionStage;
  /** Display label e.g. v0.1 Draft */
  labelKey: string;
  labelParams?: Record<string, string | number>;
};

export type ReviewCommentStatus = 'OPEN' | 'RESOLVED';

export type ReviewWorkflowStatus =
  | 'AI_GENERATED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'EXPORTED';

export type ReviewComment = {
  id: string;
  sectionId: ReportSectionId;
  authorKey: string;
  bodyKey: string;
  status: ReviewCommentStatus;
  createdAt: string;
};

export type ReportReviewState = {
  status: ReviewWorkflowStatus;
  comments: ReviewComment[];
};

export type ExportFormat = 'PDF' | 'PPTX' | 'DOCX';

export type ExportJobStatus = 'REQUESTED' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export type ExportJob = {
  id: string;
  reportId: string;
  format: ExportFormat;
  status: ExportJobStatus;
  requestedAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  errorMessage: string | null;
};

export type ReportBlockType =
  | 'heading'
  | 'paragraph'
  | 'bullet'
  | 'metric'
  | 'table_row'
  | 'verdict';

export type ReportBlock = {
  id: string;
  type: ReportBlockType;
  labelKey?: string;
  bodyKey?: string;
  value?: string | number;
  params?: Record<string, string | number>;
};

export type ReportSectionContent = {
  id: ReportSectionId;
  order: number;
  titleKey: string;
  storyStepKey: string;
  blocks: ReportBlock[];
};

export type ExecutiveReport = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  version: ReportVersion;
  projectId: string;
  projectTitle: string;
  projectType: string;
  language: AppLocale;
  templateId: ReportTemplateId;
  sections: ReportSectionContent[];
  appendix: ReportSectionContent[];
  review: ReportReviewState;
};

export type ReportBuildInput = {
  projectId: string;
  projectTitle: string;
  projectType: string;
  language: AppLocale;
  templateId?: ReportTemplateId;
};

export interface ExportProvider {
  readonly format: ExportFormat;
  generate(report: ExecutiveReport): Promise<{ fileName: string; downloadUrl: string }>;
}

export interface ReportSectionBuilder {
  readonly sectionId: ReportSectionId;
  build(ctx: import('../report-builder/report-build-context').ReportBuildContext): ReportSectionContent | null;
}
