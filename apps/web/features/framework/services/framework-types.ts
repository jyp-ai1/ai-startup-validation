import type { AppLocale } from '@repo/i18n/config';
import type { ProjectType, StartupProjectStatus } from '@repo/types/validation';

/** Supported strategy frameworks — analysis modules, not standalone screens. */
export type FrameworkId =
  | 'SWOT'
  | 'PESTEL'
  | 'PORTER'
  | 'THREE_C'
  | 'STP'
  | 'BCG'
  | 'ANSOFF'
  | 'VALUE_CHAIN'
  | 'BMC'
  | 'LEAN_CANVAS'
  | 'JTBD';

export type FrameworkProviderId = 'mock' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export type FrameworkInsight = {
  id: string;
  labelKey: string;
  textKey: string;
};

export type FrameworkEvidenceRef = {
  id: string;
  labelKey: string;
  sourceKey: string;
};

export type FrameworkRecommendation = {
  id: string;
  labelKey: string;
  textKey: string;
  priority: 1 | 2 | 3;
};

/** Common interface — all frameworks return this shape. */
export type FrameworkResult = {
  id: FrameworkId;
  titleKey: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
  score: number;
  confidence: number;
  /** Signed impact on Decision Score (−15 to +15 typical). */
  decisionImpact: number;
  insights: FrameworkInsight[];
  evidence: FrameworkEvidenceRef[];
  recommendations: FrameworkRecommendation[];
  executedAt: string;
};

export type FrameworkAnalysisInput = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  industry: string | null;
  stage: StartupProjectStatus;
  locale: AppLocale;
  research: { total: number; completed: number; progressPercent: number };
  evidence: {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  voc: { total: number };
  competitors: { total: number };
  grants: { total: number; avgFitScore: number | null };
};

export type FrameworkAnalysisResult = {
  frameworks: FrameworkResult[];
  aggregateScore: number;
  aggregateImpact: number;
  executionDurationMs: number;
  providerId: FrameworkProviderId;
  selectedIds: FrameworkId[];
};

export interface FrameworkProvider {
  readonly id: FrameworkProviderId;
  analyze(
    frameworkId: FrameworkId,
    input: FrameworkAnalysisInput,
  ): Promise<FrameworkResult>;
}
