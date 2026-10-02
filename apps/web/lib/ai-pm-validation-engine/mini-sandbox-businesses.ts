import type { AnswerBehaviorId, BusinessScenarioContract } from './contracts';

/** POC behaviors — expand after gate pass. */
export const MINI_SANDBOX_BEHAVIORS: AnswerBehaviorId[] = [
  'normal',
  'multi_fact',
  'contradiction',
];

function gt(
  customer: string,
  problem: string,
  extras: Partial<BusinessScenarioContract['groundTruth']> = {},
): BusinessScenarioContract['groundTruth'] {
  return {
    customer: { value: customer, source: 'document', certainty: 'CLOSED', evidenceStrength: 3 },
    problem: { value: problem, source: 'document', certainty: 'CLOSED', evidenceStrength: 3 },
    ...extras,
  };
}

/** POC — 10 structurally distinct archetypes (not duplicate verticals). */
export const MINI_SANDBOX_BUSINESSES: BusinessScenarioContract[] = [
  {
    id: 'sb-b2c-saas',
    archetype: 'B2C SaaS',
    documentText: 'B2C SaaS — 개인 생산성 앱. 타겟: 직장인. 문제: 할 일 분산.',
    groundTruth: gt('직장인·프리랜서', '할 일·일정 분산'),
    set: 'development',
  },
  {
    id: 'sb-b2b-saas',
    archetype: 'B2B SaaS',
    documentText: 'B2B SaaS — 10~50명 팀 협업. 구매: 경영진, 사용: 실무자.',
    groundTruth: gt('중소기업 팀', '업무 협업 비효율', {
      payer: { value: '경영진/팀 리더', certainty: 'PARTIAL', evidenceStrength: 3 },
      user: { value: '실무자', certainty: 'CLOSED', evidenceStrength: 3 },
    }),
    set: 'development',
  },
  {
    id: 'sb-marketplace',
    archetype: 'Marketplace',
    documentText: '양면 마켓 — 전문가와 수요자 매칭.',
    groundTruth: gt('중소기업 수요자', '적합 전문가 찾기 어려움'),
    set: 'development',
  },
  {
    id: 'sb-commerce',
    archetype: 'Commerce',
    documentText: 'D2C 커머스 — 건강 간식.',
    groundTruth: gt('20~40대 건강 관심 소비자', '신뢰할 제품 선택 어려움'),
    set: 'development',
  },
  {
    id: 'sb-subscription',
    archetype: 'Subscription',
    documentText: '월 구독 멤버십 — 콘텐츠 번들.',
    groundTruth: gt('콘텐츠 소비자', '지속 구독 가치 불확실'),
    set: 'development',
  },
  {
    id: 'sb-local',
    archetype: 'Local Service',
    documentText: '동네 F&B — 예약·리뷰 관리.',
    groundTruth: gt('1~3호점 F&B 사장', '온라인 홍보 시간 부족'),
    set: 'development',
  },
  {
    id: 'sb-platform',
    archetype: 'Platform',
    documentText: '개발자 API 플랫폼.',
    groundTruth: gt('스타트업 개발팀', 'API 연동·운영 부담'),
    set: 'development',
  },
  {
    id: 'sb-hardware',
    archetype: 'Hardware',
    documentText: 'IoT 디바이스 + SaaS 대시보드.',
    groundTruth: gt('제조 SMB', '장비 상태 모니터링'),
    set: 'development',
  },
  {
    id: 'sb-professional',
    archetype: 'Professional Service',
    documentText: 'GTM 컨설팅 대행.',
    groundTruth: gt('초기 스타트업 CEO', 'GTM 실행 리소스 부족'),
    set: 'development',
  },
  {
    id: 'sb-ai-service',
    archetype: 'AI Service',
    documentText: 'AI 문서 분석 SaaS for PM.',
    groundTruth: gt('PM·기획자', '문서 분석 시간'),
    set: 'development',
  },
];
