import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

/** S5 — Co-Founder voice: companion, not instruction. */
export type AiPmPartnerNext = {
  recap: string;
  insight: string;
  invite: string;
};

const PARTNER_NEXT: Record<
  AiPmLoopIssueId,
  { insight: string; invite?: string }
> = {
  customer_definition: {
    insight: '이제 누가 실제로 돈을 내는지만 잡으면, 사업 그림이 훨씬 선명해질 것 같습니다.',
  },
  problem_definition: {
    insight: '이제 대표가 돈을 낼 만큼 불편한 이유만 찾으면, 사업이 훨씬 선명해질 것 같습니다.',
  },
  bm_design: {
    insight: '이제 누가 얼마를 내는지만 정리하면, 수익 구조가 훨씬 선명해질 것 같습니다.',
  },
  competitor_analysis: {
    insight: '이제 고객이 지금 무엇을 대신 쓰는지만 보면, 설득력이 훨씬 선명해질 것 같습니다.',
  },
  market_validation: {
    insight: '이제 왜 지금 이 시장인지만 맞추면, 타이밍이 훨씬 선명해질 것 같습니다.',
  },
};

const PARTNER_BRIDGE: Record<AiPmLoopIssueId, string> = {
  customer_definition: '구매자',
  problem_definition: '핵심 문제',
  bm_design: '수익 구조',
  competitor_analysis: '대체재',
  market_validation: '시장 타이밍',
};

const PARTNER_QUESTION_LEAD: Partial<Record<AiPmLoopIssueId, string>> = {
  customer_definition: '먼저 한 가지만 같이 맞춰 볼게요.',
  problem_definition: '그다음은 이것만 같이 보면 좋겠습니다.',
  bm_design: '수익 구조를 선명하게 하려면, 이것부터 같이 볼게요.',
  competitor_analysis: '설득을 위해, 이것만 같이 확인해 볼게요.',
  market_validation: '마지막으로 타이밍만 같이 맞춰 볼게요.',
};

/** Header + today block — partner next step after business clarity. */
export function buildPartnerNextStep(
  nextIssueId: AiPmLoopIssueId | null,
  completedTurnCount: number,
  documentReadable = true,
): AiPmPartnerNext | null {
  if (!nextIssueId) return null;

  const template = PARTNER_NEXT[nextIssueId];
  const recap =
    completedTurnCount > 0
      ? '여기까지는 우리가 정리했습니다.'
      : documentReadable
        ? '문서에서 윤곽을 같이 읽었습니다.'
        : '파일명만 확인했습니다. 대표님 답변으로 같이 정리하겠습니다.';

  return {
    recap,
    insight: template.insight,
    invite: template.invite ?? '같이 확인해 볼까요?',
  };
}

/** Thinking arc bridge — invites, does not assign homework. */
export function buildPartnerThinkingBridge(issueId: AiPmLoopIssueId): string {
  const topic = PARTNER_BRIDGE[issueId];
  return `그래서 ${topic}부터 같이 보면, 사업이 한 뼘 더 선명해질 것 같습니다.`;
}

/** Continuous turn bridge after shared memory. */
export function buildPartnerContinuousBridge(nextIssueId: AiPmLoopIssueId): string {
  if (nextIssueId === 'problem_definition') {
    return '그래서 이번엔 문제만 같이 보면, 사업이 한 뼘 더 선명해질 것 같습니다.';
  }
  const topic = PARTNER_BRIDGE[nextIssueId];
  return `그래서 이번엔 ${topic}만 같이 보면, 사업이 한 뼘 더 선명해질 것 같습니다.`;
}

/** Short lead before the question — connects turns without "when does this end?" */
export function buildPartnerQuestionLead(issueId: AiPmLoopIssueId): string {
  return PARTNER_QUESTION_LEAD[issueId] ?? '다음은 이것만 같이 보면 좋겠습니다.';
}

/** Return visit — partner continuation, not task list. */
export function buildPartnerReturnInvite(nextIssueId: AiPmLoopIssueId): string {
  const next = PARTNER_NEXT[nextIssueId];
  return `${next.insight} ${next.invite ?? '같이 확인해 볼까요?'}`;
}

export function formatPartnerNextProse(partner: AiPmPartnerNext): string {
  return [partner.recap, partner.insight, partner.invite].join('\n');
}
