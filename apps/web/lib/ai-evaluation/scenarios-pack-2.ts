import type { AiEvalScenario } from './scenarios';

/** Track E — expand toward 20 scenarios (pack 2). */
export const AI_EVAL_SCENARIOS_PACK_2: AiEvalScenario[] = [
  {
    id: 'healthcare-tele',
    label: 'Healthcare telemedicine',
    documentText: `사업명: 원격진료 예약
고객: 50대 이상 만성질환 환자
문제: 병원 방문 대기 시간
수익: 건당 수수료`,
    expectedCustomerSubstring: '환자',
    expectedProblemSubstring: '대기',
  },
  {
    id: 'education-lms',
    label: 'Education LMS',
    documentText: `사업명: 스킬업 LMS
고객: 중소기업 HR 담당자
문제: 교육 이수율 저조
수익: 좌석 라이선스`,
    expectedCustomerSubstring: 'HR',
    expectedProblemSubstring: '이수',
  },
  {
    id: 'creator-subscription',
    label: 'Creator subscription',
    documentText: `사업명: 크리에이터 멤버십
고객: 1만~10만 구독자 크리에이터
문제: 후원·멤버십 운영 부담
수익: 플랫폼 수수료`,
    expectedCustomerSubstring: '크리에이터',
    expectedProblemSubstring: '멤버십',
  },
  {
    id: 'enterprise-security',
    label: 'Enterprise security',
    documentText: `사업명: SaaS 접근 통제
고객: 500인 이상 IT 보안팀
문제: Shadow IT 계정 관리
수익: 연간 엔터프라이즈 계약`,
    expectedCustomerSubstring: '보안',
    expectedProblemSubstring: 'Shadow',
  },
  {
    id: 'logistics-lastmile',
    label: 'Logistics last mile',
    documentText: `사업명: 당일배송 라우팅
고객: 소형 이커머스 물류 담당
문제: 배송 지연·비용
수익: 배송 건당 과금`,
    expectedCustomerSubstring: '물류',
    expectedProblemSubstring: '배송',
  },
  {
    id: 'proptech-rent',
    label: 'Proptech rent',
    documentText: `사업명: 월세 관리 앱
고객: 다세대 임대인
문제: 연체·수선 요청 누락
수익: 월 구독`,
    expectedCustomerSubstring: '임대',
    expectedProblemSubstring: '연체',
  },
  {
    id: 'agtech-farm',
    label: 'Agtech',
    documentText: `사업명: 스마트팜 센서
고객: 3ha 미만 스마트팜 농가
문제: 병해 조기 감지 어려움
수익: 장비+구독`,
    expectedCustomerSubstring: '농가',
    expectedProblemSubstring: '병해',
  },
  {
    id: 'fintech-smb',
    label: 'Fintech SMB',
    documentText: `사업명: 소상공인 정산
고객: 카드매출 5천만 이하 가게
문제: 정산·세금계산서 혼선
수익: 거래 수수료`,
    expectedCustomerSubstring: '가게',
    expectedProblemSubstring: '정산',
  },
  {
    id: 'travel-b2b',
    label: 'Travel B2B',
    documentText: `사업명: 기업 출장 관리
고객: 100인 이상 기업 총무
문제: 출장비·일정 분산
수익: SaaS 구독`,
    expectedCustomerSubstring: '총무',
    expectedProblemSubstring: '출장',
  },
  {
    id: 'legal-contract',
    label: 'Legal contract AI',
    documentText: `사업명: 계약서 리스크 검토
고객: 스타트업 법무·운영 총괄
문제: 계약 검토 지연
수익: 건당+구독`,
    expectedCustomerSubstring: '법무',
    expectedProblemSubstring: '계약',
  },
  {
    id: 'hr-recruit',
    label: 'HR recruiting',
    documentText: `사업명: 채용 CRM
고객: 50인 스타트업 채용 담당
문제: 지원자 파이프라인 관리
수익: 월 구독`,
    expectedCustomerSubstring: '채용',
    expectedProblemSubstring: '파이프',
  },
  {
    id: 'gaming-live',
    label: 'Gaming live ops',
    documentText: `사업명: 라이브 이벤트 툴
고객: 모바일 게임 라이브옵스 PM
문제: 이벤트 스케줄 충돌
수익: MAU 기반 과금`,
    expectedCustomerSubstring: 'PM',
    expectedProblemSubstring: '이벤트',
  },
  {
    id: 'nonprofit-donate',
    label: 'Nonprofit donate',
    documentText: `사업명: 기부 CRM
고객: 중소 비영리 단체
문제: 기부자 재기부율 저하
수익: 기부 수수료`,
    expectedCustomerSubstring: '비영리',
    expectedProblemSubstring: '기부',
  },
  {
    id: 'manufacturing-qc',
    label: 'Manufacturing QC',
    documentText: `사업명: 공정 QC Vision
고객: 50인 이하 제조 품질팀
문제: 불량률 추적 지연
수익: 라인당 라이선스`,
    expectedCustomerSubstring: '품질',
    expectedProblemSubstring: '불량',
  },
  {
    id: 'energy-solar',
    label: 'Energy solar',
    documentText: `사업명: 태양광 O&M
고객: 1MW 미만 발전소 운영사
문제: 패널 이상 탐지 늦음
수익: O&M 구독`,
    expectedCustomerSubstring: '발전',
    expectedProblemSubstring: '이상',
  },
];
