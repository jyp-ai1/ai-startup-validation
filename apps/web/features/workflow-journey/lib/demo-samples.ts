import { TASTE_COMPANY_FULL_SAMPLE } from './business-understanding/build-business-understanding';

export const DEMO_SESSION_PROJECT_ID = 'demo-session';

export type DemoSampleId = 'launchlens' | 'saas' | 'fnb' | 'commerce' | 'manufacturing' | 'custom';

export type DemoSampleDefinition = {
  id: DemoSampleId;
  label: string;
  projectName: string;
  document: string;
};

export const DEMO_SAMPLES: DemoSampleDefinition[] = [
  {
    id: 'launchlens',
    label: 'LaunchLens Sample',
    projectName: 'LaunchLens Sample',
    document: TASTE_COMPANY_FULL_SAMPLE,
  },
  {
    id: 'saas',
    label: 'AI SaaS',
    projectName: 'AI SaaS Sample',
    document: `스마트PM
Series A 스타트업 CEO
B2B SaaS — AI PM Copilot
타겟: 10~50인 스타트업 CEO · PM
문제: 전략 검토가 회의마다 리셋됨
수익: 월 구독 · 팀 플랜`,
  },
  {
    id: 'fnb',
    label: 'F&B',
    projectName: 'F&B Sample',
    document: `맛길
F&B 예비창업자
전통주 관광 큐레이션 앱
B2C · 양조장 B2B 제휴
타겟: MZ 관광객 · 전통주 입문 소비자
수익: 예약 수수료 · 데이터 리포트`,
  },
  {
    id: 'commerce',
    label: '커머스',
    projectName: '커머스 Sample',
    document: `핏커머스
D2C 브랜드 대표
AI 기반 사이즈 추천 커머스
B2C
타겟: 2030 여성 · 반품 경험 많은 온라인 쇼핑객
수익: 상품 판매 · SaaS 라이선스`,
  },
  {
    id: 'manufacturing',
    label: '제조',
    projectName: '제조 Sample',
    document: `스마트팩토리랩
제조 스타트업 대표
IoT 기반 생산라인 이상탐지 SaaS
B2B
타겟: 중소 제조사 생산팀 · 품질관리 담당
수익: SaaS 구독 · 설치 컨설팅`,
  },
];

export const DEMO_CUSTOM_DOCUMENT_KEY = 'launchlens.demo.customDocument';

export function getDemoSample(id: string | null | undefined): DemoSampleDefinition {
  const found = DEMO_SAMPLES.find((sample) => sample.id === id);
  return found ?? DEMO_SAMPLES[0]!;
}

export function isDemoSampleId(value: string | null | undefined): value is DemoSampleId {
  if (!value) return false;
  return DEMO_SAMPLES.some((sample) => sample.id === value) || value === 'custom';
}
