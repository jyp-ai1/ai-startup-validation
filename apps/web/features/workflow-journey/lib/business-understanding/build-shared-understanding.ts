import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { UnderstandingPhase } from './business-understanding-store';
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

function resolveBusinessField(
  documentText: string,
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding | null,
  readable: boolean,
): string {
  if (!readable) {
    return SHARED_UNDERSTANDING_UNREADABLE_BUSINESS;
  }

  const fromEntity =
    safeBusinessLabel(entities?.product.value) ??
    safeBusinessLabel(entities?.business.value) ??
    safeBusinessLabel(entities?.business.name);
  if (fromEntity) return fromEntity;

  if (understanding?.business.value?.trim()) {
    const fromUnderstanding = safeBusinessLabel(understanding.business.value);
    if (fromUnderstanding) return fromUnderstanding;
  }

  const solutionMatch = documentText.match(/(?:솔루션|서비스|제품|사업)[:\s]*([^\n#]{4,48})/i);
  if (solutionMatch?.[1]) {
    const fromDoc = safeBusinessLabel(solutionMatch[1]);
    if (fromDoc) return fromDoc;
  }

  const firstLine = documentText
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length >= 4);
  const fromLine = safeBusinessLabel(firstLine);
  if (fromLine) return fromLine;

  return SHARED_UNDERSTANDING_PENDING;
}

function resolveCustomerField(
  turns: AiPmLoopTurn[],
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding | null,
): string {
  const customerTurn = turns.find((turn) => turn.issueId === 'customer_definition');
  if (customerTurn?.answer.trim()) {
    return truncate(customerTurn.answer.replace(/\s+/g, ' '), 48);
  }

  const fromEntity = safeBusinessLabel(entities?.customer.value);
  if (fromEntity) return fromEntity;

  if (understanding?.customer.value?.trim()) {
    const fromUnderstanding = safeBusinessLabel(understanding.customer.value);
    if (fromUnderstanding) return fromUnderstanding;
  }

  if (understanding && understanding.customerMentions.length > 0) {
    return truncate(
      understanding.customerMentions
        .slice(0, 2)
        .map((mention) => mention.label)
        .join(' · '),
      48,
    );
  }

  return SHARED_UNDERSTANDING_PENDING;
}

function resolveProblemField(
  turns: AiPmLoopTurn[],
  understanding: BusinessUnderstanding | null,
): string {
  const problemTurn = turns.find((turn) => turn.issueId === 'problem_definition');
  if (problemTurn?.answer.trim()) {
    return truncate(problemTurn.answer, 48);
  }

  if (understanding?.problem.value?.trim()) {
    return truncate(understanding.problem.value, 48);
  }

  return SHARED_UNDERSTANDING_PENDING;
}

/** Spine — recomputed whenever workspace state derives (incl. every loop turn). */
export function buildSharedUnderstanding(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding | null;
  entities: LaunchLensDomainContext | null;
  understandingPhase?: UnderstandingPhase;
}): WorkspaceSharedUnderstanding | null {
  const text = input.documentText.trim();
  if (text.length < 8 || !input.understanding) return null;

  const readable = isWorkspaceDocumentReadable(text);

  return {
    business: resolveBusinessField(text, input.entities, input.understanding, readable),
    customer: resolveCustomerField(input.turns, input.entities, input.understanding),
    problem: resolveProblemField(input.turns, input.understanding),
  };
}
