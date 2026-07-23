import type { ReportSectionId, ReportTemplateId } from '../types/report-types';

/** Story-driven default section order — consulting report flow. */
export const STORY_SECTION_ORDER: ReportSectionId[] = [
  'EXECUTIVE_SUMMARY',
  'DECISION',
  'MARKET_INTELLIGENCE',
  'FRAMEWORK_ANALYSIS',
  'STRATEGIC_KPI',
  'SUPPORTING_EVIDENCE',
  'STRATEGIC_RISKS',
  'STRATEGIC_OPPORTUNITIES',
  'RECOMMENDED_ACTIONS',
  'EXECUTION_STATUS',
];

export const APPENDIX_SECTIONS: ReportSectionId[] = ['APPENDIX'];

type TemplateConfig = {
  id: ReportTemplateId;
  nameKey: string;
  sectionOrder: ReportSectionId[];
  subtitleKey: string;
};

const EXECUTIVE_ORDER = STORY_SECTION_ORDER;

const TEMPLATES: Record<ReportTemplateId, TemplateConfig> = {
  EXECUTIVE: {
    id: 'EXECUTIVE',
    nameKey: 'templates.executive',
    sectionOrder: EXECUTIVE_ORDER,
    subtitleKey: 'templates.subtitles.executive',
  },
  BOARD_MEETING: {
    id: 'BOARD_MEETING',
    nameKey: 'templates.boardMeeting',
    sectionOrder: [
      'EXECUTIVE_SUMMARY',
      'DECISION',
      'STRATEGIC_RISKS',
      'STRATEGIC_OPPORTUNITIES',
      'RECOMMENDED_ACTIONS',
      'STRATEGIC_KPI',
      'SUPPORTING_EVIDENCE',
      'EXECUTION_STATUS',
    ],
    subtitleKey: 'templates.subtitles.board',
  },
  INVESTMENT: {
    id: 'INVESTMENT',
    nameKey: 'templates.investment',
    sectionOrder: [
      'EXECUTIVE_SUMMARY',
      'DECISION',
      'MARKET_INTELLIGENCE',
      'STRATEGIC_KPI',
      'STRATEGIC_RISKS',
      'STRATEGIC_OPPORTUNITIES',
      'SUPPORTING_EVIDENCE',
      'RECOMMENDED_ACTIONS',
    ],
    subtitleKey: 'templates.subtitles.investment',
  },
  STARTUP: {
    id: 'STARTUP',
    nameKey: 'templates.startup',
    sectionOrder: [
      'EXECUTIVE_SUMMARY',
      'DECISION',
      'MARKET_INTELLIGENCE',
      'FRAMEWORK_ANALYSIS',
      'STRATEGIC_RISKS',
      'RECOMMENDED_ACTIONS',
      'SUPPORTING_EVIDENCE',
      'EXECUTION_STATUS',
    ],
    subtitleKey: 'templates.subtitles.startup',
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    nameKey: 'templates.enterprise',
    sectionOrder: [
      'EXECUTIVE_SUMMARY',
      'DECISION',
      'FRAMEWORK_ANALYSIS',
      'STRATEGIC_KPI',
      'STRATEGIC_RISKS',
      'STRATEGIC_OPPORTUNITIES',
      'RECOMMENDED_ACTIONS',
      'EXECUTION_STATUS',
      'SUPPORTING_EVIDENCE',
    ],
    subtitleKey: 'templates.subtitles.enterprise',
  },
};

export function getTemplateConfig(id: ReportTemplateId): TemplateConfig {
  return TEMPLATES[id];
}

export function listTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATES);
}

export function resolveTemplateForProjectType(projectType: string): ReportTemplateId {
  switch (projectType) {
    case 'STARTUP':
      return 'STARTUP';
    case 'AI_INITIATIVE':
      return 'INVESTMENT';
    case 'BUSINESS_STRATEGY':
    case 'NEW_BUSINESS':
    case 'DIGITAL_TRANSFORMATION':
    case 'MARKET_EXPANSION':
      return 'ENTERPRISE';
    default:
      return 'EXECUTIVE';
  }
}

export function reorderSections<T extends { id: ReportSectionId; order: number }>(
  sections: T[],
  orderedIds: ReportSectionId[],
): T[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  return orderedIds
    .map((id, index) => {
      const section = byId.get(id);
      return section ? { ...section, order: index + 1 } : null;
    })
    .filter((s): s is T => s !== null);
}
