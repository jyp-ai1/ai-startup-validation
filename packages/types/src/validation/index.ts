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

/** Strategy workspace project type — drives wizard and UI emphasis. */
export const PROJECT_TYPES = [
  'STARTUP',
  'BUSINESS_STRATEGY',
  'NEW_BUSINESS',
  'AI_INITIATIVE',
  'DIGITAL_TRANSFORMATION',
  'MARKET_EXPANSION',
  'CUSTOM',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Primary goal selected during onboarding wizard. */
export const PROJECT_GOALS = [
  'MARKET_VALIDATION',
  'BUSINESS_STRATEGY',
  'GOVERNMENT_GRANT',
  'FUNDRAISING',
  'NEW_BUSINESS',
  'AI_BUILD',
] as const;

export type ProjectGoal = (typeof PROJECT_GOALS)[number];

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
  country: string | null;
  projectGoal: ProjectGoal | null;
  projectType: ProjectType;
  userId: ID | null;
  isDemo: boolean;
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
  country?: string | null;
  projectGoal?: ProjectGoal | null;
  projectType?: ProjectType;
  userId?: ID | null;
  isDemo?: boolean;
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
  country?: string | null;
  projectGoal?: ProjectGoal | null;
  projectType?: ProjectType;
  status?: StartupProjectStatus;
};

/** @deprecated Use ResearchPlan — kept for Sprint 3+ migration reference */
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

/** Research plan type — what to investigate for validation. */
export const RESEARCH_TYPES = [
  'MARKET_SIZE',
  'CUSTOMER',
  'TREND',
  'COMPETITOR',
  'BUSINESS_MODEL',
  'TECHNOLOGY',
  'REGULATION',
] as const;

export type ResearchType = (typeof RESEARCH_TYPES)[number];

/** Research plan workflow status. */
export const RESEARCH_PLAN_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const;

export type ResearchPlanStatus = (typeof RESEARCH_PLAN_STATUSES)[number];

/** Research plan priority. */
export const RESEARCH_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

export type ResearchPriority = (typeof RESEARCH_PRIORITIES)[number];

/** Research master plan — validation investigation item for a startup project. */
export type ResearchPlan = {
  id: ID;
  projectId: ID;
  title: string;
  description: string | null;
  researchType: ResearchType;
  status: ResearchPlanStatus;
  priority: ResearchPriority;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateResearchPlanInput = {
  projectId: ID;
  title: string;
  description?: string | null;
  researchType: ResearchType;
  status?: ResearchPlanStatus;
  priority?: ResearchPriority;
};

export type UpdateResearchPlanInput = {
  title?: string;
  description?: string | null;
  researchType?: ResearchType;
  status?: ResearchPlanStatus;
  priority?: ResearchPriority;
};

/** Evidence source type — where the data came from. */
export const EVIDENCE_SOURCE_TYPES = [
  'REPORT',
  'ARTICLE',
  'NEWS',
  'PAPER',
  'SURVEY',
  'STATISTICS',
  'WEBSITE',
  'OTHER',
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

/** Evidence category — validation domain. */
export const EVIDENCE_CATEGORIES = [
  'MARKET',
  'CUSTOMER',
  'COMPETITOR',
  'TREND',
  'TECHNOLOGY',
  'REGULATION',
  'BUSINESS',
] as const;

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

/** Evidence confidence level. */
export const EVIDENCE_CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;

export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];

/** Evidence — supporting data for validation decisions. */
export type Evidence = {
  id: ID;
  projectId: ID;
  researchId: ID | null;
  title: string;
  sourceType: EvidenceSourceType | null;
  sourceName: string | null;
  sourceUrl: string | null;
  summary: string;
  content: string | null;
  category: EvidenceCategory;
  confidence: EvidenceConfidence;
  publishedDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateEvidenceInput = {
  projectId: ID;
  researchId?: ID | null;
  title: string;
  sourceType?: EvidenceSourceType | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  summary: string;
  content?: string | null;
  category: EvidenceCategory;
  confidence?: EvidenceConfidence;
  publishedDate?: ISODateString | null;
};

export type UpdateEvidenceInput = {
  researchId?: ID | null;
  title?: string;
  sourceType?: EvidenceSourceType | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  summary?: string;
  content?: string | null;
  category?: EvidenceCategory;
  confidence?: EvidenceConfidence;
  publishedDate?: ISODateString | null;
};

export type EvidenceListFilter = {
  category?: EvidenceCategory;
  sourceType?: EvidenceSourceType;
  confidence?: EvidenceConfidence;
};

/** Competitor category — relationship to startup idea. */
export const COMPETITOR_CATEGORIES = ['DIRECT', 'INDIRECT', 'SUBSTITUTE'] as const;

export type CompetitorCategory = (typeof COMPETITOR_CATEGORIES)[number];

/** Competitor market position. */
export const COMPETITOR_MARKET_POSITIONS = [
  'LEADER',
  'CHALLENGER',
  'FOLLOWER',
  'NEWCOMER',
] as const;

export type CompetitorMarketPosition = (typeof COMPETITOR_MARKET_POSITIONS)[number];

/** Competitor — structured competitive landscape entry. */
export type Competitor = {
  id: ID;
  projectId: ID;
  name: string;
  description: string | null;
  website: string | null;
  category: CompetitorCategory;
  targetCustomer: string | null;
  businessModel: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  differentiation: string | null;
  marketPosition: CompetitorMarketPosition | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateCompetitorInput = {
  projectId: ID;
  name: string;
  description?: string | null;
  website?: string | null;
  category: CompetitorCategory;
  targetCustomer?: string | null;
  businessModel?: string | null;
  pricing?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  differentiation?: string | null;
  marketPosition?: CompetitorMarketPosition | null;
};

export type UpdateCompetitorInput = {
  name?: string;
  description?: string | null;
  website?: string | null;
  category?: CompetitorCategory;
  targetCustomer?: string | null;
  businessModel?: string | null;
  pricing?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  differentiation?: string | null;
  marketPosition?: CompetitorMarketPosition | null;
};

/** Fields used in competitor comparison matrix. */
export type CompetitorComparisonField =
  | 'businessModel'
  | 'targetCustomer'
  | 'pricing'
  | 'strengths'
  | 'weaknesses'
  | 'differentiation';

export type CompetitorComparison = {
  competitors: Competitor[];
  fields: CompetitorComparisonField[];
};

/** VOC source type — where the feedback came from. */
export const VOC_SOURCE_TYPES = [
  'INTERVIEW',
  'SURVEY',
  'COMMUNITY',
  'REVIEW',
  'ARTICLE',
  'SOCIAL',
  'OTHER',
] as const;

export type VOCSourceType = (typeof VOC_SOURCE_TYPES)[number];

/** VOC customer segment. */
export const VOC_CUSTOMER_SEGMENTS = ['B2C', 'B2B', 'B2G'] as const;

export type VOCCustomerSegment = (typeof VOC_CUSTOMER_SEGMENTS)[number];

/** VOC emotion tone. */
export const VOC_EMOTIONS = ['NEGATIVE', 'NEUTRAL', 'POSITIVE'] as const;

export type VOCEmotion = (typeof VOC_EMOTIONS)[number];

/** VOC issue frequency. */
export const VOC_FREQUENCIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type VOCFrequency = (typeof VOC_FREQUENCIES)[number];

/** VOC problem severity. */
export const VOC_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type VOCSeverity = (typeof VOC_SEVERITIES)[number];

/** VOC willingness to pay. */
export const VOC_WILLINGNESS_TO_PAY = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const;

export type VOCWillingnessToPay = (typeof VOC_WILLINGNESS_TO_PAY)[number];

/** Voice of Customer — structured customer feedback entry. */
export type VOC = {
  id: ID;
  projectId: ID;
  title: string;
  content: string;
  sourceType: VOCSourceType | null;
  customerSegment: VOCCustomerSegment | null;
  painPoint: string;
  emotion: VOCEmotion | null;
  frequency: VOCFrequency | null;
  severity: VOCSeverity | null;
  willingnessToPay: VOCWillingnessToPay;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateVOCInput = {
  projectId: ID;
  title: string;
  content: string;
  sourceType?: VOCSourceType | null;
  customerSegment?: VOCCustomerSegment | null;
  painPoint: string;
  emotion?: VOCEmotion | null;
  frequency?: VOCFrequency | null;
  severity?: VOCSeverity | null;
  willingnessToPay?: VOCWillingnessToPay;
};

export type UpdateVOCInput = {
  title?: string;
  content?: string;
  sourceType?: VOCSourceType | null;
  customerSegment?: VOCCustomerSegment | null;
  painPoint?: string;
  emotion?: VOCEmotion | null;
  frequency?: VOCFrequency | null;
  severity?: VOCSeverity | null;
  willingnessToPay?: VOCWillingnessToPay;
};

export type VOCListFilter = {
  sourceType?: VOCSourceType;
  customerSegment?: VOCCustomerSegment;
  severity?: VOCSeverity;
  frequency?: VOCFrequency;
};

export type VOCDistributionItem = {
  label: string;
  count: number;
};

export type VOCPainPointRank = {
  painPoint: string;
  count: number;
};

/** Aggregated VOC analytics for dashboard. */
export type VOCSummary = {
  totalCount: number;
  painPointRanking: VOCPainPointRank[];
  severityDistribution: VOCDistributionItem[];
  frequencyDistribution: VOCDistributionItem[];
  willingnessDistribution: VOCDistributionItem[];
  customerSegmentDistribution: VOCDistributionItem[];
};

/** Government grant category. */
export const GRANT_CATEGORIES = [
  'STARTUP',
  'TECHNOLOGY',
  'AI',
  'SOCIAL',
  'LOCAL',
  'SME',
  'CONTENT',
  'OTHER',
] as const;

export type GrantCategory = (typeof GRANT_CATEGORIES)[number];

/** Startup stage targeted by grant. */
export const GRANT_TARGET_STAGES = [
  'IDEA',
  'PRE_MVP',
  'MVP',
  'GROWTH',
  'SCALE',
] as const;

export type GrantTargetStage = (typeof GRANT_TARGET_STAGES)[number];

/** Type of support provided. */
export const GRANT_SUPPORT_TYPES = [
  'FUNDING',
  'CONSULTING',
  'EDUCATION',
  'SPACE',
  'MARKETING',
  'RND',
] as const;

export type GrantSupportType = (typeof GRANT_SUPPORT_TYPES)[number];

/** Grant application window status. */
export const GRANT_STATUSES = ['OPEN', 'CLOSED', 'PREPARING'] as const;

export type GrantStatus = (typeof GRANT_STATUSES)[number];

/** Government grant — support program linked to startup project. */
export type GovernmentGrant = {
  id: ID;
  projectId: ID;
  name: string;
  organization: string;
  description: string | null;
  category: GrantCategory | null;
  targetStage: GrantTargetStage | null;
  supportType: GrantSupportType | null;
  amount: string | null;
  deadline: ISODateString | null;
  eligibility: string | null;
  applicationUrl: string | null;
  fitScore: number | null;
  status: GrantStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateGovernmentGrantInput = {
  projectId: ID;
  name: string;
  organization: string;
  description?: string | null;
  category?: GrantCategory | null;
  targetStage?: GrantTargetStage | null;
  supportType?: GrantSupportType | null;
  amount?: string | null;
  deadline?: ISODateString | null;
  eligibility?: string | null;
  applicationUrl?: string | null;
  fitScore?: number | null;
  status?: GrantStatus;
};

export type UpdateGovernmentGrantInput = {
  name?: string;
  organization?: string;
  description?: string | null;
  category?: GrantCategory | null;
  targetStage?: GrantTargetStage | null;
  supportType?: GrantSupportType | null;
  amount?: string | null;
  deadline?: ISODateString | null;
  eligibility?: string | null;
  applicationUrl?: string | null;
  fitScore?: number | null;
  status?: GrantStatus;
};

export type GrantListFilter = {
  category?: GrantCategory;
  targetStage?: GrantTargetStage;
  supportType?: GrantSupportType;
  status?: GrantStatus;
};

export type GrantDeadlineItem = {
  id: ID;
  name: string;
  organization: string;
  deadline: ISODateString;
  status: GrantStatus;
  fitScore: number | null;
};

/** Aggregated grant analytics for dashboard. */
export type GrantDashboard = {
  totalCount: number;
  averageFitScore: number | null;
  supportTypeDistribution: VOCDistributionItem[];
  statusDistribution: VOCDistributionItem[];
  deadlines: GrantDeadlineItem[];
};

/** @deprecated Use GovernmentGrant */
export type Grant = GovernmentGrant;

/** Validation decision outcome. */
export const VALIDATION_DECISIONS = [
  'DRAFT',
  'GO',
  'CONDITIONAL_GO',
  'NO_GO',
] as const;

export type ValidationDecision = (typeof VALIDATION_DECISIONS)[number];

/** Validation score — GO / NO GO evaluation for a startup project. */
export type ValidationScore = {
  id: ID;
  projectId: ID;
  marketScore: number;
  problemScore: number;
  competitionScore: number;
  businessModelScore: number;
  executionScore: number;
  founderFitScore: number;
  totalScore: number;
  decision: ValidationDecision;
  comment: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateValidationScoreInput = {
  projectId: ID;
  marketScore: number;
  problemScore: number;
  competitionScore: number;
  businessModelScore: number;
  executionScore: number;
  founderFitScore: number;
  comment?: string | null;
};

export type UpdateValidationScoreInput = {
  marketScore?: number;
  problemScore?: number;
  competitionScore?: number;
  businessModelScore?: number;
  executionScore?: number;
  founderFitScore?: number;
  comment?: string | null;
};

export type ValidationScoreCategory = {
  key:
    | 'marketScore'
    | 'problemScore'
    | 'competitionScore'
    | 'businessModelScore'
    | 'executionScore'
    | 'founderFitScore';
  label: string;
  description: string;
  maxScore: number;
};

/** @deprecated Use ValidationScore */
export type Score = ValidationScore;

/** Report workflow status. */
export const REPORT_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Validation report section type. */
export const REPORT_SECTION_TYPES = [
  'EXECUTIVE_SUMMARY',
  'PROBLEM',
  'MARKET_ANALYSIS',
  'CUSTOMER_ANALYSIS',
  'COMPETITOR_ANALYSIS',
  'BUSINESS_MODEL',
  'GOVERNMENT_SUPPORT',
  'VALIDATION_RESULT',
  'RISK',
  'NEXT_ACTION',
] as const;

export type ReportSectionType = (typeof REPORT_SECTION_TYPES)[number];

/** Startup validation report — structured document for a project. */
export type ValidationReport = {
  id: ID;
  projectId: ID;
  title: string;
  status: ReportStatus;
  summary: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateValidationReportInput = {
  projectId: ID;
  title: string;
  status?: ReportStatus;
  summary?: string | null;
};

export type UpdateValidationReportInput = {
  title?: string;
  status?: ReportStatus;
  summary?: string | null;
};

/** Section within a validation report. */
export type ReportSection = {
  id: ID;
  reportId: ID;
  sectionType: ReportSectionType;
  title: string;
  content: string;
  order: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateReportSectionInput = {
  reportId: ID;
  sectionType: ReportSectionType;
  title: string;
  content?: string;
  order: number;
};

export type UpdateReportSectionInput = {
  title?: string;
  content?: string;
  order?: number;
};

export type ValidationReportWithSections = ValidationReport & {
  sections: ReportSection[];
};

/** @deprecated Use ValidationReport */
export type Report = ValidationReport;

/** AI report generation status. */
export const AI_GENERATION_STATUSES = [
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export type AIReportGenerationStatus = (typeof AI_GENERATION_STATUSES)[number];

/** AI report generation job record. */
export type AIReportGeneration = {
  id: ID;
  projectId: ID;
  reportId: ID;
  provider: string;
  model: string;
  status: AIReportGenerationStatus;
  errorMessage: string | null;
  createdAt: ISODateString;
};

export type CreateAIReportGenerationInput = {
  projectId: ID;
  reportId: ID;
  provider: string;
  model: string;
  status?: AIReportGenerationStatus;
  errorMessage?: string | null;
};

export type UpdateAIReportGenerationInput = {
  status?: AIReportGenerationStatus;
  errorMessage?: string | null;
  provider?: string;
  model?: string;
};

/** Project data assembled for AI validation report generation. */
export type ValidationReportContext = {
  project: {
    title: string;
    summary: string;
    problem: string | null;
    solution: string | null;
    targetCustomer: string | null;
    industry: string | null;
    businessModel: string | null;
    status: StartupProjectStatus;
  };
  researchPlans: Array<{
    title: string;
    researchType: ResearchType;
    status: ResearchPlanStatus;
    priority: ResearchPriority;
    description: string | null;
  }>;
  evidence: Array<{
    title: string;
    category: EvidenceCategory;
    summary: string;
    confidence: EvidenceConfidence;
    sourceType: EvidenceSourceType | null;
  }>;
  competitors: Array<{
    name: string;
    category: CompetitorCategory;
    strengths: string | null;
    weaknesses: string | null;
    differentiation: string | null;
    businessModel: string | null;
  }>;
  voc: Array<{
    title: string;
    painPoint: string;
    severity: VOCSeverity | null;
    frequency: VOCFrequency | null;
    willingnessToPay: VOCWillingnessToPay;
  }>;
  grants: Array<{
    name: string;
    organization: string;
    category: GrantCategory | null;
    fitScore: number | null;
    status: GrantStatus;
  }>;
  validationScore: {
    totalScore: number;
    decision: ValidationDecision;
    marketScore: number;
    problemScore: number;
    competitionScore: number;
    businessModelScore: number;
    executionScore: number;
    founderFitScore: number;
    comment: string | null;
  } | null;
};

/** AI-generated validation report output shape. */
export type AIValidationReportOutput = {
  summary: string;
  sections: Array<{
    type: ReportSectionType;
    title: string;
    content: string;
  }>;
};

/** Business plan workflow status. */
export const BUSINESS_PLAN_STATUSES = ['DRAFT', 'GENERATING', 'COMPLETED'] as const;

export type BusinessPlanStatus = (typeof BUSINESS_PLAN_STATUSES)[number];

/** Business plan section type. */
export const BUSINESS_PLAN_SECTION_TYPES = [
  'OVERVIEW',
  'BACKGROUND',
  'PROBLEM',
  'MARKET',
  'CUSTOMER',
  'SOLUTION',
  'PRODUCT',
  'COMPETITION',
  'BUSINESS_MODEL',
  'GROWTH',
  'MARKETING',
  'OPERATION',
  'TECHNOLOGY',
  'GOVERNMENT',
  'RISK',
  'ROADMAP',
] as const;

export type BusinessPlanSectionType = (typeof BUSINESS_PLAN_SECTION_TYPES)[number];

/** Business plan — investor / grant submission document. */
export type BusinessPlan = {
  id: ID;
  projectId: ID;
  title: string;
  status: BusinessPlanStatus;
  summary: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateBusinessPlanInput = {
  projectId: ID;
  title: string;
  status?: BusinessPlanStatus;
  summary?: string | null;
};

export type UpdateBusinessPlanInput = {
  title?: string;
  status?: BusinessPlanStatus;
  summary?: string | null;
};

/** Section within a business plan. */
export type BusinessPlanSection = {
  id: ID;
  businessPlanId: ID;
  sectionType: BusinessPlanSectionType;
  title: string;
  content: string;
  order: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateBusinessPlanSectionInput = {
  businessPlanId: ID;
  sectionType: BusinessPlanSectionType;
  title: string;
  content?: string;
  order: number;
};

export type UpdateBusinessPlanSectionInput = {
  title?: string;
  content?: string;
  order?: number;
};

export type BusinessPlanWithSections = BusinessPlan & {
  sections: BusinessPlanSection[];
};

/** Extended context for business plan AI generation. */
export type BusinessPlanContext = ValidationReportContext & {
  validationReport: {
    title: string;
    summary: string | null;
    sections: Array<{
      sectionType: ReportSectionType;
      title: string;
      content: string;
    }>;
  } | null;
};

/** AI-generated business plan output shape. */
export type AIBusinessPlanOutput = {
  title: string;
  sections: Array<{
    type: BusinessPlanSectionType;
    title: string;
    content: string;
  }>;
};

/** PRD workflow status. */
export const PRD_STATUSES = ['DRAFT', 'GENERATING', 'COMPLETED'] as const;

export type PRDStatus = (typeof PRD_STATUSES)[number];

/** PRD section type. */
export const PRD_SECTION_TYPES = [
  'PRODUCT_OVERVIEW',
  'PROBLEM_DEFINITION',
  'TARGET_USER',
  'USER_PERSONA',
  'USER_FLOW',
  'FEATURE_REQUIREMENTS',
  'FUNCTIONAL_REQUIREMENTS',
  'NON_FUNCTIONAL_REQUIREMENTS',
  'MVP_SCOPE',
  'TECH_REQUIREMENTS',
  'DATABASE_DESIGN',
  'API_SPECIFICATION',
  'EDGE_CASE',
  'ROADMAP',
] as const;

export type PRDSectionType = (typeof PRD_SECTION_TYPES)[number];

/** Product Requirements Document. */
export type PRD = {
  id: ID;
  projectId: ID;
  title: string;
  status: PRDStatus;
  summary: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreatePRDInput = {
  projectId: ID;
  title: string;
  status?: PRDStatus;
  summary?: string | null;
};

export type UpdatePRDInput = {
  title?: string;
  status?: PRDStatus;
  summary?: string | null;
};

/** Section within a PRD. */
export type PRDSection = {
  id: ID;
  prdId: ID;
  sectionType: PRDSectionType;
  title: string;
  content: string;
  order: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreatePRDSectionInput = {
  prdId: ID;
  sectionType: PRDSectionType;
  title: string;
  content?: string;
  order: number;
};

export type UpdatePRDSectionInput = {
  title?: string;
  content?: string;
  order?: number;
};

export type PRDWithSections = PRD & {
  sections: PRDSection[];
};

/** Extended context for PRD AI generation. */
export type PRDContext = BusinessPlanContext & {
  businessPlan: {
    title: string;
    summary: string | null;
    sections: Array<{
      sectionType: BusinessPlanSectionType;
      title: string;
      content: string;
    }>;
  } | null;
};

/** AI-generated PRD output shape. */
export type AIPRDOutput = {
  title: string;
  sections: Array<{
    type: PRDSectionType;
    title: string;
    content: string;
  }>;
};

/** Development Spec workflow status. */
export const DEVELOPMENT_SPEC_STATUSES = ['DRAFT', 'GENERATING', 'COMPLETED'] as const;

export type DevelopmentSpecStatus = (typeof DEVELOPMENT_SPEC_STATUSES)[number];

/** Development Spec section type. */
export const DEVELOPMENT_SPEC_SECTION_TYPES = [
  'SYSTEM_OVERVIEW',
  'TECH_STACK',
  'ARCHITECTURE',
  'DATABASE_SCHEMA',
  'API_SPECIFICATION',
  'FRONTEND_STRUCTURE',
  'BACKEND_STRUCTURE',
  'AUTH_DESIGN',
  'SECURITY',
  'DEPLOYMENT',
  'TEST_PLAN',
  'SPRINT_PLAN',
  'DEVELOPMENT_GUIDE',
] as const;

export type DevelopmentSpecSectionType = (typeof DEVELOPMENT_SPEC_SECTION_TYPES)[number];

/** Engineering / development specification document. */
export type DevelopmentSpec = {
  id: ID;
  projectId: ID;
  prdId: ID;
  title: string;
  status: DevelopmentSpecStatus;
  summary: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateDevelopmentSpecInput = {
  projectId: ID;
  prdId: ID;
  title: string;
  status?: DevelopmentSpecStatus;
  summary?: string | null;
};

export type UpdateDevelopmentSpecInput = {
  title?: string;
  status?: DevelopmentSpecStatus;
  summary?: string | null;
};

/** Section within a development specification. */
export type DevelopmentSpecSection = {
  id: ID;
  developmentSpecId: ID;
  sectionType: DevelopmentSpecSectionType;
  title: string;
  content: string;
  order: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateDevelopmentSpecSectionInput = {
  developmentSpecId: ID;
  sectionType: DevelopmentSpecSectionType;
  title: string;
  content?: string;
  order: number;
};

export type UpdateDevelopmentSpecSectionInput = {
  title?: string;
  content?: string;
  order?: number;
};

export type DevelopmentSpecWithSections = DevelopmentSpec & {
  sections: DevelopmentSpecSection[];
};

/** Extended context for Development Spec AI generation. */
export type DevelopmentSpecContext = PRDContext & {
  prd: {
    id: ID;
    title: string;
    summary: string | null;
    sections: Array<{
      sectionType: PRDSectionType;
      title: string;
      content: string;
    }>;
  } | null;
};

/** AI-generated Development Spec output shape. */
export type AIDevelopmentSpecOutput = {
  title: string;
  sections: Array<{
    type: DevelopmentSpecSectionType;
    title: string;
    content: string;
  }>;
};

/** Knowledge document processing status. */
export const KNOWLEDGE_DOCUMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export type KnowledgeDocumentStatus = (typeof KNOWLEDGE_DOCUMENT_STATUSES)[number];

/** Source type for knowledge documents. */
export const KNOWLEDGE_SOURCE_TYPES = ['EVIDENCE'] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/** Indexed knowledge document derived from project data. */
export type KnowledgeDocument = {
  id: ID;
  projectId: ID;
  sourceType: KnowledgeSourceType;
  sourceId: ID;
  title: string;
  content: string;
  status: KnowledgeDocumentStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateKnowledgeDocumentInput = {
  projectId: ID;
  sourceType: KnowledgeSourceType;
  sourceId: ID;
  title: string;
  content: string;
  status?: KnowledgeDocumentStatus;
};

export type UpdateKnowledgeDocumentInput = {
  title?: string;
  content?: string;
  status?: KnowledgeDocumentStatus;
};

/** Chunk within a knowledge document for retrieval. */
export type KnowledgeChunk = {
  id: ID;
  documentId: ID;
  content: string;
  chunkIndex: number;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: ISODateString;
};

export type CreateKnowledgeChunkInput = {
  documentId: ID;
  content: string;
  chunkIndex: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
};

/** Knowledge query result returned to UI. */
export type KnowledgeResult = {
  title: string;
  content: string;
  source: string;
  score: number;
  documentId?: ID;
  chunkId?: ID;
};

/** Context for validation agent — project data + knowledge retrieval. */
export type ValidationAgentContext = ValidationReportContext & {
  knowledgeResults: KnowledgeResult[];
  userQuestion: string;
};

/** Cited source in agent response. */
export type ValidationAgentSource = {
  title: string;
  source: string;
  excerpt: string;
  score?: number;
};

/** AI validation agent output shape. */
export type ValidationAgentOutput = {
  recommendation: string;
  summary: string;
  decision: 'GO' | 'CONDITIONAL GO' | 'NO GO' | 'INSUFFICIENT DATA';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: ValidationAgentSource[];
  nextActions: string[];
};
