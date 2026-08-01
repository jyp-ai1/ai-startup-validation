import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import {
  ISSUE_TO_AI_PM_PHASE,
  ISSUE_TO_HISTORY_EVENT,
  type AiPmPhaseId,
  type WorkspaceHistoryEvent,
  type WorkspacePersistedFacts,
} from '@/lib/project/workspace-persisted-facts';

import { resolveNextLoopIssue } from './resolve-ai-pm-priority-issue';
import type { AiPmLoopIssueId, AiPmLoopState } from './workspace-ai-pm-loop-types';

function buildCompletedSteps(
  documentText: string | undefined,
  loop: AiPmLoopState,
): AiPmPhaseId[] {
  const completed: AiPmPhaseId[] = [];
  if ((documentText?.trim().length ?? 0) >= 8) completed.push('intake');
  if (loop.readingCompleted || loop.dismissedReadAck || loop.turns.length > 0) {
    completed.push('ai_read');
  }

  for (const turn of loop.turns) {
    const phase = ISSUE_TO_AI_PM_PHASE[turn.issueId];
    if (!completed.includes(phase)) completed.push(phase);
  }

  if (loop.phase === 'complete') completed.push('review');

  return completed;
}

function buildHistory(
  documentText: string | undefined,
  loop: AiPmLoopState,
  reviewCount: number,
): WorkspaceHistoryEvent[] {
  const history: WorkspaceHistoryEvent[] = [];

  if ((documentText?.trim().length ?? 0) >= 8) {
    history.push('intake_completed');
  }
  if (loop.readingCompleted || loop.dismissedReadAck || loop.turns.length > 0) {
    history.push('ai_read_completed');
  }

  for (const turn of loop.turns) {
    const event = ISSUE_TO_HISTORY_EVENT[turn.issueId];
    if (!history.includes(event)) history.push(event);
  }

  if (loop.turns.length > 0) {
    history.push('document_updated');
  }

  if (reviewCount > 0) {
    history.push('review_completed');
  }

  return history;
}

/** Persist layer — facts only (DB). */
export function buildWorkspacePersistedFacts(input: {
  documentText?: string;
  loop: AiPmLoopState;
  reviewCount?: number;
}): WorkspacePersistedFacts | undefined {
  const { documentText, loop, reviewCount = 0 } = input;
  const hasActivity =
    (documentText?.trim().length ?? 0) >= 8 ||
    loop.turns.length > 0 ||
    loop.readingCompleted ||
    loop.dismissedReadAck ||
    reviewCount > 0;

  if (!hasActivity) return undefined;

  return {
    version: 2,
    completedSteps: buildCompletedSteps(documentText, loop),
    history: buildHistory(documentText, loop, reviewCount),
    lastActiveAt: new Date().toISOString(),
  };
}

export type AiPmRuntimeJudgment = {
  currentPhase: AiPmPhaseId;
  nextIssueId: AiPmLoopIssueId | null;
  lastCompletedIssueId: AiPmLoopIssueId | null;
  resumeBriefing: string;
  nextQuestion: string;
  reason: string;
  historyLabels: string[];
};

const ISSUE_COPY_KO: Record<
  AiPmLoopIssueId,
  { phaseLabel: string; question: string; reason: string }
> = {
  customer_definition: {
    phaseLabel: '고객 정의',
    question: '누가 실제로 쓰고, 누가 돈을 내는지 알려주세요.',
    reason: '고객 정의가 아직 불완전합니다.',
  },
  problem_definition: {
    phaseLabel: '문제 정의',
    question: '고객이 겪는 핵심 문제를 한 문장으로 적어 주세요.',
    reason: '해결하려는 문제가 한 문장으로 정리되지 않았습니다.',
  },
  bm_design: {
    phaseLabel: '수익 모델',
    question: '어떤 방식으로 돈을 벌 계획인지 알려주세요.',
    reason: '수익 구조 기준이 아직 없습니다.',
  },
  competitor_analysis: {
    phaseLabel: '경쟁사 분석',
    question: '고객이 지금 대신 쓰는 대안은 무엇인가요?',
    reason: '경쟁 구도가 아직 정리되지 않았습니다.',
  },
  market_validation: {
    phaseLabel: '시장 검증',
    question: '시장 규모나 검증 근거를 알려주세요.',
    reason: '시장 가설이 아직 확인되지 않았습니다.',
  },
};

const HISTORY_LABEL_KO: Record<WorkspaceHistoryEvent, string> = {
  intake_completed: '문서 입력 완료',
  ai_read_completed: 'AI Read 완료',
  customer_definition_completed: '고객 정의 완료',
  problem_definition_completed: '문제 정의 완료',
  bm_design_completed: '수익 모델 정리',
  competitor_analysis_completed: '경쟁사 검토',
  market_validation_completed: '시장 검증',
  document_updated: '문서 업데이트',
  review_completed: '사업성 검토',
};

function lastCompletedIssueFromHistory(
  history: WorkspaceHistoryEvent[],
  loop: AiPmLoopState,
): AiPmLoopIssueId | null {
  if (loop.turns.length > 0) {
    return loop.turns[loop.turns.length - 1]!.issueId;
  }

  const issueEvents = history.filter((event) => event.endsWith('_completed') && event !== 'intake_completed' && event !== 'ai_read_completed' && event !== 'review_completed');

  for (let i = issueEvents.length - 1; i >= 0; i -= 1) {
    const event = issueEvents[i]!;
    const match = (Object.entries(ISSUE_TO_HISTORY_EVENT) as [AiPmLoopIssueId, WorkspaceHistoryEvent][]).find(
      ([, value]) => value === event,
    );
    if (match) return match[0];
  }

  return null;
}

function buildResumeBriefing(
  lastCompleted: AiPmLoopIssueId | null,
  nextIssue: AiPmLoopIssueId | null,
): string {
  if (!lastCompleted && !nextIssue) return '';

  const lines = ['안녕하세요.', ''];
  if (lastCompleted) {
    lines.push(`어제 ${ISSUE_COPY_KO[lastCompleted].phaseLabel}까지 정리했습니다.`);
  }
  if (nextIssue) {
    lines.push(
      `오늘은 ${ISSUE_COPY_KO[nextIssue].phaseLabel}를 같이 보면 사업 방향이 더 명확해질 것 같습니다.`,
    );
  }
  return lines.join('\n').trim();
}

/**
 * Runtime layer — judgment regenerated from current document + facts.
 * Never persisted to DB.
 */
export function buildAiPmRuntimeJudgment(input: {
  documentText?: string;
  loop: AiPmLoopState;
  understanding: BusinessUnderstanding;
  facts?: WorkspacePersistedFacts | null;
}): AiPmRuntimeJudgment | null {
  const { documentText, loop, understanding, facts } = input;
  const hasDocument = (documentText?.trim().length ?? 0) >= 8;
  if (!hasDocument) return null;

  const history = facts?.history ?? [];
  const nextIssue = resolveNextLoopIssue(understanding, loop);
  const lastCompleted = lastCompletedIssueFromHistory(history, loop);

  const currentPhase: AiPmPhaseId = nextIssue
    ? ISSUE_TO_AI_PM_PHASE[nextIssue]
    : loop.phase === 'complete'
      ? 'review'
      : lastCompleted
        ? ISSUE_TO_AI_PM_PHASE[lastCompleted]
        : 'ai_read';

  const nextCopy = nextIssue ? ISSUE_COPY_KO[nextIssue] : null;
  const historyLabels = history.map((event) => HISTORY_LABEL_KO[event]);

  return {
    currentPhase,
    nextIssueId: nextIssue,
    lastCompletedIssueId: lastCompleted,
    resumeBriefing: buildResumeBriefing(lastCompleted, nextIssue),
    nextQuestion: nextCopy?.question ?? '',
    reason: nextCopy?.reason ?? '',
    historyLabels,
  };
}
