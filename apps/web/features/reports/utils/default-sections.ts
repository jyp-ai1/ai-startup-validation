import type { ReportSectionType } from '@repo/types/validation';

export type DefaultSectionConfig = {
  sectionType: ReportSectionType;
  title: string;
  order: number;
};

export const DEFAULT_REPORT_SECTIONS: DefaultSectionConfig[] = [
  { sectionType: 'EXECUTIVE_SUMMARY', title: 'Executive Summary', order: 1 },
  { sectionType: 'PROBLEM', title: 'Problem Definition', order: 2 },
  { sectionType: 'MARKET_ANALYSIS', title: 'Market Analysis', order: 3 },
  { sectionType: 'CUSTOMER_ANALYSIS', title: 'Customer Analysis', order: 4 },
  { sectionType: 'COMPETITOR_ANALYSIS', title: 'Competitor Analysis', order: 5 },
  { sectionType: 'BUSINESS_MODEL', title: 'Business Model', order: 6 },
  { sectionType: 'GOVERNMENT_SUPPORT', title: 'Government Support', order: 7 },
  { sectionType: 'VALIDATION_RESULT', title: 'Validation Result', order: 8 },
  { sectionType: 'RISK', title: 'Risk', order: 9 },
  { sectionType: 'NEXT_ACTION', title: 'Next Action', order: 10 },
];

export const REPORT_STATUS_LABELS = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
} as const;

export const SECTION_TYPE_LABELS: Record<ReportSectionType, string> = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  PROBLEM: 'Problem',
  MARKET_ANALYSIS: 'Market Analysis',
  CUSTOMER_ANALYSIS: 'Customer Analysis',
  COMPETITOR_ANALYSIS: 'Competitor Analysis',
  BUSINESS_MODEL: 'Business Model',
  GOVERNMENT_SUPPORT: 'Government Support',
  VALIDATION_RESULT: 'Validation Result',
  RISK: 'Risk',
  NEXT_ACTION: 'Next Action',
};
