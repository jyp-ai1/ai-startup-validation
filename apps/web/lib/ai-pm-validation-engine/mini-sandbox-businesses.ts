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
    documentText: '개인 일정과 할 일을 한 화면에서 보는 생산성 앱입니다.\n여러 도구에 흩어진 일을 한곳에서 보고 싶어 하는 직장인이 대상입니다.',
    groundTruth: gt('직장인·프리랜서', '할 일·일정 분산'),
    set: 'development',
  },
  {
    id: 'sb-b2b-saas',
    archetype: 'B2B SaaS',
    documentText: '10명에서 50명 규모 팀이 쓰는 협업 도구입니다.\n경영진이 도입을 결정하고 실무자가 매일 일감을 나눕니다.',
    groundTruth: gt('중소기업 팀', '업무 협업 비효율', {
      payer: { value: '경영진/팀 리더', certainty: 'PARTIAL', evidenceStrength: 3 },
      user: { value: '실무자', certainty: 'CLOSED', evidenceStrength: 3 },
    }),
    set: 'development',
  },
  {
    id: 'sb-marketplace',
    archetype: 'Marketplace',
    documentText: '검증된 전문가와 의뢰 기업을 연결하는 양면 마켓입니다.\n적합한 전문가를 빨리 찾기 어렵다는 수요가 있습니다.',
    groundTruth: gt('중소기업 수요자', '적합 전문가 찾기 어려움'),
    set: 'development',
  },
  {
    id: 'sb-commerce',
    archetype: 'Commerce',
    documentText: '건강 간식을 직접 판매하는 커머스입니다.\n성분이 믿을 만한 제품을 고르기 어렵다는 소비자 불만이 있습니다.',
    groundTruth: gt('20~40대 건강 관심 소비자', '신뢰할 제품 선택 어려움'),
    set: 'development',
  },
  {
    id: 'sb-subscription',
    archetype: 'Subscription',
    documentText: '여러 콘텐츠를 묶은 월 구독 멤버십입니다.\n매달 낼 만큼의 가치가 있는지 소비자가 확신을 못 합니다.',
    groundTruth: gt('콘텐츠 소비자', '지속 구독 가치 불확실'),
    set: 'development',
  },
  {
    id: 'sb-local',
    archetype: 'Local Service',
    documentText: '동네 음식점의 예약과 리뷰를 한곳에서 관리합니다.\n사장이 온라인 홍보에 쓸 시간이 부족합니다.',
    groundTruth: gt('1~3호점 F&B 사장', '온라인 홍보 시간 부족'),
    set: 'development',
  },
  {
    id: 'sb-platform',
    archetype: 'Platform',
    documentText: '스타트업 개발팀이 쓰는 API 연동 플랫폼입니다.\n연동과 운영을 직접 붙이는 부담을 줄이려 합니다.',
    groundTruth: gt('스타트업 개발팀', 'API 연동·운영 부담'),
    set: 'development',
  },
  {
    id: 'sb-hardware',
    archetype: 'Hardware',
    documentText: '장비 상태를 보는 IoT 디바이스와 대시보드입니다.\n제조 중소기업이 현장 장비를 원격으로 보고 싶어 합니다.',
    groundTruth: gt('제조 SMB', '장비 상태 모니터링'),
    set: 'development',
  },
  {
    id: 'sb-professional',
    archetype: 'Professional Service',
    documentText: '초기 스타트업의 시장 진입을 대신 실행하는 컨설팅입니다.\n대표가 실행 인력을 구하기 어렵습니다.',
    groundTruth: gt('초기 스타트업 CEO', 'GTM 실행 리소스 부족'),
    set: 'development',
  },
  {
    id: 'sb-ai-service',
    archetype: 'AI Service',
    documentText: '기획자와 PM이 쓰는 문서 분석 서비스입니다.\n긴 자료를 읽고 정리하는 데 쓰는 시간을 줄이려 합니다.',
    groundTruth: gt('PM·기획자', '문서 분석 시간'),
    set: 'development',
  },
];
