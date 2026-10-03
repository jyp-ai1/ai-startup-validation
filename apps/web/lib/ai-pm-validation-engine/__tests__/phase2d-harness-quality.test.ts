/**
 * Phase 2-D harness quality — User Agent / sandbox docs only. Same AI PM runtime.
 */
import { describe, expect, it } from 'vitest';

import { isWorkspaceDocumentReadable } from '@/features/workflow-journey/lib/business-understanding/workspace-document-eligibility';

import { generateUserAnswer } from '../deterministic-user-agent';
import { MINI_SANDBOX_BUSINESSES } from '../mini-sandbox-businesses';

const stub = MINI_SANDBOX_BUSINESSES[0]!;

describe('Phase 2-D harness — User Agent copy', () => {
  it('does not emit the English payer placeholder', () => {
    for (const b of MINI_SANDBOX_BUSINESSES) {
      const a = generateUserAnswer({ business: b, behavior: 'multi_fact', turn: 1, askedGapId: 'payer' });
      expect(a).not.toMatch(/decision maker/i);
    }
  });

  it('attaches 을/를 from the last Hangul batchim', () => {
    const problemBiz = { ...stub, groundTruth: { ...stub.groundTruth, problem: { ...stub.groundTruth.problem!, value: '할 일 분산' } } };
    const a = generateUserAnswer({
      business: problemBiz,
      behavior: 'multi_fact',
      turn: 1,
      askedGapId: 'problemJtbd',
    });
    expect(a).toMatch(/분산을/);
    expect(a).not.toMatch(/분산를/);
  });
});

describe('Phase 2-D harness — sandbox documents are readable', () => {
  it('every sandbox document passes the Production readability gate', () => {
    for (const b of MINI_SANDBOX_BUSINESSES) {
      expect(isWorkspaceDocumentReadable(b.documentText), b.id).toBe(true);
      expect(b.documentText.split('\n').filter((l) => l.trim()).length, b.id).toBeGreaterThanOrEqual(2);
    }
  });
});
