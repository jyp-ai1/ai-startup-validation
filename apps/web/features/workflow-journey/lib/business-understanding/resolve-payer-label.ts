/**
 * Resolve payer/customer label for question copy.
 * payer exists → payer; else → 고객
 */
import { getFact, type ConversationMemory } from './conversation-memory';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export function resolvePayerLabel(input: {
  turns?: AiPmLoopTurn[];
  memory?: ConversationMemory | null;
}): string {
  const fromBuyer = input.memory ? getFact(input.memory, 'buyer')?.value : null;
  if (fromBuyer?.trim()) return fromBuyer.trim();

  const fromCustomer = input.memory ? getFact(input.memory, 'customer')?.value : null;
  if (fromCustomer?.trim()) return fromCustomer.trim();

  const turns = input.turns ?? [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn?.issueId !== 'customer_definition') continue;
    const answer = turn.answer.trim();
    if (answer.length >= 2) return answer.length > 40 ? `${answer.slice(0, 39).trim()}…` : answer;
  }

  return '고객';
}

export function problemFocusLine(payerLabel: string): string {
  return `${payerLabel}가 왜 돈을 낼 만큼 불편한가`;
}

export function problemQuestionLine(payerLabel: string): string {
  return `${payerLabel}가 왜 돈을 낼 만큼 불편합니까?`;
}
