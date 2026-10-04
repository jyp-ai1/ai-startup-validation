/**
 * Phase 2-D — holdout truths for biz-16 / biz-17 (document = matrix intake document).
 * Written once from the matrix rows before any stress run. Report-only: never tune rules on these.
 */

import { getBusinessScenario } from '../../ai-pm-accuracy/business-scenario-matrix';

import type { StressBusinessTruth } from './stress-business-universe';

function doc(id: string): string {
  const row = getBusinessScenario(id);
  if (!row || row.set !== 'holdout') throw new Error(`holdout row missing: ${id}`);
  return row.documentText;
}

export const STRESS_HOLDOUT_UNIVERSE: StressBusinessTruth[] = [
  {
    id: 'biz-16',
    archetype: 'GovTech',
    docStyle: 'structured',
    documentText: doc('biz-16'),
    oneLiner: '지자체 민원 시스템 연동 SaaS',
    customer: '지자체 민원 담당 실무자',
    customerAlt: '중앙부처 정책 담당자',
    customerCorrected: '기초자치단체 정보화 담당자',
    user: '민원 담당 공무원',
    usageFrequency: '매일',
    payer: '지자체 정보화 예산 부서',
    problem: '레거시 민원 시스템끼리 연동이 안 돼 같은 자료를 여러 번 입력하는 문제',
    problemAlt: '청사 주차 공간이 부족한 문제',
    alternative: '수기 재입력과 엑셀 취합',
    channel: '조달청 나라장터와 지자체 정보화 박람회',
    differentiation: '기존 시스템을 바꾸지 않고 연동 계층만 추가하는 점',
    validation: '시범 지자체 1곳의 중복 입력 시간 측정',
    revenue: '연간 라이선스',
    teamSize: 6,
    city: '세종',
  },
  {
    id: 'biz-17',
    archetype: 'FinTech',
    docStyle: 'structured',
    documentText: doc('biz-17'),
    oneLiner: '소상공인 매출 정산·대출 연계 서비스',
    customer: '카드 매출이 많은 소상공인',
    customerAlt: '대기업 재무팀',
    customerCorrected: '배달 매출 비중이 큰 음식점 사장님',
    user: '가게 사장님',
    usageFrequency: '매일',
    payer: '가게 사장님',
    problem: '카드·배달 정산이 늦어 운영자금이 부족한 문제',
    problemAlt: '가게 인테리어가 낡은 문제',
    alternative: '카드사 선지급 서비스와 사채',
    channel: '배달앱 사장님 커뮤니티',
    differentiation: '정산 예정 금액을 근거로 당일 소액 대출을 연결하는 점',
    validation: '사장님 50명의 정산 대기 일수 변화',
    revenue: '대출 연계 수수료',
    teamSize: 7,
    city: '서울',
  },
];
