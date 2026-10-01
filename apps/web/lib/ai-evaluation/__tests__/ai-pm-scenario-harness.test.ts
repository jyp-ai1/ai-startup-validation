import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';
import { runDay8iConversation } from '@/features/workflow-journey/lib/business-understanding/day8i-conversation-harness';

import { AI_EVAL_SCENARIOS } from '../scenarios';

describe('LS-5 AI evaluation harness — grounding scenarios', () => {
  for (const scenario of AI_EVAL_SCENARIOS) {
    it(`${scenario.id}: extracts expected customer/problem signals`, () => {
      const entities = extractDocumentEntities(scenario.documentText);
      const blob = JSON.stringify(entities);
      expect(blob).not.toContain('스마트PM');
      expect(entities.customer.value ?? '').toContain(scenario.expectedCustomerSubstring);
      expect(entities.product.value ?? '').toContain(scenario.expectedProblemSubstring);
    });
  }

  it('clinic-b2b: short conversation has no consecutive identical questions', () => {
    const scenario = AI_EVAL_SCENARIOS[0]!;
    const result = runDay8iConversation({
      projectId: `eval-${scenario.id}`,
      documentText: scenario.documentText,
      steps: [
        { category: 'A_normal', ceoAnswer: '5~30인 피부·치과 원장', note: 'customer' },
        { category: 'A_normal', ceoAnswer: '원장이 직접 지불', note: 'pay' },
      ],
    });
    expect(result.repeatedNextQuestions.length).toBeLessThanOrEqual(1);
  });
});
