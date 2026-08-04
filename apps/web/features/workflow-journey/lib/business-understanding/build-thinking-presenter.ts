/**
 * S9 Thinking Presenter — ADR-051/052/053
 * Conversation → Memory(Facts) → Presenter → Surface
 * Never read LLM output for UI — always Memory + derived Presenter.
 */
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  getFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import { factKeyForIssue } from './build-conversation-memory';
import {
  isWorkspaceDocumentReadable,
  looksLikeDocumentFileName,
} from './workspace-document-eligibility';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type ThinkingConfidence = 'confirmed' | 'assumed' | 'unknown';

export type ThinkingKnowledgeItem = {
  key: ConversationFactKey;
  label: string;
  value: string | null;
  confidence: ThinkingConfidence;
};

export type ThinkingPresenterModel = {
  /** Confirmed Memory facts — AI가 이해한 것 */
  know: ThinkingKnowledgeItem[];
  /** Working view with confidence (Memory + Assumed from document, never Assumed in Memory) */
  knowledge: ThinkingKnowledgeItem[];
  /** Gaps — AI가 확인이 필요한 것 */
  missing: ThinkingKnowledgeItem[];
  /** AI 판단 — why we ask this question now */
  decision: {
    lead: string;
    detail: string;
  };
  /** Current question binding */
  question: {
    issueId: AiPmLoopIssueId | null;
    factKey: ConversationFactKey | null;
  };
};

const FACT_LABEL: Record<ConversationFactKey, string> = {
  business: '사업',
  customer: '고객',
  problem: '문제',
  buyer: '결제 주체',
  revenue: '수익 모델',
  market: '시장',
  competitor: '경쟁',
};

const DECISION_BY_ISSUE: Record<
  AiPmLoopIssueId,
  { lead: string; detail: string }
> = {
  customer_definition: {
    lead: '대표 고객을 먼저 확인해야 합니다.',
    detail:
      '고객이 Confirmed되지 않으면 시장 검토와 사업성 판단을 시작할 수 없습니다.',
  },
  problem_definition: {
    lead: '해결하는 문제를 먼저 확인해야 합니다.',
    detail: '문제가 Confirmed되어야 고객 가치와 솔루션 적합성을 이어서 검토할 수 있습니다.',
  },
  bm_design: {
    lead: '수익 구조를 먼저 확인해야 합니다.',
    detail: '수익 모델이 없으면 시장 규모만으로 사업성을 판단할 수 없습니다.',
  },
  market_validation: {
    lead: '시장 검증을 위해 전제가 필요합니다.',
    detail: '고객·문제가 잡힌 뒤에 시장 신호로 검증하는 순서가 맞습니다.',
  },
  competitor_analysis: {
    lead: '경쟁 환경을 확인해야 합니다.',
    detail: '대안·경쟁이 비어 있으면 차별화 가설을 세울 수 없습니다.',
  },
};

const CORE_KEYS: ConversationFactKey[] = ['business', 'customer', 'problem', 'revenue', 'market'];

function assumedFromEntities(
  key: ConversationFactKey,
  entities: LaunchLensDomainContext | null,
  documentText: string,
): string | null {
  if (!isWorkspaceDocumentReadable(documentText)) return null;

  const pick = (value: string | null | undefined) => {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length < 2 || looksLikeDocumentFileName(trimmed)) return null;
    return trimmed.replace(/\s+/g, ' ').slice(0, 80);
  };

  switch (key) {
    case 'business':
      return (
        pick(entities?.business.name) ??
        pick(entities?.product.value) ??
        pick(entities?.business.value)
      );
    case 'customer':
      return pick(entities?.customer.value);
    case 'problem':
      return null;
    case 'market':
      return pick(entities?.market.value);
    case 'competitor':
      return pick(entities?.competitor.value);
    case 'revenue':
      return pick(entities?.business.model);
    case 'buyer':
      return null;
    default:
      return null;
  }
}

function buildKnowledgeItem(
  key: ConversationFactKey,
  memory: ConversationMemory,
  entities: LaunchLensDomainContext | null,
  documentText: string,
): ThinkingKnowledgeItem {
  const fact = getFact(memory, key);
  if (fact) {
    return {
      key,
      label: FACT_LABEL[key],
      value: fact.value,
      confidence: 'confirmed',
    };
  }

  const assumed = assumedFromEntities(key, entities, documentText);
  if (assumed) {
    return {
      key,
      label: FACT_LABEL[key],
      value: assumed,
      confidence: 'assumed',
    };
  }

  return {
    key,
    label: FACT_LABEL[key],
    value: null,
    confidence: 'unknown',
  };
}

/**
 * Presenter: Memory → Know / Confidence / Missing / Decision / Question
 */
export function presentThinking(input: {
  memory: ConversationMemory;
  documentText: string;
  entities?: LaunchLensDomainContext | null;
  nextIssueId: AiPmLoopIssueId | null;
}): ThinkingPresenterModel {
  const entities = input.entities ?? null;
  const knowledge = CORE_KEYS.map((key) =>
    buildKnowledgeItem(key, input.memory, entities, input.documentText),
  );

  const know = knowledge.filter((item) => item.confidence === 'confirmed');
  const missing = knowledge.filter((item) => item.confidence !== 'confirmed');

  const issueId = input.nextIssueId;
  const factKey = issueId ? factKeyForIssue(issueId) : null;
  const decisionCopy = issueId
    ? DECISION_BY_ISSUE[issueId]
    : {
        lead: '지금은 확인된 사실만 정리합니다.',
        detail: '다음 질문을 고르기 전에 Memory에 Confirmed 사실을 쌓습니다.',
      };

  // When next issue targets an Assumed item, decision explains re-ask
  if (factKey) {
    const target = knowledge.find((item) => item.key === factKey);
    if (target?.confidence === 'confirmed') {
      return {
        know,
        knowledge,
        missing,
        decision: {
          lead: `${target.label}은(는) 이미 Confirmed입니다.`,
          detail: `Memory에 「${target.value}」로 잠겼습니다. 같은 주제를 다시 묻지 않습니다.`,
        },
        question: { issueId: null, factKey },
      };
    }
    if (target?.confidence === 'assumed') {
      return {
        know,
        knowledge,
        missing,
        decision: {
          lead: `${target.label}은(는) 아직 Assumed입니다.`,
          detail: `문서에서 「${target.value}」로 추정했습니다. Confirmed로 잠그면 다음 단계 판단이 가능합니다.`,
        },
        question: { issueId, factKey },
      };
    }
    if (target?.confidence === 'unknown') {
      return {
        know,
        knowledge,
        missing,
        decision: {
          lead: decisionCopy.lead,
          detail: decisionCopy.detail,
        },
        question: { issueId, factKey },
      };
    }
  }

  return {
    know,
    knowledge,
    missing,
    decision: {
      lead: decisionCopy.lead,
      detail: decisionCopy.detail,
    },
    question: { issueId, factKey },
  };
}
