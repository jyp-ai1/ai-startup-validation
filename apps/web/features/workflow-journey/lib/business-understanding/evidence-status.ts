/**
 * S14 — Evidence Status derived from Conversation Memory (not Loop).
 * Memory = Facts (source). Evidence Status = Confirmed | Assumed | Unknown.
 */
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { EvidenceId, EvidenceMap, EvidenceStatus } from '@/lib/analysis-engine/types';
import {
  getFact,
  memoryHasFact,
  type ConversationMemory,
} from './conversation-memory';

export type WorkspaceEvidenceStatusMap = EvidenceMap;

const REQUIRED_FOR_REVIEW: EvidenceId[] = ['customer', 'problem', 'payer'];

export function deriveEvidenceStatusFromMemory(input: {
  memory: ConversationMemory;
  entities?: LaunchLensDomainContext | null;
}): WorkspaceEvidenceStatusMap {
  const { memory, entities } = input;
  const status: WorkspaceEvidenceStatusMap = {};

  const set = (id: EvidenceId, value: EvidenceStatus) => {
    status[id] = value;
  };

  if (memoryHasFact(memory, 'customer')) set('customer', 'confirmed');
  else if (entities?.customer.basis === 'document' && entities.customer.value?.trim()) {
    set('customer', 'assumed');
  } else set('customer', 'unknown');

  if (memoryHasFact(memory, 'problem')) set('problem', 'confirmed');
  else set('problem', 'unknown');

  if (memoryHasFact(memory, 'buyer')) set('payer', 'confirmed');
  else if (memoryHasFact(memory, 'customer')) {
    // Payer-oriented customer_definition answers also confirm payer path
    set('payer', 'confirmed');
  } else set('payer', 'unknown');

  if (memoryHasFact(memory, 'revenue')) set('revenue', 'confirmed');
  else set('revenue', 'unknown');

  if (memoryHasFact(memory, 'market')) set('market', 'confirmed');
  else if (entities?.market.basis === 'document' && entities.market.value?.trim()) {
    set('market', 'assumed');
  } else set('market', 'unknown');

  if (memoryHasFact(memory, 'competitor')) set('competition', 'confirmed');
  else set('competition', 'unknown');

  return status;
}

export function evidenceStatusOf(
  map: WorkspaceEvidenceStatusMap,
  id: EvidenceId,
): EvidenceStatus {
  return map[id] ?? 'unknown';
}

export function isRequiredReviewEvidenceConfirmed(
  map: WorkspaceEvidenceStatusMap,
): boolean {
  return REQUIRED_FOR_REVIEW.every((id) => evidenceStatusOf(map, id) === 'confirmed');
}

export type ReviewEvidenceGap =
  | 'customer_missing'
  | 'payer_missing'
  | 'problem_missing'
  | null;

/** First missing Required Evidence for Review Gate messaging. */
export function firstReviewEvidenceGap(
  map: WorkspaceEvidenceStatusMap,
): ReviewEvidenceGap {
  if (evidenceStatusOf(map, 'customer') !== 'confirmed') return 'customer_missing';
  if (evidenceStatusOf(map, 'payer') !== 'confirmed') return 'payer_missing';
  if (evidenceStatusOf(map, 'problem') !== 'confirmed') return 'problem_missing';
  return null;
}

export function getConfirmedFactValue(
  memory: ConversationMemory,
  key: 'customer' | 'buyer' | 'problem',
): string | null {
  return getFact(memory, key)?.value.trim() || null;
}
