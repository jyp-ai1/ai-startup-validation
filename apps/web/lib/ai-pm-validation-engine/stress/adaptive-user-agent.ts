/**
 * Phase 2-D — adaptive User Agent. Answers whatever gap the AI PM actually asked,
 * with a seeded behavior mix. Each answer carries the claims it makes, which feed the stress GT.
 */

import { eulReul, euroRo, gwaWa, iGa } from './josa';
import type { StressBusinessTruth } from './stress-business-universe';

export const STRESS_BEHAVIORS = [
  'normal',
  'sparse',
  'multi_fact',
  'contradiction',
  'correction',
  'repetition',
  'repetition_paraphrase',
  'off_slot',
  'uncertainty',
  'overclaim',
  'partial',
] as const;

export type StressBehavior = (typeof STRESS_BEHAVIORS)[number];

export type StressClaim = {
  gap: string;
  value: string;
  evidence: 'FACT' | 'ASSUMPTION';
  kind: 'answer' | 'contradiction' | 'correction' | 'repetition';
};

export type StressUserTurn = {
  behavior: StressBehavior;
  /** Behavior requested by the schedule (differs when preconditions were missing). */
  scheduledBehavior: StressBehavior;
  text: string;
  claims: StressClaim[];
};

/** What the founder has already said — owned by the User Agent, not by the AI PM. */
export type StressAgentMemory = {
  /** gap → last answer text that closed it (for verbatim repetition). */
  answeredText: Record<string, string>;
  /** gap → current value the founder stands behind. */
  value: Record<string, string>;
  contradictedGaps: Set<string>;
};

export function createStressAgentMemory(): StressAgentMemory {
  return { answeredText: {}, value: {}, contradictedGaps: new Set() };
}

const WEIGHTS: Array<[StressBehavior, number]> = [
  ['normal', 30],
  ['sparse', 6],
  ['multi_fact', 8],
  ['contradiction', 7],
  ['correction', 7],
  ['repetition', 8],
  ['repetition_paraphrase', 6],
  ['off_slot', 8],
  ['uncertainty', 8],
  ['overclaim', 5],
  ['partial', 7],
];

export function seededRandom(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickBehavior(rand: () => number): StressBehavior {
  const total = WEIGHTS.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [b, w] of WEIGHTS) {
    r -= w;
    if (r < 0) return b;
  }
  return 'normal';
}

function slotValue(t: StressBusinessTruth, gap: string, mem: StressAgentMemory): string | null {
  if (mem.value[gap]) return mem.value[gap];
  switch (gap) {
    case 'businessOneLiner':
      return t.oneLiner;
    case 'customerPersona':
      return t.customer;
    case 'payer':
      return t.payer;
    case 'problemJtbd':
      return t.problem;
    case 'marketChannel':
      return t.channel;
    case 'alternativesCompetitors':
      return t.alternative;
    case 'differentiationVsAlternatives':
      return t.differentiation;
    case 'validationTestability':
      return t.validation;
    case 'revenueModel':
      return t.revenue;
    default:
      return null;
  }
}

type AnswerParts = { text: string; claims: StressClaim[] };

function normalAnswer(t: StressBusinessTruth, gap: string, value: string): AnswerParts {
  const one = (text: string): AnswerParts => ({
    text,
    claims: [{ gap, value, evidence: 'FACT', kind: 'answer' }],
  });
  switch (gap) {
    case 'businessOneLiner':
      return one(`저희 사업은 ${value}입니다.`);
    case 'customerPersona':
      return one(`핵심 고객은 ${value}입니다.`);
    case 'payer':
      return one(`비용은 ${iGa(value)} 결제합니다.`);
    case 'problemJtbd':
      return one(`고객이 겪는 가장 큰 문제는 ${value}입니다.`);
    case 'marketChannel':
      return one(`고객은 주로 ${eulReul(value)} 통해 처음 만납니다.`);
    case 'alternativesCompetitors':
      return one(`지금 고객들은 주로 ${eulReul(value)} 대안으로 씁니다.`);
    case 'differentiationVsAlternatives':
      return one(`${gwaWa(t.alternative)} 달리 ${iGa(value)} 차별점입니다.`);
    case 'validationTestability':
      return one(`${euroRo(value)} 검증할 계획입니다.`);
    case 'revenueModel':
      return one(`수익은 ${euroRo(value)} 냅니다.`);
    default:
      return nonCoreAnswer(t, gap);
  }
}

/** Gaps outside the eight required ones — answers state only what they claim. */
function nonCoreAnswer(t: StressBusinessTruth, gap: string): AnswerParts {
  switch (gap) {
    case 'solution':
      return {
        text: `${eulReul(t.oneLiner)} 통해 고객의 불편을 줄이려고 합니다.`,
        claims: [{ gap: 'solution', value: t.oneLiner, evidence: 'FACT', kind: 'answer' }],
      };
    case 'pricingHint':
      return {
        text: '가격은 월 1~2만 원 정도로 생각하고 있는데, 아직 검증하지는 않았습니다.',
        claims: [{ gap: 'pricingHint', value: '월 1~2만 원', evidence: 'ASSUMPTION', kind: 'answer' }],
      };
    case 'executionConstraints':
      return {
        text: `${t.teamSize}명 팀이라 개발 인력이 가장 큰 제약입니다.`,
        claims: [
          { gap: 'executionConstraints', value: '개발 인력', evidence: 'FACT', kind: 'answer' },
        ],
      };
    case 'differentiationHypothesis':
      return {
        text: `${iGa(t.differentiation)} 가장 큰 차별점이라고 생각합니다.`,
        claims: [
          { gap: 'differentiationHypothesis', value: t.differentiation, evidence: 'FACT', kind: 'answer' },
        ],
      };
    default:
      return { text: '그건 아직 잘 모르겠습니다.', claims: [] };
  }
}

function paraphrase(gap: string, value: string): string {
  switch (gap) {
    case 'customerPersona':
      return `다시 말씀드리면 저희 고객은 ${value}입니다.`;
    case 'problemJtbd':
      return `앞에서 말씀드린 대로 ${iGa(value)} 핵심입니다.`;
    case 'payer':
      return `말씀드린 것처럼 돈은 ${iGa(value)} 냅니다.`;
    default:
      return `앞서 말씀드린 대로 ${value}입니다.`;
  }
}

function partialAnswer(gap: string): string {
  switch (gap) {
    case 'customerPersona':
      return '고객은 여러 부류가 있어서 아직 하나로 좁히지는 못했습니다.';
    case 'problemJtbd':
      return '불편한 점이 몇 가지 있는데 아직 하나로 정리하지는 못했습니다.';
    case 'payer':
      return '결제는 고객 쪽에서 하게 될 텐데 누가 할지는 아직 정하지 못했습니다.';
    default:
      return '그 부분은 아직 대략적으로만 생각해 봤습니다.';
  }
}

const CONTRADICTABLE = ['customerPersona', 'problemJtbd'] as const;

function contradictionValue(t: StressBusinessTruth, gap: string): string {
  return gap === 'customerPersona' ? t.customerAlt : t.problemAlt;
}

export function generateStressAnswer(input: {
  truth: StressBusinessTruth;
  askedGapId: string;
  behavior: StressBehavior;
  /** Gaps the founder has already answered (FACT) and still stands behind. */
  answeredGaps: string[];
  memory: StressAgentMemory;
  rand: () => number;
}): StressUserTurn {
  const { truth: t, askedGapId: gap, memory: mem } = input;
  const scheduled = input.behavior;
  const answered = input.answeredGaps;
  const pickAnswered = (candidates: readonly string[]) => {
    const pool = candidates.filter((g) => answered.includes(g) && mem.answeredText[g]);
    return pool.length ? pool[Math.floor(input.rand() * pool.length)]! : null;
  };

  const asNormal = (behavior: StressBehavior = 'normal'): StressUserTurn => {
    const value = slotValue(t, gap, mem);
    const parts = value ? normalAnswer(t, gap, value) : nonCoreAnswer(t, gap);
    if (value) {
      mem.answeredText[gap] = parts.text;
      mem.value[gap] = value;
      mem.contradictedGaps.delete(gap);
    }
    return { behavior, scheduledBehavior: scheduled, ...parts };
  };

  switch (scheduled) {
    case 'normal':
      return asNormal();
    case 'sparse': {
      const value = slotValue(t, gap, mem);
      if (!value) return asNormal();
      mem.answeredText[gap] = `${value}.`;
      mem.value[gap] = value;
      return {
        behavior: 'sparse',
        scheduledBehavior: scheduled,
        text: `${value}.`,
        claims: [{ gap, value, evidence: 'FACT', kind: 'answer' }],
      };
    }
    case 'multi_fact': {
      const text = `${iGa(t.payer)} 결제하고 ${iGa(t.user)} ${t.usageFrequency} 사용하며, 지금은 ${euroRo(t.alternative)} 해결하고 있습니다.`;
      mem.value.payer = mem.value.payer ?? t.payer;
      mem.value.alternativesCompetitors = mem.value.alternativesCompetitors ?? t.alternative;
      return {
        behavior: 'multi_fact',
        scheduledBehavior: scheduled,
        text,
        claims: [
          { gap: 'payer', value: t.payer, evidence: 'FACT', kind: 'answer' },
          { gap: 'alternativesCompetitors', value: t.alternative, evidence: 'FACT', kind: 'answer' },
        ],
      };
    }
    case 'contradiction': {
      const target = pickAnswered(CONTRADICTABLE.filter((g) => !mem.contradictedGaps.has(g)));
      if (!target) return asNormal();
      const value = contradictionValue(t, target);
      const text =
        target === 'customerPersona'
          ? `사실 핵심 고객은 ${value}입니다.`
          : `사실 가장 큰 문제는 ${value}입니다.`;
      mem.contradictedGaps.add(target);
      return {
        behavior: 'contradiction',
        scheduledBehavior: scheduled,
        text,
        claims: [{ gap: target, value, evidence: 'FACT', kind: 'contradiction' }],
      };
    }
    case 'correction': {
      if (!answered.includes('customerPersona') || !mem.value.customerPersona) return asNormal();
      const prior = mem.value.customerPersona;
      const next = prior === t.customerCorrected ? t.customer : t.customerCorrected;
      const text = `정정합니다. 핵심 고객은 ${iGa(prior)} 아니라 ${next}입니다.`;
      mem.value.customerPersona = next;
      mem.answeredText.customerPersona = `핵심 고객은 ${next}입니다.`;
      mem.contradictedGaps.delete('customerPersona');
      return {
        behavior: 'correction',
        scheduledBehavior: scheduled,
        text,
        claims: [{ gap: 'customerPersona', value: next, evidence: 'FACT', kind: 'correction' }],
      };
    }
    case 'repetition':
    case 'repetition_paraphrase': {
      const target = pickAnswered(Object.keys(mem.answeredText).filter((g) => !mem.contradictedGaps.has(g)));
      if (!target) return asNormal();
      const value = mem.value[target]!;
      const text =
        scheduled === 'repetition' ? mem.answeredText[target]! : paraphrase(target, value);
      return {
        behavior: scheduled,
        scheduledBehavior: scheduled,
        text,
        claims: [{ gap: target, value, evidence: 'FACT', kind: 'repetition' }],
      };
    }
    case 'off_slot':
      return {
        behavior: 'off_slot',
        scheduledBehavior: scheduled,
        text: `참고로 저희 팀은 ${t.teamSize}명이고 본사는 ${t.city}에 있습니다.`,
        claims: [],
      };
    case 'uncertainty': {
      const value = slotValue(t, gap, mem);
      if (!value) return asNormal();
      return {
        behavior: 'uncertainty',
        scheduledBehavior: scheduled,
        text: `아마 ${value}일 것 같은데, 아직 확인해 보지는 않았습니다.`,
        claims: [{ gap, value, evidence: 'ASSUMPTION', kind: 'answer' }],
      };
    }
    case 'overclaim':
      return {
        behavior: 'overclaim',
        scheduledBehavior: scheduled,
        text: '이 시장은 100조 원 규모이고, 저희가 무조건 1위가 될 겁니다.',
        claims: [],
      };
    case 'partial':
      return { behavior: 'partial', scheduledBehavior: scheduled, text: partialAnswer(gap), claims: [] };
    default:
      return asNormal();
  }
}
