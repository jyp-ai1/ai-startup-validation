import type { InvestigationTopic } from './v2-next-action-engine';

export type EvidenceSource = {
  id: string;
  label: string;
  detail: string;
};

export type StartupCaseStudy = {
  name: string;
  whySuccess: string;
  relevance: string;
};

export type CompetitorRow = {
  name: string;
  pricing: string;
  strength: string;
  weakness: string;
  diffFromUs: string;
  isUs?: boolean;
};

export type EvidenceQaPreset = {
  question: string;
  answer: string;
};

export type TopicJudgmentCore = {
  stars: number;
  verdict: string;
  judgmentParagraphs: string[];
  evidenceBullets: string[];
  nextAction: string;
  nextActionWhy: string;
  actionChecklist: string[];
  whySources: EvidenceSource[];
  qaPresets: EvidenceQaPreset[];
  aiInsight: string;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'flat';
  starDelta: number;
  recentChange: {
    changedAtLabel: string;
    previousStars: number;
    previousVerdict: string;
    reasonBullets: string[];
  } | null;
  evidenceCount: number;
};

export type EvidenceMarketData = TopicJudgmentCore & {
  startupCases: StartupCaseStudy[];
};

export type EvidenceCompetitionData = TopicJudgmentCore & {
  directCount: number;
  indirectCount: number;
  competitors: CompetitorRow[];
  recommendedStrategy: string;
};

export type EvidencePricingData = TopicJudgmentCore;

export type EvidenceDifferentiationData = TopicJudgmentCore & {
  usp: string;
  positioning: string;
};

export type InvestigationEvidence = {
  market: EvidenceMarketData;
  competition: EvidenceCompetitionData;
  pricing: EvidencePricingData;
  differentiation: EvidenceDifferentiationData;
};

export const MOCK_INVESTIGATION_EVIDENCE: InvestigationEvidence = {
  market: {
    stars: 5,
    confidence: 82,
    confidenceLevel: 'high',
    trend: 'up',
    starDelta: 2,
    recentChange: {
      changedAtLabel: '7월 26일',
      previousStars: 3,
      previousVerdict: '시장 성장성 보통',
      reasonBullets: ['Google Trends 증가', 'AI Coding Tool 검색량 상승'],
    },
    evidenceCount: 14,
    verdict: '시장 검토 완료 — 진입 가능',
    judgmentParagraphs: [
      '시장은 충분합니다.',
      '다만 경쟁이 빠르게 늘고 있습니다.',
      '지금 진입 가능성은 높지만 속도가 중요합니다.',
    ],
    evidenceBullets: [
      'AI Coding Tool 검색량 12개월 +34%',
      'Cursor · Lovable · Replit 성장 사례',
      'Seed 투자 4건 (2025–2026)',
    ],
    nextAction: '가격 전략 확인',
    nextActionWhy: '시장은 열려 있지만, 수익성 가설 없이 GO 판단은 위험합니다. 가격을 입력하면 AI가 LTV/CAC를 함께 검토합니다.',
    actionChecklist: ['고객 인터뷰', '유료 의향 확인', '경쟁사 가격 조사'],
    whySources: [
      { id: 'trends', label: 'Google Trends', detail: '「사업성 검증 SaaS」 키워드 12개월 +34%' },
      { id: 'ph', label: 'Product Hunt', detail: 'AI validation 도구 월 2–3건 런칭' },
      { id: 'yc', label: 'YC', detail: 'Founder tools 카테고리 지원 증가' },
      { id: 'crunchbase', label: 'Crunchbase', detail: '유사 카테고리 Seed 4건' },
      { id: 'news', label: '뉴스', detail: '정부 창업 지원 · AI SaaS 투자 기사 3건' },
    ],
    qaPresets: [
      {
        question: '시장이 작지 않나요?',
        answer:
          'TAM 3.2조 중 SAM 840억은 초기 SaaS에 충분합니다. 검색량이 시장 규모보다 빠르게 성장 — 수요가 먼저 형성되고 있습니다.',
      },
      {
        question: '지금 들어가도 늦지 않았나요?',
        answer:
          '직접 경쟁 4개지만 대부분 일회성 보고서형입니다. Workspace 기반 Thinking Loop는 아직 비어 있습니다.',
      },
    ],
    aiInsight:
      '시장 규모보다 검색량 증가폭이 더 빠르게 성장하고 있습니다. 초기 진입은 지금이 적절합니다.',
    startupCases: [
      {
        name: 'Lovable',
        whySuccess: 'No-code + AI로 MVP 시간 90% 단축 — "검증 전" Pain 해결',
        relevance: 'LaunchLens는 사업 판단 Pain — Lovable은 제품 제작',
      },
      {
        name: 'Replit',
        whySuccess: 'Agent + 커뮤니티로 Workspace 루프 lock-in',
        relevance: 'Thinking Loop가 Replit의 코딩 루프와 유사',
      },
      {
        name: 'Cursor',
        whySuccess: 'IDE 안 AI — 워크플로 강화, 대체하지 않음',
        relevance: 'LaunchLens도 Workspace 안 검토 — Cursor와 동일 포지션',
      },
    ],
  },
  competition: {
    stars: 3,
    confidence: 68,
    confidenceLevel: 'medium',
    trend: 'down',
    starDelta: -1,
    recentChange: {
      changedAtLabel: '7월 27일',
      previousStars: 4,
      previousVerdict: '경쟁 적당',
      reasonBullets: ['Product Hunt 신규 런칭 2건', '직접 경쟁 +1'],
    },
    evidenceCount: 9,
    verdict: '경쟁 치열 — 차별화 필요',
    judgmentParagraphs: [
      '직접 경쟁 4개, 간접 8개 — 많습니다.',
      '하지만 Evidence → Decision 루프를 제공하는 서비스는 없습니다.',
      '포지셔닝 속도가 승부를 가릅니다.',
    ],
    evidenceBullets: [
      'Cursor · OpenAI · Notion AI · LaunchLens 비교',
      '범용 AI는 맥락 누적 없음',
      'G2/Reddit 「일회성 보고서」 불만',
    ],
    nextAction: '차별성 한 줄 정리',
    nextActionWhy: '경쟁이 많다는 것은 시장이 있다는 뜻입니다. LaunchLens만의 한 줄 포지셔닝이 없으면 GO/WAIT를 결정할 수 없습니다.',
    actionChecklist: ['경쟁사 3곳 가격 확인', '차별성 한 줄', '포지셔닝 문장'],
    whySources: [
      { id: 'ph', label: 'Product Hunt', detail: 'AI validation 8개 카테고리 스캔' },
      { id: 'pricing', label: '가격 페이지', detail: '직접 경쟁 4개 pricing' },
      { id: 'reviews', label: 'G2 · Reddit', detail: '맥락 없음 · 일회성 보고서 불만' },
    ],
    qaPresets: [
      {
        question: '경쟁사가 너무 많은데 그래도 가능할까요?',
        answer:
          '경쟁은 많지만 Evidence → Thinking → Decision 루프를 제공하는 서비스는 비어 있습니다. Workspace 검토는 LaunchLens 영역입니다.',
      },
    ],
    aiInsight:
      '범용 AI는 많지만 Evidence와 함께 사업 판단을 이어주는 Workspace는 드뭅니다.',
    directCount: 4,
    indirectCount: 8,
    competitors: [
      {
        name: 'Cursor',
        pricing: '월 $20',
        strength: 'IDE 통합',
        weakness: '창업 검증 UX 없음',
        diffFromUs: '개발 vs 사업 검토',
      },
      {
        name: 'OpenAI',
        pricing: '월 $20',
        strength: '범용 AI',
        weakness: 'Evidence · Memory 없음',
        diffFromUs: '채팅 vs Decision 루프',
      },
      {
        name: 'Notion AI',
        pricing: '월 $10',
        strength: '문서 협업',
        weakness: '전략 검토 UX 부재',
        diffFromUs: '문서 vs Workspace',
      },
      {
        name: 'LaunchLens',
        pricing: '월 구독 검토',
        strength: 'Evidence · Memory',
        weakness: '초기 브랜드',
        diffFromUs: '—',
        isUs: true,
      },
    ],
    recommendedStrategy: 'Thinking Workspace — 보고서가 아니라 검토 루프',
  },
  pricing: {
    stars: 1,
    confidence: 34,
    confidenceLevel: 'low',
    trend: 'flat',
    starDelta: 0,
    recentChange: null,
    evidenceCount: 4,
    verdict: '가격 미확인 — GO 판단 보류',
    judgmentParagraphs: [
      '가격 가설이 없어 수익성 판단을 할 수 없습니다.',
      '경쟁사는 ₩19,900–49,000 구간에 분포합니다.',
      '가격을 입력하면 AI가 LTV/CAC와 함께 GO/WAIT를 제안합니다.',
    ],
    evidenceBullets: [
      'ValidateAI ₩29,000 · PitchBot ₩19,000',
      'LTV/CAC 모델 대기 중',
      '유료 의향 인터뷰 필요',
    ],
    nextAction: '가격 입력',
    nextActionWhy: '시장과 경쟁은 검토됐지만, 수익성 없이 GO는 불가능합니다. 월 구독 가설만 입력해도 AI가 손익분기를 계산합니다.',
    actionChecklist: ['유료 의향 5명 인터뷰', '경쟁사 가격표', '첫 가격 가설 입력'],
    whySources: [
      { id: 'benchmark', label: '경쟁 벤치마크', detail: 'ValidateAI ₩29k · PitchBot ₩19k · Foundry ₩49k' },
      { id: 'ltv', label: 'LTV 모델', detail: '입력 후 ₩19,900–29,900 구간 시뮬레이션' },
    ],
    qaPresets: [
      {
        question: '무료로 시작해야 하나요?',
        answer: 'Demo(readonly)로 대체하고, Workspace 저장·Memory부터 유료 — CAC 대비 LTV 4x 목표.',
      },
    ],
    aiInsight: '가격 입력 전까지 GO/WAIT/Pivot 중 어떤 판단도 확정할 수 없습니다.',
  },
  differentiation: {
    stars: 4,
    confidence: 76,
    confidenceLevel: 'high',
    trend: 'up',
    starDelta: 1,
    recentChange: {
      changedAtLabel: '7월 27일',
      previousStars: 3,
      previousVerdict: '차별성 모호',
      reasonBullets: ['고객 세그먼트 변경', 'Workspace 포지셔닝 명확화'],
    },
    evidenceCount: 6,
    verdict: '차별성 명확 — 검증 필요',
    judgmentParagraphs: [
      'Evidence → Thinking → Decision → Memory 루프는 명확합니다.',
      'Form SaaS와 다른 Thinking Workspace 포지션.',
      '고객 인터뷰로 Pain 검증이 남았습니다.',
    ],
    evidenceBullets: [
      'Form-first 경쟁 8개 vs State-first LaunchLens',
      'Decision Memory — 경쟁사 0개',
      'Cursor가 IDE에서 한 것 = LaunchLens가 검토에서',
    ],
    nextAction: '고객 인터뷰 시작',
    nextActionWhy: '차별성은 논리적으로 명확하지만, 창업자가 실제로 이 Pain을 느끼는지 확인해야 GO를 말할 수 있습니다.',
    actionChecklist: ['포지셔닝 한 줄', 'MVP 범위', '인터뷰 5명'],
    whySources: [
      { id: 'ux', label: 'UX 분석', detail: 'Form-first 8개 vs State-first LaunchLens' },
      { id: 'memory', label: 'Decision Memory', detail: '누적 맥락 제공 경쟁사 0개' },
    ],
    qaPresets: [
      {
        question: 'Cursor랑 뭐가 다른가요?',
        answer: 'Cursor는 코드, LaunchLens는 사업 판단. Evidence → Decision → Memory 루프가 핵심.',
      },
    ],
    aiInsight: 'USP는 분명합니다. 고객 검증이 GO 판단의 마지막 퍼즐입니다.',
    usp: 'Evidence → Thinking → Decision → Memory',
    positioning: '창업자 Thinking Workspace',
  },
};

export function getEvidenceForTopic(topic: InvestigationTopic): InvestigationEvidence[InvestigationTopic] {
  return MOCK_INVESTIGATION_EVIDENCE[topic];
}
