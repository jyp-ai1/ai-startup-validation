/**
 * CPO Sprint 2 — Business Scenario Matrix (Track B).
 * Each row: business context + initial knowledge field states (not fixed Q order).
 */

export type KnowledgeFieldInitial =
  | 'KNOWN'
  | 'PARTIAL'
  | 'UNKNOWN'
  | 'CONFLICT'
  | 'ASSUMPTION'
  | 'INFERENCE';

export type BusinessScenarioSet = 'development' | 'regression' | 'unseen';

export type BusinessScenarioMatrixRow = {
  id: string;
  matrixNumber: number;
  businessType: string;
  exampleLabel: string;
  /** Intake document — seeds buildBusinessUnderstanding in harness */
  documentText: string;
  /** CPO “정답표” initial states — CPO reviews evolution, harness does not hard-code Q order */
  initialFields: {
    customer: KnowledgeFieldInitial;
    actualUser: KnowledgeFieldInitial;
    payer: KnowledgeFieldInitial;
    problem: KnowledgeFieldInitial;
    jtbd: KnowledgeFieldInitial;
    market: KnowledgeFieldInitial;
    alternatives: KnowledgeFieldInitial;
    competitors: KnowledgeFieldInitial;
    differentiation: KnowledgeFieldInitial;
    revenueModel: KnowledgeFieldInitial;
    wtp: KnowledgeFieldInitial;
    acquisition: KnowledgeFieldInitial;
    validationAssumptions: KnowledgeFieldInitial;
    mvp: KnowledgeFieldInitial;
    successCriteria: KnowledgeFieldInitial;
  };
  set: BusinessScenarioSet;
  /** Target depth: A = fast probes, B = 20–30 turns (pilot scripts), C = production */
  layers: Array<'A' | 'B' | 'C'>;
};

export const BUSINESS_SCENARIO_MATRIX: BusinessScenarioMatrixRow[] = [
  row(1, 'B2B SaaS', '중소기업 업무관리', 'development', doc('B2B SaaS', '10~50명 중소기업', '업무 분산')),
  row(2, 'B2C SaaS', '개인 생산성', 'development', doc('B2C SaaS', '직장인·프리랜서', '할 일 관리')),
  row(3, 'AI SaaS', 'AI 문서/분석', 'development', doc('AI SaaS', 'PM·기획자', '문서 분석 시간')),
  row(4, 'Marketplace', '전문가 매칭', 'development', doc('Marketplace', '중소기업', '전문가 찾기')),
  row(5, 'Commerce', 'D2C 식품', 'development', doc('D2C Commerce', '20~40대', '건강 간식')),
  row(6, 'D2C Brand', '화장품 브랜드', 'development', doc('D2C Beauty', '20~30대 여성', '피부 고민')),
  row(7, 'Local', '지역 음식점/예약', 'development', doc('Local F&B', '동네 음식점 사장', '홍보 시간 부족')),
  row(8, 'Healthcare', '병원 예약/리콜', 'development', doc('Healthcare SaaS', '병원·클리닉', '예약 no-show')),
  row(9, 'Education', '온라인 교육', 'development', doc('EdTech', '직무 전환자', '체계적 학습')),
  row(10, 'Content', '콘텐츠/미디어', 'development', doc('Media SaaS', '크리에이터', '수익화')),
  row(11, 'Community', '직군 커뮤니티', 'regression', doc('Community', '개발자', '네트워킹')),
  row(12, 'Platform/API', '개발자 API', 'regression', doc('API Platform', '스타트업 개발팀', '연동 비용')),
  row(13, 'Hardware+SaaS', 'IoT 관리', 'regression', doc('IoT SaaS', '제조 SMB', '장비 모니터링')),
  row(14, 'Professional Service', '컨설팅/대행', 'unseen', doc('Agency', '스타트업 CEO', 'GTM 실행')),
  row(15, 'Offline', '오프라인 매장', 'unseen', doc('Offline retail', '매장 운영자', '재고·회원')),
];

function doc(category: string, customer: string, problem: string): string {
  return `${category} 스타트업
타겟: ${customer}
핵심 문제: ${problem}
수익: 검토 중`;
}

function defaultInitial(): BusinessScenarioMatrixRow['initialFields'] {
  return {
    customer: 'PARTIAL',
    actualUser: 'UNKNOWN',
    payer: 'UNKNOWN',
    problem: 'PARTIAL',
    jtbd: 'UNKNOWN',
    market: 'UNKNOWN',
    alternatives: 'UNKNOWN',
    competitors: 'UNKNOWN',
    differentiation: 'UNKNOWN',
    revenueModel: 'UNKNOWN',
    wtp: 'UNKNOWN',
    acquisition: 'UNKNOWN',
    validationAssumptions: 'UNKNOWN',
    mvp: 'UNKNOWN',
    successCriteria: 'UNKNOWN',
  };
}

function row(
  matrixNumber: number,
  businessType: string,
  exampleLabel: string,
  set: BusinessScenarioSet,
  documentText: string,
): BusinessScenarioMatrixRow {
  const id = `biz-${String(matrixNumber).padStart(2, '0')}`;
  return {
    id,
    matrixNumber,
    businessType,
    exampleLabel,
    documentText,
    initialFields: defaultInitial(),
    set,
    layers: set === 'unseen' ? ['A', 'C'] : set === 'regression' ? ['A', 'B'] : ['A', 'B'],
  };
}

export function getBusinessScenario(id: string): BusinessScenarioMatrixRow | undefined {
  return BUSINESS_SCENARIO_MATRIX.find((b) => b.id === id);
}

export function businessesBySet(set: BusinessScenarioSet): BusinessScenarioMatrixRow[] {
  return BUSINESS_SCENARIO_MATRIX.filter((b) => b.set === set);
}
