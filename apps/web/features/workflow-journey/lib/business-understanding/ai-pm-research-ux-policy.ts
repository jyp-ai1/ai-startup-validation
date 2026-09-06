/**
 * DAY 8-D Phase D — Research intent UX (acknowledgement + question freeze).
 * No Research Engine — CEO-facing copy and question engine stop only.
 */

import { isAiPmResearchUxV1Active } from './ai-pm-research-ux-policy-v1';

export type ResearchTopic = 'competitor' | 'market' | 'general';

const INTERNAL_LEAK_RE =
  /\b(RESEARCH|intent\s*=|gapId|gapState|routing|policy|targetGap|completeness)\b/i;

export function detectResearchTopic(utterance: string): ResearchTopic {
  const t = utterance.trim();
  if (/(경쟁|대안|비슷한\s*서비스|competitor|alternative|rival)/i.test(t)) {
    return 'competitor';
  }
  if (/(시장|market|수요\s*조사|tam|sam)/i.test(t)) {
    return 'market';
  }
  return 'general';
}

export type ResearchAcknowledgement = {
  headline: string;
  detail: string;
  topic: ResearchTopic;
};

/** CEO-facing acknowledgement — no internal meta. */
export function buildResearchAcknowledgement(utterance: string): ResearchAcknowledgement {
  const topic = detectResearchTopic(utterance);
  switch (topic) {
    case 'competitor':
      return {
        topic,
        headline: '알겠습니다. 경쟁·대안 환경을 먼저 확인해볼게요.',
        detail:
          '조사 결과를 정리한 뒤 다시 이어가겠습니다. 지금은 기존 이해를 유지한 채 조사를 준비합니다.',
      };
    case 'market':
      return {
        topic,
        headline: '알겠습니다. 시장·수요 신호를 먼저 살펴볼게요.',
        detail:
          '조사 결과를 정리한 뒤 다시 이어가겠습니다. 지금은 기존 이해를 유지한 채 조사를 준비합니다.',
      };
    default:
      return {
        topic,
        headline: '알겠습니다. 요청하신 내용을 먼저 확인해볼게요.',
        detail:
          '조사 결과를 정리한 뒤 다시 이어가겠습니다. 지금은 기존 이해를 유지한 채 조사를 준비합니다.',
      };
  }
}

export function sanitizeResearchCopyForCeo(text: string): string {
  let t = text.trim();
  if (!t) return t;
  if (INTERNAL_LEAK_RE.test(t)) {
    t = t.replace(INTERNAL_LEAK_RE, '').replace(/\s+/g, ' ').trim();
  }
  return t;
}

/** Legacy stub — Phase D replaces with acknowledgement when flag ON. */
export function researchAcknowledgementMessage(utterance?: string): string {
  if (isAiPmResearchUxV1Active() && utterance?.trim()) {
    return buildResearchAcknowledgement(utterance).headline;
  }
  return '조사 요청을 받았습니다. AI 조사 기능은 준비 중입니다. 지금은 알고 계신 경쟁·대안을 직접 알려 주시면 이해에 반영하겠습니다.';
}

export function isResearchQuestionFrozen(
  researchPending: { requestedAt: string } | null | undefined,
): boolean {
  return Boolean(researchPending?.requestedAt && isAiPmResearchUxV1Active());
}
