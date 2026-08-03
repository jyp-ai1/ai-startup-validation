/**
 * Insight Builder — Decision + Evidence → Insight (explanation of Rule).
 * No LLM. No Insight without Evidence citation.
 * ProblemFit is Insight language only (CPO Fold) — never a Decision Family.
 */
import type { AnalysisInput, Decision, EvidenceId, Insight } from './types';

const CLAIM: Record<string, string> = {
  'RevenueValidation:Insufficient':
    '수익 구조에 대한 근거가 부족하여 시장성을 판단할 수 없습니다.',
  'RevenueValidation:Fragile':
    '수익 구조가 추정 단계라 시장성 판단은 취약합니다. 확인 후 재판단하세요.',
  'RevenueValidation:Ready':
    '수익 근거가 확보되어 시장성 판단을 이어갈 수 있습니다.',
  'MarketJudgment:Ready':
    '고객과 수익 근거가 확인되어 시장성 판단을 시작할 수 있습니다.',
  'AnalysisGate:Blocked':
    '고객 Evidence가 없어 분석을 시작하기에 부족합니다.',
};

/**
 * Fold: when Decision already rests on confirmed customer+problem,
 * Problem Fit appears only as Insight wording — not as ProblemFit Decision.
 */
function foldProblemFitLanguage(
  d: Decision,
  input: AnalysisInput,
  baseClaim: string,
): string {
  const customer = input.evidence.customer ?? 'unknown';
  const problem = input.evidence.problem ?? 'unknown';
  if (customer !== 'confirmed' || problem !== 'confirmed') return baseClaim;
  if (d.code === 'RevenueValidation' && d.value === 'Insufficient') {
    return `고객·문제에 대한 이해(Problem Fit)는 있으나, ${baseClaim}`;
  }
  if (d.code === 'MarketJudgment' && d.value === 'Ready') {
    return `고객·문제에 대한 이해(Problem Fit)와 함께, ${baseClaim}`;
  }
  return baseClaim;
}

function claimFor(d: Decision, input: AnalysisInput): string {
  const key = `${d.code}:${d.value}`;
  const base =
    CLAIM[key] ??
    `${d.code}=${d.value} (rule ${d.ruleId}; evidence: ${d.evidenceRefs.join(',')})`;
  return foldProblemFitLanguage(d, input, base);
}

function confidenceFor(d: Decision): Insight['confidence'] {
  if (d.value === 'Fragile') return 'fragile';
  if (d.value === 'Insufficient' || d.value === 'Blocked') return 'insufficient';
  return 'supported';
}

export function buildInsight(decision: Decision, input: AnalysisInput): Insight {
  if (decision.evidenceRefs.length === 0) {
    throw new Error(`NoHallucination: Decision ${decision.code} has no evidenceRefs`);
  }

  return {
    decisionCode: decision.code,
    decisionValue: decision.value,
    claim: claimFor(decision, input),
    basisEvidenceIds: [...decision.evidenceRefs] as EvidenceId[],
    confidence: confidenceFor(decision),
    ruleId: decision.ruleId,
  };
}

export function buildInsights(
  decisions: Decision[],
  input: AnalysisInput,
): Insight[] {
  return decisions.map((d) => buildInsight(d, input));
}
