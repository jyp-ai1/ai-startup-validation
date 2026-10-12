/**
 * Business-specific MCQ on top of the existing V3 ask.
 * Does not replace question selection, review, or judgment engines.
 */

import { buildCeoUnderstandingSnapshot } from './ai-pm-judgment-presenter';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';
import { founderFieldLabel } from './founder-field-labels';
import { resolveGapQuestionBinding } from './gap-question-map';
import {
  type LivingClaim,
  type LivingUnderstandingState,
} from './living-understanding-state';

export const UNKNOWN_CHOICE_ANSWER = '아직 모르겠습니다.';
export const OTHER_CHOICE_LABEL = '기타';
export const UNKNOWN_CHOICE_LABEL = '아직 모르겠음';

export type BusinessChoiceKind = 'specific' | 'other' | 'unknown';

export type BusinessChoiceEvidenceClass = 'FACT' | 'ASSUMPTION' | 'UNKNOWN';

export type BusinessChoiceOption = {
  id: string;
  label: string;
  /** Submitted through the existing answer pipeline. */
  answerText: string;
  kind: BusinessChoiceKind;
  appliesToGap: string;
  evidenceClassHint: BusinessChoiceEvidenceClass;
};

export type BusinessChoiceQuestion = {
  businessSummary: string;
  facts: string[];
  assumptions: string[];
  targetUnknown: string;
  targetGap: string;
  questionText: string;
  options: BusinessChoiceOption[];
};

const CONFIRMED_PROVENANCE = new Set(['USER_CONFIRMED', 'USER_CORRECTED']);

const GAP_LINE_LABELS: Record<string, string[]> = {
  customerPersona: ['대상', '고객', '타깃', '타겟', '사용자', '페르소나'],
  payer: ['결제자', '구매자', '지불', '누가 내'],
  problemJtbd: ['문제', '불편', '페인', 'pain', '과제'],
  problemFrequencySeverity: ['빈도', '심각', '얼마나 자주'],
  revenueModel: ['수익', '매출', '가격', '요금', '구독', '수수료'],
  pricingHint: ['가격', '요금', '단가'],
  alternativesCompetitors: ['경쟁', '대안', '기존', '지금은'],
  differentiationVsAlternatives: ['차별', '강점', '다른 점', '우리만'],
  differentiationHypothesis: ['차별', '포지션'],
  marketChannel: ['채널', '유입', '판매 경로'],
  marketSizeEvidence: ['수요', '시장', '규모'],
  solution: ['서비스', '해결', '제공'],
  businessOneLiner: ['사업', '한 줄', '서비스'],
  validationTestability: ['검증', '증거', '성과', '결제'],
};

function clip(text: string, max = 80): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/["""''「」]/g, '')
    .replace(/(입니다|이다|이에요|예요|함|해야\s*함)$/g, '')
    .replace(/[·•,/／|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitCandidates(raw: string): string[] {
  return raw
    .replace(/[()（）\[\]]/g, ' ')
    .split(/\s*(?:·|•|,|，|\/|／|\||및|과|와|등)\s*/)
    .map((part) => part.replace(/^[#*\-]\s*/, '').replace(/[:：].*$/, '').trim())
    .filter((part) => part.length >= 2 && part.length <= 36)
    .filter((part) => !/^(등|및|또는|기타|없음)$/.test(part));
}

function labeledValues(documentText: string, labels: string[]): string[] {
  const out: string[] = [];
  for (const line of documentText.split('\n')) {
    const trimmed = line.replace(/^[#*\-]\s*/, '').trim();
    if (!trimmed) continue;
    for (const label of labels) {
      const match = trimmed.match(new RegExp(`${label}\\s*[:：]\\s*(.+)$`, 'i'));
      if (match?.[1]) {
        out.push(...splitCandidates(match[1]));
      }
    }
  }
  return out;
}

function keywordClauses(documentText: string, labels: string[]): string[] {
  const out: string[] = [];
  for (const line of documentText.split('\n')) {
    const trimmed = line.replace(/^[#*\-]\s*/, '').trim();
    if (trimmed.length < 6) continue;
    if (labels.some((label) => trimmed.toLowerCase().includes(label.toLowerCase()))) {
      const afterLabel = trimmed.replace(/^[^:：]{0,12}[:：]\s*/, '').trim();
      out.push(...splitCandidates(afterLabel.length >= 4 ? afterLabel : trimmed));
    }
  }
  return out;
}

function isConfirmedClaim(claim: LivingClaim): boolean {
  return (
    Boolean(claim.value?.trim()) &&
    (claim.status === 'confirmed' ||
      CONFIRMED_PROVENANCE.has(claim.provenance) ||
      claim.confidence === 'USER_CONFIRMED' ||
      claim.confidence === 'VALIDATED')
  );
}

function isUserAnsweredClaim(claim: LivingClaim): boolean {
  if (!claim.value?.trim()) return false;
  if (isConfirmedClaim(claim)) return true;
  return claim.evidence.some((item) => item.kind === 'user_answer');
}

function isAssumedClaim(claim: LivingClaim): boolean {
  if (!claim.value?.trim()) return false;
  if (isConfirmedClaim(claim)) return false;
  if (claim.status === 'unknown' || claim.status === 'superseded') return false;
  return (
    claim.status === 'inferred' ||
    claim.status === 'known' ||
    claim.provenance === 'DOCUMENT' ||
    claim.provenance === 'AI_INFERENCE' ||
    claim.confidence === 'INFERRED' ||
    claim.confidence === 'PROPOSED'
  );
}

function partitionUnderstanding(living: LivingUnderstandingState): {
  facts: string[];
  assumptions: string[];
} {
  const facts: string[] = [];
  const assumptions: string[] = [];
  const seen = new Set<string>();

  for (const claim of living.claims) {
    const value = claim.value?.trim();
    if (!value) continue;
    const key = normalizeToken(`${claim.fieldKey}:${value}`);
    if (seen.has(key)) continue;
    seen.add(key);
    const line = `${founderFieldLabel(claim.fieldKey)}: ${clip(value, 56)}`;
    if (isConfirmedClaim(claim)) facts.push(line);
    else if (isAssumedClaim(claim)) assumptions.push(line);
  }

  return { facts: facts.slice(0, 4), assumptions: assumptions.slice(0, 4) };
}

function confirmedValuesForGap(
  living: LivingUnderstandingState,
  targetGap: string,
): Set<string> {
  const confirmed = new Set<string>();
  const remember = (value: string) => {
    const key = normalizeToken(value);
    if (key.length >= 2) confirmed.add(key);
  };
  for (const claim of living.claims) {
    if (claim.fieldKey !== targetGap || !isUserAnsweredClaim(claim) || !claim.value) continue;
    remember(claim.value);
    for (const part of splitCandidates(claim.value)) remember(part);
    const persona = claim.value.match(/사람은\s+(.+?)입니다/);
    if (persona?.[1]) remember(persona[1]);
  }
  return confirmed;
}

function assumedValuesForGap(
  living: LivingUnderstandingState,
  targetGap: string,
): string[] {
  return living.claims
    .filter((claim) => claim.fieldKey === targetGap && isAssumedClaim(claim) && claim.value)
    .map((claim) => clip(claim.value!.trim(), 36));
}

function isCoveredByKnown(key: string, known: Set<string>): boolean {
  if (known.has(key)) return true;
  for (const item of known) {
    if (item.includes(key) || key.includes(item)) return true;
  }
  return false;
}

function uniqueOptions(
  values: string[],
  confirmed: Set<string>,
  max = 4,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const label = clip(value, 36);
    const key = normalizeToken(label);
    if (key.length < 2 || seen.has(key) || isCoveredByKnown(key, confirmed)) continue;
    if ([...seen].some((existing) => existing.includes(key) || key.includes(existing))) {
      continue;
    }
    seen.add(key);
    out.push(label);
    if (out.length >= max) break;
  }
  return out;
}

function fallbackOptionsForGap(targetGap: string, documentText: string): string[] {
  const blob = documentText.replace(/\s+/g, ' ');
  if (targetGap === 'payer') {
    const options: string[] = [];
    if (/(고객|사용자|관광객|소비자)/.test(blob)) {
      options.push('서비스를 쓰는 사람이 직접 지불합니다');
    }
    if (/(기업|사장|양조장|가게|B2B|파트너)/i.test(blob)) {
      options.push('가게·파트너가 비용을 지불합니다');
    }
    return options;
  }
  if (targetGap === 'revenueModel' || targetGap === 'pricingHint') {
    const options: string[] = [];
    if (/구독/.test(blob)) options.push('월 구독으로 받습니다');
    if (/(수수료|중개)/.test(blob)) options.push('거래 수수료로 받습니다');
    if (/(건당|회당|사용량)/.test(blob)) options.push('사용량·건당으로 받습니다');
    if (options.length === 0 && /(수익|매출|가격|요금)/.test(blob)) {
      options.push('문서에 적힌 수익 단서가 맞습니다');
    }
    return options;
  }
  if (targetGap === 'validationTestability' || targetGap === 'marketSizeEvidence') {
    return ['실제 결제나 사용 증거가 있습니다', '아직 실제 결제·사용 증거는 없습니다'];
  }
  return [];
}

function answerTextForOption(targetGap: string, label: string): string {
  switch (targetGap) {
    case 'customerPersona':
      return `이 서비스를 가장 필요로 하는 사람은 ${label}입니다.`;
    case 'payer':
      return label.includes('지불') || label.includes('결제')
        ? label
        : `서비스 비용은 ${label}이 지불합니다.`;
    case 'problemJtbd':
    case 'problemFrequencySeverity':
      return `지금 가장 크게 해결하려는 불편은 ${label}입니다.`;
    case 'revenueModel':
    case 'pricingHint':
      return label.includes('받') || label.includes('수익')
        ? label
        : `수익은 ${label} 구조로 발생합니다.`;
    case 'alternativesCompetitors':
      return `지금은 ${label}으로 비슷한 일을 하고 있습니다.`;
    case 'differentiationVsAlternatives':
    case 'differentiationHypothesis':
      return `경쟁 대비 차별점은 ${label}입니다.`;
    case 'solution':
    case 'businessOneLiner':
      return `이 사업은 ${label}을 제공합니다.`;
    case 'validationTestability':
    case 'marketSizeEvidence':
      return label;
    default:
      return `${founderFieldLabel(targetGap)}은 ${label}입니다.`;
  }
}

function buildSpecificOptions(input: {
  targetGap: string;
  documentText: string;
  living: LivingUnderstandingState;
}): BusinessChoiceOption[] {
  const labels = GAP_LINE_LABELS[input.targetGap] ?? [];
  const confirmed = confirmedValuesForGap(input.living, input.targetGap);
  const fromDocument = [
    ...labeledValues(input.documentText, labels),
    ...keywordClauses(input.documentText, labels),
    ...assumedValuesForGap(input.living, input.targetGap),
    ...fallbackOptionsForGap(input.targetGap, input.documentText),
  ];
  const unique = uniqueOptions(fromDocument, confirmed, 4);
  return unique.map((label, index) => ({
    id: `${input.targetGap}-opt-${index + 1}`,
    label,
    answerText: answerTextForOption(input.targetGap, label),
    kind: 'specific' as const,
    appliesToGap: input.targetGap,
    evidenceClassHint: 'ASSUMPTION' as const,
  }));
}

function escapeChoiceValue(targetGap: string): BusinessChoiceOption {
  return {
    id: `${targetGap}-other`,
    label: OTHER_CHOICE_LABEL,
    answerText: '',
    kind: 'other',
    appliesToGap: targetGap,
    evidenceClassHint: 'ASSUMPTION',
  };
}

function unknownChoice(targetGap: string): BusinessChoiceOption {
  return {
    id: `${targetGap}-unknown`,
    label: UNKNOWN_CHOICE_LABEL,
    answerText: UNKNOWN_CHOICE_ANSWER,
    kind: 'unknown',
    appliesToGap: targetGap,
    evidenceClassHint: 'UNKNOWN',
  };
}

function resolveTargetGap(living: LivingUnderstandingState, requested?: string | null): string {
  const requestedGap = requested?.trim();
  if (requestedGap) return requestedGap;
  return living.gaps[0]?.fieldKey ?? 'customerPersona';
}

/**
 * Build one founder-facing MCQ for the already-selected unknown.
 * Reuses living summary + gap question text. Does not pick a new engine gap.
 */
export function buildBusinessChoiceQuestion(input: {
  living: LivingUnderstandingState;
  documentText: string;
  targetGap?: string | null;
  displayQuestionText?: string | null;
}): BusinessChoiceQuestion {
  const targetGap = resolveTargetGap(input.living, input.targetGap);
  const binding = resolveGapQuestionBinding(targetGap);
  const { facts, assumptions } = partitionUnderstanding(input.living);
  const questionText = toHumanLanguageQuestion(
    input.displayQuestionText?.trim() || binding.questionText,
    targetGap,
  );
  const options = [
    ...buildSpecificOptions({
      targetGap,
      documentText: input.documentText,
      living: input.living,
    }),
    escapeChoiceValue(targetGap),
    unknownChoice(targetGap),
  ];

  return {
    businessSummary: buildCeoUnderstandingSnapshot(input.living),
    facts,
    assumptions,
    targetUnknown: founderFieldLabel(targetGap),
    targetGap,
    questionText,
    options,
  };
}

export function isEscapeChoice(option: Pick<BusinessChoiceOption, 'kind'>): boolean {
  return option.kind === 'other';
}

export function isUnknownChoice(option: Pick<BusinessChoiceOption, 'kind'>): boolean {
  return option.kind === 'unknown';
}
