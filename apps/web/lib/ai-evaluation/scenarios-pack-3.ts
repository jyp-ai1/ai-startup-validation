import type { AiEvalScenario } from './scenarios';

/** Track E — pack 3 (10) → 30 total with core + pack2. */
export const AI_EVAL_SCENARIOS_PACK_3: AiEvalScenario[] = [
  {
    id: 'mobility-ev',
    label: 'Mobility EV charging',
    documentText: `사업명: EV 충전 예약
고객: 아파트 입주 EV 오너
문제: 충전 대기·예약 불편
수익: 충전 수수료`,
    expectedCustomerSubstring: 'EV',
    expectedProblemSubstring: '충전',
  },
  {
    id: 'insurtech-pet',
    label: 'Insurtech pet',
    documentText: `사업명: 반려동물 보험 비교
고객: 20~40대 반려인
문제: 보험 상품 비교 어려움
수익: 중개 수수료`,
    expectedCustomerSubstring: '반려',
    expectedProblemSubstring: '보험',
  },
  {
    id: 'retail-pos',
    label: 'Retail POS',
    documentText: `사업명: 무인 POS
고객: 1~3매장 소매 점주
문제: 재고·POS 연동
수익: SaaS`,
    expectedCustomerSubstring: '점주',
    expectedProblemSubstring: '재고',
  },
  {
    id: 'media-podcast',
    label: 'Media podcast',
    documentText: `사업명: 팟캐스트 광고 매칭
고객: 1만 청취 이상 팟캐스트 PD
문제: 광고 영업 부담
수익: 광고 수수료`,
    expectedCustomerSubstring: 'PD',
    expectedProblemSubstring: '광고',
  },
  {
    id: 'construction-safety',
    label: 'Construction safety',
    documentText: `사업명: 현장 안전 체크리스트
고객: 50인 미만 건설 현장 관리자
문제: 안전 점검 누락
수익: 현장당 구독`,
    expectedCustomerSubstring: '현장',
    expectedProblemSubstring: '안전',
  },
  {
    id: 'beauty-salon',
    label: 'Beauty salon',
    documentText: `사업명: 미용실 예약 CRM
고객: 3~8인 미용실 원장
문제: 노쇼·단골 관리
수익: 월 구독`,
    expectedCustomerSubstring: '미용',
    expectedProblemSubstring: '노쇼',
  },
  {
    id: 'gov-civic',
    label: 'Gov civic',
    documentText: `사업명: 주민 제안 플랫폼
고객: 지자체 민원 담당
문제: 제안 분류·피드백 지연
수익: B2G 라이선스`,
    expectedCustomerSubstring: '지자체',
    expectedProblemSubstring: '제안',
  },
  {
    id: 'warehouse-wms',
    label: 'Warehouse WMS',
    documentText: `사업명: 소형 WMS
고객: 3PL 창고 운영팀
문제: 피킹 오류
수익: 좌석 과금`,
    expectedCustomerSubstring: '창고',
    expectedProblemSubstring: '피킹',
  },
  {
    id: 'bio-lab',
    label: 'Bio lab',
    documentText: `사업명: 실험 노트 ELN
고객: 바이오 스타트업 연구원
문제: 실험 기록 분산
수익: 팀 구독`,
    expectedCustomerSubstring: '연구',
    expectedProblemSubstring: '기록',
  },
  {
    id: 'sports-facility',
    label: 'Sports facility',
    documentText: `사업명: 체육시설 예약
고객: 지역 체육센터 운영자
문제: 코트 중복 예약
수익: 예약 수수료`,
    expectedCustomerSubstring: '체육',
    expectedProblemSubstring: '예약',
  },
];
