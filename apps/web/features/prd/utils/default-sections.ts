import type { PRDSectionType } from '@repo/types/validation';

export type DefaultPRDSectionConfig = {
  sectionType: PRDSectionType;
  title: string;
  order: number;
};

export const DEFAULT_PRD_SECTIONS: DefaultPRDSectionConfig[] = [
  { sectionType: 'PRODUCT_OVERVIEW', title: 'Product Overview', order: 1 },
  { sectionType: 'PROBLEM_DEFINITION', title: 'Problem Definition', order: 2 },
  { sectionType: 'TARGET_USER', title: 'Target User', order: 3 },
  { sectionType: 'USER_PERSONA', title: 'User Persona', order: 4 },
  { sectionType: 'USER_FLOW', title: 'User Flow', order: 5 },
  { sectionType: 'FEATURE_REQUIREMENTS', title: 'Feature Requirements', order: 6 },
  { sectionType: 'FUNCTIONAL_REQUIREMENTS', title: 'Functional Requirements', order: 7 },
  {
    sectionType: 'NON_FUNCTIONAL_REQUIREMENTS',
    title: 'Non-Functional Requirements',
    order: 8,
  },
  { sectionType: 'MVP_SCOPE', title: 'MVP Scope', order: 9 },
  { sectionType: 'TECH_REQUIREMENTS', title: 'Technical Requirements', order: 10 },
  { sectionType: 'DATABASE_DESIGN', title: 'Database Design', order: 11 },
  { sectionType: 'API_SPECIFICATION', title: 'API Specification', order: 12 },
  { sectionType: 'EDGE_CASE', title: 'Edge Case', order: 13 },
  { sectionType: 'ROADMAP', title: 'Roadmap', order: 14 },
];

export const PRD_STATUS_LABELS = {
  DRAFT: 'Draft',
  GENERATING: 'Generating',
  COMPLETED: 'Completed',
} as const;

export const PRD_SECTION_LABELS: Record<PRDSectionType, string> = {
  PRODUCT_OVERVIEW: 'Product Overview',
  PROBLEM_DEFINITION: 'Problem Definition',
  TARGET_USER: 'Target User',
  USER_PERSONA: 'User Persona',
  USER_FLOW: 'User Flow',
  FEATURE_REQUIREMENTS: 'Feature Requirements',
  FUNCTIONAL_REQUIREMENTS: 'Functional Requirements',
  NON_FUNCTIONAL_REQUIREMENTS: 'Non-Functional Requirements',
  MVP_SCOPE: 'MVP Scope',
  TECH_REQUIREMENTS: 'Technical Requirements',
  DATABASE_DESIGN: 'Database Design',
  API_SPECIFICATION: 'API Specification',
  EDGE_CASE: 'Edge Case',
  ROADMAP: 'Roadmap',
};
