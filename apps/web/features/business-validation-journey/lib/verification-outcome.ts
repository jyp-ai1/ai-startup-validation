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
 * Entry conditions for the four fact statuses.
 * 근거 확보, 검증 완료, and 반증됨 stay unimplemented: no function in this module returns them.
 */
export const FACT_STATUS_ENTRY = {
  미확인: '증빙 검토 기록이 없다. 모델 문장과 빈 칸은 이 상태에 남긴다.',
  '근거 확보': '미구현. 자료가 제출됐다는 기록과, 진위·범위·충분성이 아직 닫히지 않았다는 기록이 함께 있어야 한다.',
  '검증 완료': '미구현. 미리 적은 성공 기준과 증빙 대조 기록이 있어야 한다. verifiedFact false와 모델 합의는 이 상태가 아니다.',
  반증됨: '미구현. 미리 적은 실패 기준을 충족한 증빙 대조 기록이 있어야 한다.',
} as const;

export const FACT_STATUS_TRANSITIONS_IMPLEMENTED = false as const;

export type ExecutionStage =
  | 'before_execution'
  | 'result_missing'
  | 'evidence_insufficient'
  | 'success_claimed'
  | 'failure_claimed'
  | 'evidence_conflict';

const HOLD_REASON: Record<ExecutionStage, string> = {
  before_execution: '실행 전이다. 제출된 실행 기록이 없어 보류한다.',
  result_missing: '결과를 제출하지 않았다. 보류한다.',
  evidence_insufficient: '증빙이 부족하다. 제출 문장만으로 보류를 풀지 않는다.',
  success_claimed: '성공 기준을 충족했다고 적은 문장이다. 증빙 대조 기록이 없어 보류한다.',
  failure_claimed: '실패 기준을 충족했다고 적은 문장이다. 증빙 대조 기록이 없어 보류한다.',
  evidence_conflict: '증빙이 서로 어긋난다. 보류한다.',
};

export type FounderExecutionAssessment = {
  factStatus: '미확인';
  decision: '보류';
  verifiedFact: false;
  evidenceIgnored: true;
  transitionsImplemented: false;
  reason: string;
};

/**
 * Names the gap and still withholds 유지, 수정, and 중단.
 * A sentence that claims success, failure, or a ledger is not an evidence review record.
 */
export function assessFounderExecution(input: {
  stage: ExecutionStage;
  evidenceText?: string;
}): FounderExecutionAssessment {
  void input.evidenceText;
  return {
    factStatus: '미확인',
    decision: '보류',
    verifiedFact: false,
    evidenceIgnored: true,
    transitionsImplemented: FACT_STATUS_TRANSITIONS_IMPLEMENTED,
    reason: HOLD_REASON[input.stage],
  };
}

export function rejudgeAfterFounderExecution(input: { evidenceText: string }): FounderExecutionAssessment {
  return assessFounderExecution({
    stage: input.evidenceText.trim() ? 'evidence_insufficient' : 'result_missing',
    evidenceText: input.evidenceText,
  });
}
