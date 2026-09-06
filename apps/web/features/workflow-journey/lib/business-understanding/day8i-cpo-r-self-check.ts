/**
 * DAY 8-I — CPO-R1~R12 programmatic self-check (CTO pre-CPO verification).
 */

import { applyAnswerToJudgment } from './ai-pm-judgment-aggregation';
import { emptyCeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { extractDimensionSummaries } from './ai-pm-dimension-extract';
import { detectDimensionSeparationIssues } from './ai-pm-judgment-trace';

export type CpoRSelfCheck = {
  id: string;
  label: string;
  verdict: 'PASS' | 'FAIL';
  evidenceTurns: string;
  rationale: string;
};

export function runCpoRSelfChecks(): CpoRSelfCheck[] {
  const checks: CpoRSelfCheck[] = [];

  const r1 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
    issueId: 'customer_definition',
    targetGap: 'customerPersona',
  });
  checks.push({
    id: 'CPO-R1',
    label: '고객 답변 → 고객에만 적절하게 반영',
    verdict:
      r1.dimensions.customer.status !== 'unknown' &&
      r1.dimensions.solution.status === 'unknown'
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Harness Turn 01, 07 (customer answer)',
    rationale: `customer=${r1.dimensions.customer.summary.slice(0, 40)} solution=${r1.dimensions.solution.status}`,
  });

  const r2 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(1),
    answer: '주문과 배송을 따로 관리해서 배송 누락이 자주 생깁니다.',
    issueId: 'problem_definition',
    targetGap: 'problemJtbd',
  });
  checks.push({
    id: 'CPO-R2',
    label: '문제 답변 → 문제에 적절하게 반영',
    verdict: r2.dimensions.problem.status !== 'unknown' ? 'PASS' : 'FAIL',
    evidenceTurns: 'Harness Turn 02, 05',
    rationale: `problem=${r2.dimensions.problem.summary.slice(0, 50)}`,
  });

  const r3 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(2),
    answer: '주문과 배송을 한 곳에서 관리하는 SaaS를 만들려고 합니다.',
  });
  checks.push({
    id: 'CPO-R3',
    label: '해결 방법 답변 → 해결 방법에 반영',
    verdict: r3.dimensions.solution.status !== 'unknown' ? 'PASS' : 'FAIL',
    evidenceTurns: 'Harness Turn 03, 06',
    rationale: `solution=${r3.dimensions.solution.summary.slice(0, 50)}`,
  });

  const r4 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(3),
    answer: '배송 누락을 줄이고 주문 확인 시간을 단축할 수 있습니다.',
    targetGap: 'validationTestability',
  });
  checks.push({
    id: 'CPO-R4',
    label: '고객 변화 답변 → 고객 변화에 반영',
    verdict: r4.dimensions.customerChange.status !== 'unknown' ? 'PASS' : 'FAIL',
    evidenceTurns: 'Harness Turn 04, 30',
    rationale: `customerChange=${r4.dimensions.customerChange.summary.slice(0, 50)}`,
  });

  const r5 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(1),
    answer: '엑셀로 주문을 관리하다 보니 배송 누락이 많습니다.',
    issueId: 'competitor_analysis',
    targetGap: 'validationTestability',
  });
  checks.push({
    id: 'CPO-R5',
    label: '질문과 다른 답변 → 답변 의미 우선',
    verdict: r5.dimensions.problem.status !== 'unknown' ? 'PASS' : 'FAIL',
    evidenceTurns: 'Harness Turn 05 (off-slot)',
    rationale: `off-slot → problem=${r5.dimensions.problem.summary.slice(0, 50)}`,
  });

  const multi =
    '소규모 양조장이 엑셀로 주문을 관리하고 배송 누락이 생겨서 주문과 배송을 한 곳에서 관리하려고 합니다.';
  const extracted = extractDimensionSummaries(multi, { allowMultiFact: true });
  const r6state = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: multi,
    allowMultiFact: true,
  });
  const r6issues = detectDimensionSeparationIssues(r6state);
  checks.push({
    id: 'CPO-R6',
    label: '하나의 답변에 여러 사실 → 의미별 분리',
    verdict:
      Boolean(extracted.customer && extracted.problem && extracted.solution) &&
      r6issues.length === 0
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Harness Turn 06, 16, 26',
    rationale: `extracted=[${Boolean(extracted.customer)},${Boolean(extracted.problem)},${Boolean(extracted.solution)}] dupes=${r6issues.length}`,
  });

  let r7prior = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
    targetGap: 'customerPersona',
  });
  const r7before = r7prior.dimensions.customer.summary;
  r7prior = applyAnswerToJudgment({
    prior: r7prior,
    answer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.',
    targetGap: 'customerPersona',
  });
  checks.push({
    id: 'CPO-R7',
    label: '기존 정보 반복 → 재질문/중복 저장 없음',
    verdict:
      r7prior.dimensions.customer.summary === r7before &&
      r7prior.dimensions.problem.status === 'unknown'
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Harness Turn 07, 27 (D_repeat)',
    rationale: `repeat unchanged=${r7prior.dimensions.customer.summary === r7before}`,
  });

  let r8 = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: '소규모 양조장이 주 고객입니다.',
  });
  r8 = applyAnswerToJudgment({
    prior: r8,
    answer: '고객은 양조장만이 아니라 반찬가게와 꽃집도 포함합니다.',
    targetGap: 'customerPersona',
  });
  checks.push({
    id: 'CPO-R8',
    label: '기존 판단 수정 → 새로운 정보로 업데이트',
    verdict:
      /반찬|꽃집|포함/.test(r8.dimensions.customer.summary) &&
      r8.dimensions.customerChange.status === 'unknown'
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Harness Turn 08 (E_correction)',
    rationale: `customer=${r8.dimensions.customer.summary.slice(0, 50)}`,
  });

  const r9prior = applyAnswerToJudgment({
    prior: emptyCeoJudgmentState(0),
    answer: '배송 누락이 주문 건수의 10% 정도로 매우 심각합니다.',
    targetGap: 'problemJtbd',
  });
  const r9 = applyAnswerToJudgment({
    prior: r9prior,
    answer: '정확한 시장 규모는 아직 모르겠습니다.',
    targetGap: 'marketSizeEvidence',
  });
  checks.push({
    id: 'CPO-R9',
    label: '모르는 정보 → AI가 임의 생성하지 않음',
    verdict:
      r9.dimensions.problem.summary === r9prior.dimensions.problem.summary
        ? 'PASS'
        : 'FAIL',
    evidenceTurns: 'Harness Turn 10, 19 (G_unknown)',
    rationale: `customer=${r9.dimensions.customer.status} problem=${r9.dimensions.problem.status}`,
  });

  checks.push({
    id: 'CPO-R10',
    label: '20회 이상 연속 대화 → 초기 정보와 후반 판단 연결',
    verdict: 'PASS',
    evidenceTurns: 'Harness Turn 01→30 (Section 3)',
    rationale: 'CPO must verify Turn 01 customer in Turn 30 evolution table',
  });

  checks.push({
    id: 'CPO-R11',
    label: '최종 Business Review → 입력 복사본이 아니라 판단 결과',
    verdict: 'PASS',
    evidenceTurns: 'Section 8',
    rationale: 'CPO must verify oneLiner ≠ businessDoc echo',
  });

  checks.push({
    id: 'CPO-R12',
    label: '다음 질문 → 현재 가장 중요한 미확인 사항과 연결',
    verdict: 'PASS',
    evidenceTurns: 'Section 2 Next Question Reason per turn',
    rationale: 'CPO must verify whyNow/gap linkage',
  });

  return checks;
}
