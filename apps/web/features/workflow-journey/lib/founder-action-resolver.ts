import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import type { GeneratedTodayAction } from './founder-intelligence-engine';
import type { MemoryGeneratedAction } from './founder-memory-store';

export type ActionWorkspaceKind = 'interview' | 'pricing' | 'competitor' | 'landing' | 'generic';

export type ResolvedActionWorkspace = {
  actionId: string;
  title: string;
  titleKey?: string;
  titleParams?: Record<string, string | number>;
  kind: ActionWorkspaceKind;
  questionKeys: string[];
  goImpact: number;
  etaMinutes: number;
};

const INTERVIEW_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const PRICING_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
const COMPETITOR_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;
const LANDING_KEYS = ['l1', 'l2', 'l3', 'l4'] as const;

function inferKind(haystack: string): ActionWorkspaceKind {
  const lower = haystack.toLowerCase();
  if (
    lower.includes('interview') ||
    lower.includes('고객') ||
    lower.includes('voc') ||
    lower.includes('인터뷰')
  ) {
    return 'interview';
  }
  if (lower.includes('pric') || lower.includes('가격')) return 'pricing';
  if (lower.includes('compet') || lower.includes('경쟁')) return 'competitor';
  if (lower.includes('landing') || lower.includes('랜딩') || lower.includes('mvp')) {
    return 'landing';
  }
  return 'generic';
}

function questionKeysForKind(kind: ActionWorkspaceKind): string[] {
  switch (kind) {
    case 'pricing':
      return [...PRICING_KEYS];
    case 'competitor':
      return [...COMPETITOR_KEYS];
    case 'landing':
      return [...LANDING_KEYS];
    case 'interview':
    case 'generic':
    default:
      return [...INTERVIEW_KEYS];
  }
}

export function resolveActionWorkspace(
  action: GeneratedTodayAction,
  memoryAction?: MemoryGeneratedAction,
): ResolvedActionWorkspace {
  const pipeline = loadAgentPipelineResult();
  const title = action.title ?? '';
  const titleKey = action.titleKey;
  const titleParams = action.titleParams;

  const haystack = `${action.id} ${title} ${action.titleKey ?? ''}`;
  let kind = inferKind(haystack);

  const pipelineQuestions = pipeline?.memory?.generatedAction?.questions;
  if (pipelineQuestions && pipelineQuestions.length > 0 && kind === 'interview') {
    return {
      actionId: action.id,
      title: pipeline.memory!.generatedAction!.actionTitle || title,
      titleKey,
      titleParams,
      kind: 'interview',
      questionKeys: pipelineQuestions.map((_, index) => `pipeline_${index + 1}`),
      goImpact: action.goImpact,
      etaMinutes: action.etaMinutes,
    };
  }

  if (memoryAction?.pipelineAction?.questions.length) {
    return {
      actionId: action.id,
      title: memoryAction.pipelineAction.actionTitle || title,
      titleKey,
      titleParams,
      kind: 'interview',
      questionKeys: memoryAction.pipelineAction.questions.map((_, index) => `pipeline_${index + 1}`),
      goImpact: action.goImpact,
      etaMinutes: action.etaMinutes,
    };
  }

  if (kind === 'generic' && action.order === 1) {
    kind = 'interview';
  }

  return {
    actionId: action.id,
    title,
    titleKey,
    titleParams,
    kind,
    questionKeys: questionKeysForKind(kind),
    goImpact: action.goImpact,
    etaMinutes: action.etaMinutes,
  };
}

export function resolveActionById(
  actionId: string,
  actions: GeneratedTodayAction[],
  memoryAction?: MemoryGeneratedAction,
): ResolvedActionWorkspace | null {
  const action = actions.find((item) => item.id === actionId);
  if (!action) return null;
  return resolveActionWorkspace(action, memoryAction);
}
