export type FactStatus = '미확인' | '근거 확보' | '검증 완료' | '반증됨';

export type FounderRejudgment = '보류' | '유지' | '수정' | '중단';

export type NextVerificationExperiment = {
  hypothesis: string;
  material: string;
  method: string;
  cost: '미확인';
  duration: '미확인';
  success: string;
  failure: string;
};

const LEDGER_MARKERS = ['원장', '결제', '입금', '세금계산서'] as const;

export function hasLedgerMarker(text: string): boolean {
  return LEDGER_MARKERS.some((marker) => text.includes(marker));
}

export function unknownCostAndDuration(): Pick<NextVerificationExperiment, 'cost' | 'duration'> {
  return { cost: '미확인', duration: '미확인' };
}

/**
 * A pasted sentence is not an evidence record.
 * 검증 완료, 근거 확보, 유지, 수정, 중단 require a founder execution record that this function does not receive.
 */
export function rejudgeAfterFounderExecution(input: { evidenceText: string }): {
  factStatus: '미확인';
  decision: '보류';
  verifiedFact: false;
} {
  void input.evidenceText;
  return { factStatus: '미확인', decision: '보류', verifiedFact: false };
}
