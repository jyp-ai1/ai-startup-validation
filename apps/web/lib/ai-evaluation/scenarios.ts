/** LS-5 — internal benchmark scenarios (no CEO score exposure). */
export type AiEvalScenario = {
  id: string;
  label: string;
  documentText: string;
  expectedCustomerSubstring: string;
  expectedProblemSubstring: string;
};

export const AI_EVAL_SCENARIOS: AiEvalScenario[] = [
  {
    id: 'clinic-b2b',
    label: 'B2B SaaS clinic',
    documentText: `사업명: 클리닉플로우
고객: 5~30인 피부·치과 원장
문제: no-show 15~25%
수익: 병원 월 구독`,
    expectedCustomerSubstring: '피부',
    expectedProblemSubstring: 'no-show',
  },
  {
    id: 'local-fnb',
    label: 'Local F&B',
    documentText: `사업명: 동네장터알림
고객: 직원 5명 이하 F&B 사장
문제: SNS 홍보 시간 부족
수익: 월 9.9만 원`,
    expectedCustomerSubstring: 'F&B',
    expectedProblemSubstring: '홍보',
  },
  {
    id: 'd2c-fit',
    label: 'D2C commerce',
    documentText: `사업명: 핏브릿지
고객: D2C 의류 브랜드 PM
문제: 사이즈 반품 35%
수익: SaaS 구독`,
    expectedCustomerSubstring: 'D2C',
    expectedProblemSubstring: '반품',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    documentText: `사업명: 동네장터
고객: 지역 소상공인 판매자
문제: 오프라인 매출 정체
수익: 거래 수수료`,
    expectedCustomerSubstring: '소상공인',
    expectedProblemSubstring: '정체',
  },
  {
    id: 'ai-saas',
    label: 'AI SaaS PM',
    documentText: `사업명: 전략 메모리 SaaS
고객: 스타트업 PM·전략기획
문제: 회의마다 전략이 리셋됨
수익: 팀 단위 구독`,
    expectedCustomerSubstring: 'PM',
    expectedProblemSubstring: '리셋',
  },
];
