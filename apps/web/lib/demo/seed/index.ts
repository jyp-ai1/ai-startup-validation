import type { DemoBusinessContext, DemoProjectRecord, DemoSeedBundle } from '../demo-scenario-types';
import {
  CLINICFLOW_DOCUMENT,
  FITBRIDGE_DOCUMENT,
  LOCAL_SNS_DOCUMENT,
} from '../demo-seed-documents';
import { demoSeedQaSteps } from '../demo-seed-qa';
import { demoSampleProjectId } from '../demo-isolation';

const CLINICFLOW_BUSINESS: DemoBusinessContext = {
  businessName: '클리닉플로우',
  oneLiner: '외래·검진 no-show를 줄이는 B2B SaaS',
  longDescription: CLINICFLOW_DOCUMENT,
  customer: '5~30인 피부·치과·한의원 원장·실장',
  payer: '원장 또는 병원 법인 (월 구독)',
  problem: '전화·수기 리콜로 no-show 15~25%',
  currentAlternatives: '수기 엑셀, EMR 알림, O2O 예약앱',
  market: '국내 1차 진료과·검진센터',
  competitors: '네이버 예약, 똑닥, CRM',
  differentiation: '과별 no-show 패턴 + EMR API 리콜',
  validationPlan: '파일럿 5곳 no-show 전후',
  coreHypothesis: 'no-show 10%p↓ → ROI 3개월',
};

const LOCAL_SNS_BUSINESS: DemoBusinessContext = {
  businessName: '동네장터알림',
  oneLiner: '소규모 F&B SNS·플레이스 홍보 자동화',
  longDescription: LOCAL_SNS_DOCUMENT,
  customer: '직원 5명 이하 음식점·카페 사장',
  payer: '사장 개인 (월 9.9만 원)',
  problem: '홍보 시간·전문성 부족, 공지 누락',
  currentAlternatives: '대행, Canva, ChatGPT',
  market: '전국 소상공인 디지털 마케팅',
  competitors: '마케터 대행, 스마트플레이스',
  differentiation: '업종 템플릿 + 지역 키워드 + 일정',
  validationPlan: '20곳 파일럿 유지율·리뷰',
  coreHypothesis: '주 2시간 → 10분 홍보',
};

const FITBRIDGE_BUSINESS: DemoBusinessContext = {
  businessName: '핏브릿지',
  oneLiner: 'D2C 반품률을 줄이는 AI 사이즈 추천',
  longDescription: FITBRIDGE_DOCUMENT,
  customer: 'D2C 의류·신발 브랜드 PM·대표',
  payer: '브랜드 법인 (SaaS + 보너스)',
  problem: '사이즈 반품 30~40%',
  currentAlternatives: '사이즈 차트 PDF, CS 수동',
  market: '국내 D2C 패션 SaaS',
  competitors: 'True Fit, 자체 ML',
  differentiation: '한국 체형·브랜드 실측 + SLA',
  validationPlan: 'A/B PDP 반품률',
  coreHypothesis: '반품 1%p = 수천만 원 절감',
};

function projectRecord(
  slug: 'clinicflow' | 'local-sns' | 'fitbridge',
  displayName: string,
  tagline: string,
  category: DemoProjectRecord['category'],
): DemoProjectRecord {
  return {
    id: demoSampleProjectId(slug),
    slug,
    displayName,
    tagline,
    category,
    version: 1,
    locale: 'ko',
  };
}

/** Seed bundles — frames materialized at runtime on first Sample entry. */
export const DEMO_SEED_BUNDLES: DemoSeedBundle[] = [
  {
    project: projectRecord('clinicflow', '클리닉플로우', CLINICFLOW_BUSINESS.oneLiner, 'b2b_saas'),
    business: CLINICFLOW_BUSINESS,
    document: { format: 'markdown', body: CLINICFLOW_DOCUMENT },
    frames: [],
  },
  {
    project: projectRecord('local-sns', '동네장터알림', LOCAL_SNS_BUSINESS.oneLiner, 'local_service'),
    business: LOCAL_SNS_BUSINESS,
    document: { format: 'markdown', body: LOCAL_SNS_DOCUMENT },
    frames: [],
  },
  {
    project: projectRecord('fitbridge', '핏브릿지', FITBRIDGE_BUSINESS.oneLiner, 'commerce_brand'),
    business: FITBRIDGE_BUSINESS,
    document: { format: 'markdown', body: FITBRIDGE_DOCUMENT },
    frames: [],
  },
];

export function getDemoSeedBundle(slug: string): DemoSeedBundle | null {
  const normalized = slug as DemoSeedBundle['project']['slug'];
  return DEMO_SEED_BUNDLES.find((b) => b.project.slug === normalized) ?? null;
}

export function getDemoSeedBundleByProjectId(projectId: string): DemoSeedBundle | null {
  return DEMO_SEED_BUNDLES.find((b) => b.project.id === projectId) ?? null;
}

export { demoSeedQaSteps };
