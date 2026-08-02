import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { extractDocumentEntities } from '../domain/extract-document-entities';
import { buildAiPmSharedMemory, type AiPmSharedMemory } from './build-ai-pm-shared-memory';
import { buildAiPmBusinessClarity, type AiPmBusinessClarity } from './build-ai-pm-business-clarity';
import {
  buildAgreement,
  buildQuestionPermission,
  type AiPmAgreement,
} from './build-ai-pm-conversation-rhythm';
import {
  buildPartnerContinuousBridge,
  buildPartnerQuestionLead,
  buildPartnerThinkingBridge,
} from './build-ai-pm-partner-voice';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/**
 * CEO-visible shared thinking — thought arc + collaborative memory (S3).
 * First turn:  제가 문서를 읽다 보니 → 처음에는 → 그런데 → 그래서
 * Next turns:  우리가 배운 것 → co-thinking → Question
 */
export type AiPmSharedThinking = {
  issueId: AiPmLoopIssueId;
  acknowledgment?: string;
  /** S3 — "이제 하나는 명확해졌습니다." */
  learnedLead?: string;
  /** S3 — echo of what we learned together */
  learnedFact?: string;
  /** S3 — "조금 전 답변 덕분에 …" */
  priorityShift?: string;
  initialThought: string;
  rethink: string;
  hypothesisBridge: string;
  agreement: AiPmAgreement;
  questionPermission: string;
  questionLead?: string;
  question: string;
  isContinuous?: boolean;
  sharedMemory?: AiPmSharedMemory | null;
  businessClarity?: AiPmBusinessClarity | null;
};

/** S5.2 — One-line thinking visible to CEO (internal arc stays on the type). */
export function formatCompactThinkingProse(thinking: AiPmSharedThinking): string {
  return thinking.rethink.trim();
}

/** CEO-visible shared thinking — S5.2 compact (one insight line). */
export function formatSharedThinkingProse(thinking: AiPmSharedThinking): string {
  return formatCompactThinkingProse(thinking);
}

const NEXT_FOCUS: Record<AiPmLoopIssueId, string> = {
  customer_definition: '1차 고객',
  problem_definition: '대표가 왜 돈을 낼 만큼 불편한가',
  bm_design: '누가 얼마를 내는지',
  competitor_analysis: '고객이 지금 무엇을 대신 쓰는지',
  market_validation: '왜 지금 이 시장인지',
};

const PRIORITY_SHIFT: Partial<Record<AiPmLoopIssueId, Partial<Record<AiPmLoopIssueId, string>>>> = {
  customer_definition: {
    problem_definition: '조금 전 답변 덕분에 시장보다 문제를 먼저 보는 게 맞다고 판단했습니다.',
    bm_design: '조금 전 답변 덕분에 수익 구조보다 구매자를 먼저 확인하는 게 맞다고 판단했습니다.',
  },
  problem_definition: {
    bm_design: '조금 전 답변 덕분에 문제가 잡힌 지금, 수익 구조를 구체화하는 순서가 맞다고 판단했습니다.',
  },
};

function formatLearnedFact(turn: AiPmLoopTurn): string {
  const answer = turn.answer.trim();
  if (turn.issueId === 'customer_definition' && /구매자|결제|지불|payer/i.test(answer)) {
    return answer.length <= 48 ? answer : `${answer.slice(0, 47).trim()}…`;
  }
  if (turn.issueId === 'problem_definition') {
    return answer.length <= 56 ? answer : `${answer.slice(0, 55).trim()}…`;
  }
  return answer.length <= 40 ? answer : `${answer.slice(0, 39).trim()}…`;
}

function buildThinkingArc(
  issueId: AiPmLoopIssueId,
  initialThought: string,
  rethink: string,
  question: string,
): Omit<AiPmSharedThinking, 'issueId'> {
  return {
    initialThought,
    rethink,
    hypothesisBridge: buildPartnerThinkingBridge(issueId),
    agreement: buildAgreement(issueId),
    questionPermission: buildQuestionPermission(issueId),
    questionLead: buildPartnerQuestionLead(issueId),
    question,
  };
}

function buildCustomerThinking(
  understanding: BusinessUnderstanding,
  documentText: string,
): Omit<AiPmSharedThinking, 'issueId'> {
  const hasBroadCustomer =
    understanding.customerMentions.length >= 2 ||
    understanding.customer.status === 'needs_confirmation' ||
    /중소|제조|기업|스타트업/i.test(
      understanding.customer.value ?? understanding.customerMentions[0]?.label ?? '',
    );
  const payerSparse =
    !/결제|구매|지불|예산|구독|계약|payer|buyer|budget|purchase/gi.test(documentText);

  if (hasBroadCustomer && payerSparse) {
    return buildThinkingArc(
      'customer_definition',
      '처음에는 고객 정의가 부족한 줄 알았습니다.',
      '그런데 다시 보니 고객보다 누가 실제로 돈을 내는지가 더 중요해 보였습니다.',
      '실제로 결제하는 사람은 누구입니까?',
    );
  }

  if (payerSparse) {
    return buildThinkingArc(
      'customer_definition',
      '처음에는 고객만 좁히면 될 줄 알았습니다.',
      '그런데 다시 보니 사용자와 구매자가 같은지부터 확인하는 편이 맞을 것 같습니다.',
      '실제로 결제하는 사람은 누구입니까?',
    );
  }

  return buildThinkingArc(
    'customer_definition',
    '처음에는 고객 후보가 여러 갈래인 줄 알았습니다.',
    '그런데 다시 보니 1차로 집중할 한 명을 먼저 정하는 게 더 급해 보였습니다.',
    '누가 실제 고객입니까?',
  );
}

function buildProblemThinking(documentText: string): Omit<AiPmSharedThinking, 'issueId'> {
  const featureHeavy = /기능|제공|플랫폼|서비스|솔루션|앱|feature|platform/gi.test(
    documentText,
  );

  if (featureHeavy) {
    return buildThinkingArc(
      'problem_definition',
      '처음에는 솔루션 설명이 충분한 줄 알았습니다.',
      '그런데 다시 보니 고객이 겪는 pain 한 문장이 더 급해 보였습니다.',
      '고객이 겪는 핵심 문제를 한 문장으로 적어 주세요.',
    );
  }

  return buildThinkingArc(
    'problem_definition',
    '처음에는 여러 문제를 동시에 풀 수 있을 줄 알았습니다.',
    '그런데 다시 보니 지금 가장 아픈 순간 하나를 먼저 맞추는 게 맞을 것 같습니다.',
    '고객이 겪는 핵심 문제를 한 문장으로 적어 주세요.',
  );
}

function buildBmThinking(documentText: string): Omit<AiPmSharedThinking, 'issueId'> {
  const hasRevenueLang = /수익|매출|구독|요금|가격|bm|revenue|subscription|pricing/gi.test(
    documentText,
  );

  if (hasRevenueLang) {
    return buildThinkingArc(
      'bm_design',
      '처음에는 BM을 먼저 다듬으면 될 줄 알았습니다.',
      '그런데 다시 보니 누가 얼마를 내는지 한 줄로 정리되지 않아 수익 구조가 아직 공중에 떠 있는 것 같습니다.',
      '누가 비용을 지불합니까?',
    );
  }

  return buildThinkingArc(
    'bm_design',
    '처음에는 무엇을 파는지만 정리하면 될 줄 알았습니다.',
    '그런데 다시 보니 어떻게 버는지가 비어 있어 BM을 아직 확정하기 어렵다고 느꼈습니다.',
    '누가 비용을 지불합니까?',
  );
}

function buildCompetitorThinking(
  understanding: BusinessUnderstanding,
  entities: LaunchLensDomainContext | null | undefined,
): Omit<AiPmSharedThinking, 'issueId'> {
  const hasNamedCompetitor =
    entities?.competitor.basis === 'document' && Boolean(entities.competitor.value);

  if (hasNamedCompetitor) {
    return buildThinkingArc(
      'competitor_analysis',
      '처음에는 경쟁사 이름만 정리하면 될 줄 알았습니다.',
      '그런데 다시 보니 고객 입장에서의 대체재(수기·엑셀·기존 업무)가 더 급해 보였습니다.',
      '고객이 지금 대신 쓰는 대안은 무엇인가요?',
    );
  }

  if (understanding.customer.status !== 'document') {
    return buildThinkingArc(
      'customer_definition',
      '처음에는 경쟁사를 찾아야 한다고 생각했습니다.',
      '그런데 다시 보니 아직 고객이 불명확해서 경쟁사 비교는 이른 것 같습니다.',
      '누가 실제 고객입니까?',
    );
  }

  return buildThinkingArc(
    'competitor_analysis',
    '처음에는 “경쟁 없음”이 강점인 줄 알았습니다.',
    '그런데 다시 보니 고객이 실제로 대신 쓰는 것을 아는 편이 설득에 유리할 것 같습니다.',
    '고객이 지금 대신 쓰는 대안은 무엇인가요?',
  );
}

function buildMarketThinking(
  entities: LaunchLensDomainContext | null | undefined,
  documentText: string,
): Omit<AiPmSharedThinking, 'issueId'> {
  const tamLang = /시장|TAM|SAM|조|억|성장|market size/gi.test(documentText);
  const hasMarketDoc = entities?.market.basis === 'document' && Boolean(entities.market.value);

  if (tamLang || hasMarketDoc) {
    return buildThinkingArc(
      'market_validation',
      '처음에는 시장 규모가 핵심인 줄 알았습니다.',
      '그런데 다시 보니 우리 고객과 연결된 “왜 지금”이 더 중요해 보였습니다.',
      '왜 지금 이 시장입니까?',
    );
  }

  return buildThinkingArc(
    'market_validation',
    '처음에는 사업 설명만으로 시장이 전달될 줄 알았습니다.',
    '그런데 다시 보니 “왜 지금 이 시장인가”를 한 줄로 맞추는 게 먼저일 것 같습니다.',
    '왜 지금 이 시장입니까?',
  );
}

/** S3 — Collaborative thinking after CEO answer (we learned → we go next). */
function buildContinuousThinking(
  turns: AiPmLoopTurn[],
  lastTurn: AiPmLoopTurn,
  nextIssueId: AiPmLoopIssueId,
  understanding: BusinessUnderstanding,
  documentText: string,
  entities: LaunchLensDomainContext | null | undefined,
): AiPmSharedThinking {
  const nextFocus = NEXT_FOCUS[nextIssueId];
  const nextBody = buildThinkingForIssue(nextIssueId, understanding, entities, documentText);
  const sharedMemory = buildAiPmSharedMemory(turns, nextIssueId);
  const businessClarity = buildAiPmBusinessClarity({
    documentText,
    turns,
    understanding,
    entities,
  });

  const priorityShift =
    PRIORITY_SHIFT[lastTurn.issueId]?.[nextIssueId] ??
    '방금 정리한 내용 덕분에, 다음 순서를 같이 맞춰 봤습니다.';

  let rethink = `그러면 우리가 같이 볼 건 ${nextFocus}입니다.`;

  if (lastTurn.issueId === 'customer_definition' && nextIssueId === 'problem_definition') {
    rethink = '그러면 우리가 같이 볼 건, 대표가 왜 돈을 낼 만큼 불편한가입니다.';
  }

  const hypothesisBridge = buildPartnerContinuousBridge(nextIssueId);

  return {
    issueId: nextIssueId,
    learnedLead: '이제 하나는 명확해졌습니다.',
    learnedFact: formatLearnedFact(lastTurn),
    initialThought: '',
    rethink,
    priorityShift,
    hypothesisBridge,
    agreement: buildAgreement(nextIssueId),
    questionPermission: buildQuestionPermission(nextIssueId),
    questionLead: buildPartnerQuestionLead(nextIssueId),
    question: nextBody.question,
    isContinuous: true,
    sharedMemory,
    businessClarity,
  };
}

function buildThinkingForIssue(
  issueId: AiPmLoopIssueId,
  understanding: BusinessUnderstanding,
  entities: LaunchLensDomainContext | null | undefined,
  documentText: string,
): Omit<AiPmSharedThinking, 'issueId'> {
  switch (issueId) {
    case 'customer_definition':
      return buildCustomerThinking(understanding, documentText);
    case 'problem_definition':
      return buildProblemThinking(documentText);
    case 'bm_design':
      return buildBmThinking(documentText);
    case 'competitor_analysis':
      return buildCompetitorThinking(understanding, entities);
    case 'market_validation':
      return buildMarketThinking(entities, documentText);
    default:
      return buildThinkingArc(
        issueId,
        '처음에는 문서 전반이 정리된 줄 알았습니다.',
        '그런데 다시 보니 지금 단계에서 먼저 맞추면 좋은 지점이 하나 보였습니다.',
        '조금 더 구체적으로 적어 주시겠어요?',
      );
  }
}

/**
 * Shared Thinking Experience — CEO sees PM thought arc, not observation report.
 * Internal diagnosis picks issueId only; never exposes scores.
 */
export function buildAiPmSharedThinking(input: {
  issueId: AiPmLoopIssueId;
  understanding: BusinessUnderstanding;
  documentText?: string | null;
  entities?: LaunchLensDomainContext | null;
  /** Completed turns — enables S3 collaborative memory + Thinking B. */
  turns?: AiPmLoopTurn[];
  lastTurn?: AiPmLoopTurn | null;
}): AiPmSharedThinking | null {
  const text = input.documentText?.trim() ?? '';
  if (text.length < 8) return null;

  const entities = input.entities ?? extractDocumentEntities(text);
  const turns = input.turns ?? [];
  const lastTurn = input.lastTurn ?? turns.at(-1) ?? null;

  if (lastTurn && lastTurn.issueId !== input.issueId) {
    return buildContinuousThinking(
      turns,
      lastTurn,
      input.issueId,
      input.understanding,
      text,
      entities,
    );
  }

  const body = buildThinkingForIssue(input.issueId, input.understanding, entities, text);

  return {
    issueId: input.issueId,
    ...body,
    isContinuous: false,
  };
}
