import type { DecisionMemoryEntry } from './v2-decision-memory-store';
import type { V2ValidationEvidence } from './v2-validation-store';

/** Pre-filled GTM Live Demo — AI SaaS 검토 예시 (readonly). */
export const GTM_DEMO_EVIDENCE: V2ValidationEvidence = {
  idea: 'AI가 사업 아이디어를 검증해주는 SaaS',
  problem: '창업자가 어디서부터 사업을 검토해야 할지 모름',
  customer: '초기 스타트업 PM · 1인 창업자',
  pricing: '월 구독 · 팀당 과금 검토 중',
};

export const GTM_DEMO_OPTIONAL = {
  problem: GTM_DEMO_EVIDENCE.problem ?? '',
  customer: GTM_DEMO_EVIDENCE.customer ?? '',
  mvp: '아이디어 입력 → AI 검토 → Decision Memory',
  pricing: GTM_DEMO_EVIDENCE.pricing ?? '',
} as const;

export const GTM_DEMO_MEMORY: DecisionMemoryEntry[] = [
  {
    id: 'gtm-demo-memory-1',
    decision: 'B2B SaaS로 시장 진입',
    reason: 'CAC 절감과 LTV 확장 가능성\n핵심 고객(PM)이 명확함',
    evidence: ['시장 조사', '인터뷰', '경쟁사'],
    decidedAt: '2026-07-27T00:00:00.000Z',
    status: 'current',
  },
];
