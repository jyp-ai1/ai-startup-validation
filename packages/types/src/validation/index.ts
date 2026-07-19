import type { ID, ISODateString } from '../global';

/** Startup project lifecycle status. */
export const STARTUP_PROJECT_STATUSES = [
  'DRAFT',
  'RESEARCHING',
  'ANALYZING',
  'COMPLETED',
  'ARCHIVED',
] as const;

export type StartupProjectStatus = (typeof STARTUP_PROJECT_STATUSES)[number];

/** Startup project — core entity for idea validation workflow. */
export type StartupProject = {
  id: ID;
  title: string;
  summary: string;
  problem: string | null;
  solution: string | null;
  targetCustomer: string | null;
  industry: string | null;
  businessModel: string | null;
  status: StartupProjectStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateStartupProjectInput = {
  title: string;
  summary: string;
  problem?: string | null;
  solution?: string | null;
  targetCustomer?: string | null;
  industry?: string | null;
  businessModel?: string | null;
  status?: StartupProjectStatus;
};

export type UpdateStartupProjectInput = {
  title?: string;
  summary?: string;
  problem?: string | null;
  solution?: string | null;
  targetCustomer?: string | null;
  industry?: string | null;
  businessModel?: string | null;
  status?: StartupProjectStatus;
};

/** Research master plan for market investigation. */
export type Research = {
  id: ID;
  projectId: ID;
  title: string;
  objective: string;
  methodology: string;
  status: 'draft' | 'in_progress' | 'completed';
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Evidence item supporting validation claims. */
export type Evidence = {
  id: ID;
  projectId: ID;
  title: string;
  source: string;
  content: string;
  category: 'market' | 'competitor' | 'customer' | 'regulation' | 'other';
  createdAt: ISODateString;
};

/** Competitor analysis entry. */
export type Competitor = {
  id: ID;
  projectId: ID;
  name: string;
  website: string;
  strengths: string;
  weaknesses: string;
  marketPosition: string;
  createdAt: ISODateString;
};

/** Voice of Customer — customer problem analysis. */
export type VOC = {
  id: ID;
  projectId: ID;
  source: string;
  painPoint: string;
  frequency: 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: ISODateString;
};

/** Government grant / support program. */
export type Grant = {
  id: ID;
  projectId: ID;
  programName: string;
  agency: string;
  eligibility: string;
  deadline: ISODateString | null;
  url: string;
  createdAt: ISODateString;
};

/** Validation score result. */
export type Score = {
  id: ID;
  projectId: ID;
  overallScore: number;
  verdict: 'go' | 'no_go' | 'conditional';
  marketScore: number;
  competitorScore: number;
  customerScore: number;
  feasibilityScore: number;
  summary: string;
  createdAt: ISODateString;
};

/** AI-generated validation report. */
export type Report = {
  id: ID;
  projectId: ID;
  title: string;
  type: 'validation' | 'business_plan' | 'prd' | 'dev_spec';
  status: 'draft' | 'generating' | 'completed';
  content: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};
