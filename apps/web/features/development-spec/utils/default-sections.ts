import type { DevelopmentSpecSectionType } from '@repo/types/validation';

export type DefaultDevelopmentSpecSectionConfig = {
  sectionType: DevelopmentSpecSectionType;
  title: string;
  order: number;
};

export const DEFAULT_DEVELOPMENT_SPEC_SECTIONS: DefaultDevelopmentSpecSectionConfig[] = [
  { sectionType: 'SYSTEM_OVERVIEW', title: 'System Overview', order: 1 },
  { sectionType: 'TECH_STACK', title: 'Tech Stack', order: 2 },
  { sectionType: 'ARCHITECTURE', title: 'Architecture', order: 3 },
  { sectionType: 'DATABASE_SCHEMA', title: 'Database Schema', order: 4 },
  { sectionType: 'API_SPECIFICATION', title: 'API Specification', order: 5 },
  { sectionType: 'FRONTEND_STRUCTURE', title: 'Frontend Structure', order: 6 },
  { sectionType: 'BACKEND_STRUCTURE', title: 'Backend Structure', order: 7 },
  { sectionType: 'AUTH_DESIGN', title: 'Auth Design', order: 8 },
  { sectionType: 'SECURITY', title: 'Security', order: 9 },
  { sectionType: 'DEPLOYMENT', title: 'Deployment', order: 10 },
  { sectionType: 'TEST_PLAN', title: 'Test Plan', order: 11 },
  { sectionType: 'SPRINT_PLAN', title: 'Sprint Plan', order: 12 },
  { sectionType: 'DEVELOPMENT_GUIDE', title: 'Development Guide', order: 13 },
];

export const DEVELOPMENT_SPEC_STATUS_LABELS = {
  DRAFT: 'Draft',
  GENERATING: 'Generating',
  COMPLETED: 'Completed',
} as const;

export const DEVELOPMENT_SPEC_SECTION_LABELS: Record<DevelopmentSpecSectionType, string> = {
  SYSTEM_OVERVIEW: 'System Overview',
  TECH_STACK: 'Tech Stack',
  ARCHITECTURE: 'Architecture',
  DATABASE_SCHEMA: 'Database Schema',
  API_SPECIFICATION: 'API Specification',
  FRONTEND_STRUCTURE: 'Frontend Structure',
  BACKEND_STRUCTURE: 'Backend Structure',
  AUTH_DESIGN: 'Auth Design',
  SECURITY: 'Security',
  DEPLOYMENT: 'Deployment',
  TEST_PLAN: 'Test Plan',
  SPRINT_PLAN: 'Sprint Plan',
  DEVELOPMENT_GUIDE: 'Development Guide',
};
