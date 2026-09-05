import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { UnderstandingPhase } from './business-understanding-store';
import { memoryHasFact, type ConversationMemory } from './conversation-memory';
import {
  confidenceFromProvenance,
  type UnderstandingConfidence,
  type UnderstandingProvenance,
} from './understanding-contract';
import {
  isWorkspaceDocumentReadable,
  looksLikeDocumentFileName,
} from './workspace-document-eligibility';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** S8-1 — always-on contract: business · customer · problem only. */
export type WorkspaceSharedUnderstanding = {
  business: string;
  customer: string;
  problem: string;
};

/** Long Sprint Spine — values + provenance/confidence for UI honesty. */
export type WorkspaceUnderstandingSpine = WorkspaceSharedUnderstanding & {
  provenance: Record<keyof WorkspaceSharedUnderstanding, UnderstandingProvenance>;
  confidence: Record<keyof WorkspaceSharedUnderstanding, UnderstandingConfidence>;
  /** ✔ known · ● in progress · ○ unknown */
  marks: Record<keyof WorkspaceSharedUnderstanding, 'known' | 'progress' | 'unknown'>;
};

export const SHARED_UNDERSTANDING_PENDING = '아직 확인 중';

export const SHARED_UNDERSTANDING_UNREADABLE_BUSINESS =
  '아직 문서에서 사업 내용을 충분히 이해하지 못했습니다';

function truncate(text: string, max = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function safeBusinessLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length < 2) return null;
  if (looksLikeDocumentFileName(trimmed)) return null;
  return truncate(trimmed, 48);
}

function isPending(value: string): boolean {
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed === SHARED_UNDERSTANDING_PENDING ||
    trimmed === SHARED_UNDERSTANDING_UNREADABLE_BUSINESS
  );
}

function resolveBusinessField(
  documentText: string,
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding | null,
  readable: boolean,
  memory?: ConversationMemory | null,
): { value: string; provenance: UnderstandingProvenance } {
  if (memory && memoryHasFact(memory, 'business')) {
    const current = memory.facts.find(
      (f) => f.key === 'business' && (f.lifecycle ?? 'current') === 'current',
    );
    const docBusiness = memory.facts.find(
      (f) =>
        f.key === 'business' &&
        f.source === 'document' &&
        (f.lifecycle === 'current' || f.lifecycle === 'superseded'),
    );
    // LS-2 — solution turns must not replace document business one-liner in spine
    const fact =
      current?.source === 'user_turn' && docBusiness?.value.trim()
        ? docBusiness
        : current ?? docBusiness;
    if (fact?.value.trim()) {
      return {
        value: truncate(fact.value, 48),
        provenance: fact.source === 'user_turn' ? 'USER_CONFIRMED' : 'DOCUMENT',
      };
    }
  }

  if (!readable) {
    return {
      value: SHARED_UNDERSTANDING_UNREADABLE_BUSINESS,
      provenance: 'UNKNOWN',
    };
  }

  const fromEntity =
    safeBusinessLabel(entities?.product.value) ??
    safeBusinessLabel(entities?.business.value) ??
    safeBusinessLabel(entities?.business.name);
  if (fromEntity) {
    const basis = entities?.business.basis ?? entities?.product.basis;
    return {
      value: fromEntity,
      provenance: basis === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
    };
  }

  if (understanding?.business.value?.trim()) {
    const fromUnderstanding = safeBusinessLabel(understanding.business.value);
    if (fromUnderstanding) {
      return {
        value: fromUnderstanding,
        provenance:
          understanding.business.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
      };
    }
  }

  const solutionMatch = documentText.match(/(?:솔루션|서비스|제품|사업)[:\s]*([^\n#]{4,48})/i);
  if (solutionMatch?.[1]) {
    const fromDoc = safeBusinessLabel(solutionMatch[1]);
    if (fromDoc) return { value: fromDoc, provenance: 'DOCUMENT' };
  }

  const firstLine = documentText
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length >= 4);
  const fromLine = safeBusinessLabel(firstLine);
  if (fromLine) return { value: fromLine, provenance: 'DOCUMENT' };

  return { value: SHARED_UNDERSTANDING_PENDING, provenance: 'UNKNOWN' };
}

function resolveCustomerField(
  turns: AiPmLoopTurn[],
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding | null,
  memory?: ConversationMemory | null,
): { value: string; provenance: UnderstandingProvenance } {
  if (memory && memoryHasFact(memory, 'customer')) {
    const fact = memory.facts.find((f) => f.key === 'customer');
    if (fact?.value.trim()) {
      const correctedTurn = [...turns]
        .reverse()
        .find(
          (turn) =>
            !turn.superseded &&
            turn.intent === 'correction' &&
            (turn.semanticFactKey === 'customer' ||
              turn.semanticFactKeys?.includes('customer')),
        );
      return {
        value: truncate(fact.value, 48),
        provenance: correctedTurn ? 'USER_CORRECTED' : 'USER_CONFIRMED',
      };
    }
  }

  const customerTurn = turns.find(
    (turn) =>
      !turn.superseded &&
      (turn.semanticFactKey === 'customer' ||
        (turn.semanticFactKey == null &&
          turn.issueId === 'customer_definition' &&
          !/(결제|지불|payer)/i.test(turn.answer))),
  );
  if (customerTurn?.answer.trim()) {
    return {
      value: truncate(customerTurn.answer.replace(/\s+/g, ' '), 48),
      provenance: 'USER_CONFIRMED',
    };
  }

  const fromEntity = safeBusinessLabel(entities?.customer.value);
  if (fromEntity) {
    return {
      value: fromEntity,
      provenance: entities?.customer.basis === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
    };
  }

  if (understanding?.customer.value?.trim()) {
    const fromUnderstanding = safeBusinessLabel(understanding.customer.value);
    if (fromUnderstanding) {
      return {
        value: fromUnderstanding,
        provenance:
          understanding.customer.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
      };
    }
  }

  if (understanding && understanding.customerMentions.length > 0) {
    return {
      value: truncate(
        understanding.customerMentions
          .slice(0, 2)
          .map((mention) => mention.label)
          .join(' · '),
        48,
      ),
      provenance: 'AI_INFERENCE',
    };
  }

  return { value: SHARED_UNDERSTANDING_PENDING, provenance: 'UNKNOWN' };
}

function resolveProblemField(
  turns: AiPmLoopTurn[],
  understanding: BusinessUnderstanding | null,
  memory?: ConversationMemory | null,
): { value: string; provenance: UnderstandingProvenance } {
  if (memory && memoryHasFact(memory, 'problem')) {
    const fact = memory.facts.find((f) => f.key === 'problem');
    if (fact?.value.trim()) {
      return {
        value: truncate(fact.value, 48),
        provenance: fact.source === 'user_turn' ? 'USER_CONFIRMED' : 'DOCUMENT',
      };
    }
  }

  const problemTurn = turns.find(
    (turn) =>
      !turn.superseded &&
      (turn.semanticFactKey === 'problem' ||
        (turn.semanticFactKey == null && turn.issueId === 'problem_definition')),
  );
  if (problemTurn?.answer.trim()) {
    return {
      value: truncate(problemTurn.answer, 48),
      provenance: 'USER_CONFIRMED',
    };
  }

  if (understanding?.problem.value?.trim()) {
    return {
      value: truncate(understanding.problem.value, 48),
      provenance:
        understanding.problem.status === 'document' ? 'DOCUMENT' : 'AI_INFERENCE',
    };
  }

  return { value: SHARED_UNDERSTANDING_PENDING, provenance: 'UNKNOWN' };
}

function markFor(
  value: string,
  provenance: UnderstandingProvenance,
): 'known' | 'progress' | 'unknown' {
  if (isPending(value) || provenance === 'UNKNOWN') return 'unknown';
  if (provenance === 'USER_CONFIRMED' || provenance === 'USER_CORRECTED') return 'known';
  return 'progress';
}

/** Long Sprint Spine with provenance — use for UI honesty. */
export function buildUnderstandingSpine(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding | null;
  entities: LaunchLensDomainContext | null;
  understandingPhase?: UnderstandingPhase;
  memory?: ConversationMemory | null;
}): WorkspaceUnderstandingSpine | null {
  const text = input.documentText.trim();
  if (text.length < 8 || !input.understanding) return null;

  const readable = isWorkspaceDocumentReadable(text);
  const business = resolveBusinessField(
    text,
    input.entities,
    input.understanding,
    readable,
    input.memory,
  );
  const customer = resolveCustomerField(
    input.turns,
    input.entities,
    input.understanding,
    input.memory,
  );
  const problem = resolveProblemField(input.turns, input.understanding, input.memory);

  const provenance = {
    business: business.provenance,
    customer: customer.provenance,
    problem: problem.provenance,
  } as const;

  return {
    business: business.value,
    customer: customer.value,
    problem: problem.value,
    provenance,
    confidence: {
      business: confidenceFromProvenance(provenance.business),
      customer: confidenceFromProvenance(provenance.customer),
      problem: confidenceFromProvenance(provenance.problem),
    },
    marks: {
      business: markFor(business.value, provenance.business),
      customer: markFor(customer.value, provenance.customer),
      problem: markFor(problem.value, provenance.problem),
    },
  };
}

/** Spine — recomputed whenever workspace state derives (incl. every loop turn). */
export function buildSharedUnderstanding(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding | null;
  entities: LaunchLensDomainContext | null;
  understandingPhase?: UnderstandingPhase;
  memory?: ConversationMemory | null;
}): WorkspaceSharedUnderstanding | null {
  const spine = buildUnderstandingSpine(input);
  if (!spine) return null;
  return {
    business: spine.business,
    customer: spine.customer,
    problem: spine.problem,
  };
}
