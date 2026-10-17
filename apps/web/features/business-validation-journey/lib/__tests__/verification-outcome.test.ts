import { describe, expect, it } from 'vitest';

import { judgeStoredModelOutput } from '../stored-model-judgment';
import { rejudgeAfterFounderExecution } from '../verification-outcome';

describe('verification outcome contract', () => {
  it('does not treat a ledger sentence as a completed founder execution', () => {
    const empty = rejudgeAfterFounderExecution({ evidenceText: '' });
    const pasted = rejudgeAfterFounderExecution({ evidenceText: '원장으로 확인한 매출 10억이 입금되었다.' });
    expect(empty).toEqual({ factStatus: '미확인', decision: '보류', verifiedFact: false });
    expect(pasted.factStatus).toBe('미확인');
    expect(pasted.decision).toBe('보류');
    expect(pasted.verifiedFact).toBe(false);
    expect(pasted.factStatus).not.toBe('검증 완료');
  });

  it('keeps fact status unverified when the source text merely contains a ledger word', () => {
    const judged = judgeStoredModelOutput({
      sourceText: '\n입력\nS3: 모회사와 상품 공급 계약 체결 (예상 연매출 10억)\nA2: 모회사 지원이 필수다\n원장 사본이 있다',
      modelContent: '지원이 필수',
      modelFact: true,
    });
    expect(judged.ledgerEvidence).toBe(true);
    expect(judged.fact).toBe(true);
    expect(judged.factStatus).toBe('미확인');
    expect(judged.verifiedFact).toBe(false);
    expect(judged.nextExperiment.hypothesis).toContain('S3:');
    expect(judged.nextExperiment.success).toContain('예상 연매출 10억');
  });
});
