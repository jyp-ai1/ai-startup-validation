import type { BusinessPlanSectionType } from '@repo/types/validation';

export type DefaultBusinessPlanSectionConfig = {
  sectionType: BusinessPlanSectionType;
  title: string;
  order: number;
};

export const DEFAULT_BUSINESS_PLAN_SECTIONS: DefaultBusinessPlanSectionConfig[] = [
  { sectionType: 'OVERVIEW', title: '사업 개요', order: 1 },
  { sectionType: 'BACKGROUND', title: '창업 배경', order: 2 },
  { sectionType: 'PROBLEM', title: '문제 정의', order: 3 },
  { sectionType: 'MARKET', title: '시장 분석', order: 4 },
  { sectionType: 'CUSTOMER', title: '고객 분석', order: 5 },
  { sectionType: 'SOLUTION', title: '해결 방안', order: 6 },
  { sectionType: 'PRODUCT', title: '제품/서비스 설명', order: 7 },
  { sectionType: 'COMPETITION', title: '경쟁 우위', order: 8 },
  { sectionType: 'BUSINESS_MODEL', title: '비즈니스 모델', order: 9 },
  { sectionType: 'GROWTH', title: '성장 전략', order: 10 },
  { sectionType: 'MARKETING', title: '마케팅 전략', order: 11 },
  { sectionType: 'OPERATION', title: '운영 계획', order: 12 },
  { sectionType: 'TECHNOLOGY', title: '기술 개발 계획', order: 13 },
  { sectionType: 'GOVERNMENT', title: '정부지원 활용 계획', order: 14 },
  { sectionType: 'RISK', title: '예상 리스크', order: 15 },
  { sectionType: 'ROADMAP', title: '향후 실행 계획', order: 16 },
];

export const BUSINESS_PLAN_STATUS_LABELS = {
  DRAFT: 'Draft',
  GENERATING: 'Generating',
  COMPLETED: 'Completed',
} as const;

export const BUSINESS_PLAN_SECTION_LABELS: Record<BusinessPlanSectionType, string> = {
  OVERVIEW: '사업 개요',
  BACKGROUND: '창업 배경',
  PROBLEM: '문제 정의',
  MARKET: '시장 분석',
  CUSTOMER: '고객 분석',
  SOLUTION: '해결 방안',
  PRODUCT: '제품/서비스',
  COMPETITION: '경쟁 우위',
  BUSINESS_MODEL: '비즈니스 모델',
  GROWTH: '성장 전략',
  MARKETING: '마케팅 전략',
  OPERATION: '운영 계획',
  TECHNOLOGY: '기술 개발',
  GOVERNMENT: '정부지원',
  RISK: '리스크',
  ROADMAP: '실행 계획',
};
