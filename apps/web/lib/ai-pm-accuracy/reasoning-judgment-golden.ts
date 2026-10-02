/**
 * CPO §7 — Reasoning / Business Judgment golden types (A–H).
 * Layer 4–5 — NOT in Slice 1 scope; definitions only until harness wired.
 */

export type ReasoningJudgmentGoldenId =
  | 'RJ-A-sufficient-evidence'
  | 'RJ-B-insufficient-no-forced-go'
  | 'RJ-C-contradiction-hold'
  | 'RJ-D-good-problem-bad-model'
  | 'RJ-E-big-market-weak-value'
  | 'RJ-F-customer-clear-payer-open'
  | 'RJ-G-strong-competition'
  | 'RJ-H-claim-vs-evidence';

export type ReasoningJudgmentGoldenStub = {
  id: ReasoningJudgmentGoldenId;
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  label: string;
  cpoSection: string;
  harnessStatus: 'NOT_WIRED';
  /** Input sketch for future turn harness */
  inputSketch: string;
  cpoMustNot: string[];
  cpoMust: string[];
};

export const REASONING_JUDGMENT_GOLDEN_STUBS: ReasoningJudgmentGoldenStub[] = [
  {
    id: 'RJ-A-sufficient-evidence',
    letter: 'A',
    label: '충분한 근거 → 조건부 판단',
    cpoSection: '§7-A',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'Closed customer/problem/payer + open diff/WTP',
    cpoMust: ['판단·근거·불확실성·다음 검증 연결'],
    cpoMustNot: ['근거 없는 GO'],
  },
  {
    id: 'RJ-B-insufficient-no-forced-go',
    letter: 'B',
    label: '근거 부족 → 판단 유보',
    cpoSection: '§7-B',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'Sparse gapState, many OPEN',
    cpoMust: ['검증 계획 제시'],
    cpoMustNot: ['GO/NO-GO 단정'],
  },
  {
    id: 'RJ-C-contradiction-hold',
    letter: 'C',
    label: '모순 → 보류',
    cpoSection: '§7-C',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'CONTRADICTED customer',
    cpoMust: ['모순 해결 전 judgment hold'],
    cpoMustNot: ['조용한 덮어쓰기'],
  },
  {
    id: 'RJ-D-good-problem-bad-model',
    letter: 'D',
    label: '좋은 문제 ≠ 사업성',
    cpoSection: '§7-D',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'Clear problem, weak revenue path',
    cpoMustNot: ['problem CLOSED → auto GO'],
    cpoMust: ['BM/WTP gap 명시'],
  },
  {
    id: 'RJ-E-big-market-weak-value',
    letter: 'E',
    label: '큰 시장 ≠ 사업성',
    cpoSection: '§7-E',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'Large TAM claim, weak diff',
    cpoMustNot: ['시장 크기만으로 positive judgment'],
    cpoMust: ['고객 가치·지불 연결'],
  },
  {
    id: 'RJ-F-customer-clear-payer-open',
    letter: 'F',
    label: 'Customer ≠ Payer',
    cpoSection: '§7-F',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'customer CLOSED, payer OPEN',
    cpoMust: ['payer/WTP uncertainty in reasoning'],
    cpoMustNot: ['customer=payer merge in judgment'],
  },
  {
    id: 'RJ-G-strong-competition',
    letter: 'G',
    label: '강한 경쟁 → 차별성 검토',
    cpoSection: '§7-G',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'Strong competitors, open diff',
    cpoMustNot: ['경쟁만으로 NO-GO'],
    cpoMust: ['대체 가능성·차별성 불확실성'],
  },
  {
    id: 'RJ-H-claim-vs-evidence',
    letter: 'H',
    label: '주장 ≠ 지불 검증',
    cpoSection: '§7-H',
    harnessStatus: 'NOT_WIRED',
    inputSketch: 'User WTP rhetoric, no validation',
    cpoMustNot: ['willingness_to_pay = validated'],
    cpoMust: ['UNVALIDATED / assumption label'],
  },
];
