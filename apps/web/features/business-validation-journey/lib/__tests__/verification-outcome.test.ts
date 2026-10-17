import { describe, expect, it } from 'vitest';

import { judgeStoredModelOutput } from '../stored-model-judgment';
import {
  assessFounderExecution,
  FACT_STATUS_ENTRY,
  FACT_STATUS_TRANSITIONS_IMPLEMENTED,
  rejudgeAfterFounderExecution,
  type ExecutionStage,
} from '../verification-outcome';

describe('verification outcome contract', () => {
  it('does not treat a ledger sentence as a completed founder execution', () => {
    const empty = rejudgeAfterFounderExecution({ evidenceText: '' });
    const pasted = rejudgeAfterFounderExecution({ evidenceText: '원장으로 확인한 매출 10억이 입금되었다.' });
    expect(empty.factStatus).toBe('미확인');
    expect(empty.decision).toBe('보류');
    expect(empty.verifiedFact).toBe(false);
    expect(empty.evidenceIgnored).toBe(true);
    expect(empty.reason).toContain('결과를 제출하지 않았다');
    expect(pasted.factStatus).toBe('미확인');
    expect(pasted.reason).toContain('제출 문장만으로');
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

  it('keeps the four fact statuses defined and the transitions unimplemented', () => {
    expect(FACT_STATUS_TRANSITIONS_IMPLEMENTED).toBe(false);
    expect(FACT_STATUS_ENTRY.미확인).toContain('증빙 검토 기록');
    expect(FACT_STATUS_ENTRY['근거 확보']).toContain('미구현');
    expect(FACT_STATUS_ENTRY['검증 완료']).toContain('미구현');
    expect(FACT_STATUS_ENTRY.반증됨).toContain('미구현');
  });

  it('holds every execution stage and does not treat a claimed result as a verified fact', () => {
    const stages: ExecutionStage[] = [
      'before_execution',
      'result_missing',
      'evidence_insufficient',
      'success_claimed',
      'failure_claimed',
      'evidence_conflict',
    ];
    const reasons = new Set<string>();
    for (const stage of stages) {
      const assessed = assessFounderExecution({
        stage,
        evidenceText: '원장으로 성공 기준을 충족했고 동시에 실패 기준도 충족했다.',
      });
      expect(assessed.factStatus).toBe('미확인');
      expect(assessed.decision).toBe('보류');
      expect(assessed.verifiedFact).toBe(false);
      expect(assessed.evidenceIgnored).toBe(true);
      expect(assessed.transitionsImplemented).toBe(false);
      expect(assessed.factStatus).not.toBe('검증 완료');
      reasons.add(assessed.reason);
    }
    expect(reasons.size).toBe(stages.length);
  });

  it('does not ask for the ten-billion forecast when only A2 is omitted', () => {
    const judged = judgeStoredModelOutput({
      sourceText: '\n입력\nA2: 모회사 지원이 없어도 현재 매출 구조를 유지할 수 없다.',
      modelContent: '다른 이야기',
      modelFact: false,
    });
    expect(judged.omittedFromModel).toEqual(['A2']);
    expect(judged.nextExperiment.method).toContain('A2');
    expect(judged.nextExperiment.method).not.toContain('예상 연매출 10억');
  });
});
