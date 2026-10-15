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
export const ACCURATE_CHOICE_LABEL = '정확함';
export const REVISE_CHOICE_LABEL = '일부 수정';
export const REJECT_CHOICE_LABEL = '이 이해가 아님';
export const REJECT_CHOICE_ANSWER = '지금 이해한 내용은 아닙니다.';
export const OTHER_CHOICE_LABEL = '기타';
export const UNKNOWN_CHOICE_LABEL = '아직 모르겠음';

/** CPO core unknowns — each must get business-specific options when the engine asks them. */
export const CORE_BUSINESS_CHOICE_GAPS = [
  'problemJtbd',
  'payer',
  'revenueModel',
  'alternativesCompetitors',
] as const;

export type BusinessChoiceKind =
  | 'accurate'
  | 'specific'
  | 'revise'
  | 'reject'
  | 'other'
  | 'unknown';

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
  mode: 'understanding-verification';
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
  const cleaned = raw.replace(/[()（）\[\]]/g, ' ').trim();
  const midClause =
    /[가-힣]{2,}[·•,][가-힣]{2,}.*(다|요|함|이다|습니다|어렵다|피곤하다|찾는다|찾는)/.test(
      cleaned,
    );
  if (midClause || (cleaned.length >= 18 && /(다|요|함|이다|습니다)$/.test(cleaned))) {
    return [cleaned.length > 48 ? clip(cleaned, 48) : cleaned];
  }
  const parts = cleaned
    .split(/\s*(?:·|•|,|，|\/|／|\||및|등)\s*/)
    .map((part) => part.replace(/^[#*\-]\s*/, '').replace(/[:：].*$/, '').trim())
    .map((part) => (part.length > 40 ? clip(part, 40) : part))
    .filter((part) => part.length >= 6)
    .filter((part) => !/(고|을|를|은|는)$/.test(part))
    .filter((part) => !/^(등|및|또는|기타|없음)$/.test(part));
  if (parts.length >= 1) return parts;
  return [cleaned.length > 48 ? clip(cleaned, 48) : cleaned].filter((part) => part.length >= 2);
}

function labeledValues(documentText: string, labels: string[]): string[] {
  const out: string[] = [];
  for (const line of documentText.split('\n')) {
    const trimmed = line.replace(/^[#*\-]\s*/, '').trim();
    if (!trimmed) continue;
    for (const label of labels) {
      const match = trimmed.match(new RegExp(`${label}\\s*(?:은|는|[:：])\\s*(.+)$`, 'i'));
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
    const label = clip(value, 48);
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

const ACTOR_NOUN_RE =
  /[가-힣A-Za-z0-9]{2,12}(?:가게|사장|양조장|관광객|소상공인|병원|학원|공장|식당|여행객|파트너|업체|기공소|원장)/g;

function extractDocumentActors(documentText: string): string[] {
  const labeled = labeledValues(documentText, [
    '대상',
    '고객',
    '타깃',
    '타겟',
    '사용자',
    '구매자',
  ]);
  const nouns = documentText.match(ACTOR_NOUN_RE) ?? [];
  return uniqueOptions([...nouns, ...labeled], new Set(), 5);
}

function topicParticle(noun: string): string {
  const trimmed = noun.trim();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    return (last - 0xac00) % 28 === 0 ? '가' : '이';
  }
  return '가';
}

function extractProblemLinkedWorkarounds(documentText: string): string[] {
  const blob = documentText.replace(/\s+/g, ' ');
  const problemLine =
    documentText
      .split('\n')
      .map((line) => line.replace(/^[#*\-]\s*/, '').trim())
      .map((line) => line.match(/^(?:문제|불편|페인|과제)\s*(?:은|는|[:：])\s*(.+)$/i)?.[1]?.trim())
      .find((value): value is string => Boolean(value && value.length >= 4)) ?? '';
  const source = `${problemLine} ${blob}`;
  const out: string[] = [];
  if (/(발견|흩어|채널이)/.test(source)) {
    out.push('이미 아는 술만 마트에서 산다', '지인에게 물어 추천받는다', '아는 양조장만 찾아간다');
  }
  if (/(주문|배송|따로 관리)/.test(source)) {
    out.push('엑셀·수첩으로 따로 관리함');
  }
  if (/(메일|오타|전사|엑셀 발주)/.test(source)) {
    out.push('엑셀에 손으로 옮긴다', 'ERP에 다시 친다');
  }
  if (/(고르|선택 피로|장\s*볼|과자)/.test(source)) {
    out.push('마트·편의점에서 산다', '쿠팡에서 검색한다');
  }
  if (/(맛없|단백질바|비싸)/.test(source)) {
    out.push('시중 단백질바를 산다', '일반 쿠키를 산다');
  }
  if (/(믿|도우미|신원|가사)/.test(source)) {
    out.push('지인 소개로 구한다', '당근·카페에서 찾는다');
  }
  return out;
}

function extractStatusQuo(documentText: string): string[] {
  const tools: string[] = [];
  const blob = documentText.replace(/\s+/g, ' ');
  if (/(엑셀|스프레드시트)/.test(blob)) tools.push('엑셀·수기 관리');
  if (/(카톡|카카오)/.test(blob)) tools.push('카카오톡으로 따로 관리');
  if (/전화/.test(blob)) tools.push('전화로 확인하고 있음');
  if (/수기/.test(blob)) tools.push('수기 장부');
  const labeled = labeledValues(documentText, ['경쟁', '대안', '기존', '지금은']);
  const workarounds = extractProblemLinkedWorkarounds(documentText);
  return uniqueOptions([...tools, ...labeled, ...workarounds], new Set(), 4);
}

function fallbackOptionsForGap(targetGap: string, documentText: string): string[] {
  const blob = documentText.replace(/\s+/g, ' ');
  const actors = extractDocumentActors(documentText);

  if (targetGap === 'customerPersona') {
    return actors;
  }

  if (targetGap === 'payer') {
    const options: string[] = [];
    if (/(B2B|소상공인|가게|제조|영업관리|견적)/.test(blob)) {
      options.push('사장님 본인', '매장·팀 관리자', '본사·가맹본부', '대표가 결재한다');
    }
    if (/(선물|30|40|부모|구독|쿠키|자사몰|아이)/.test(blob)) {
      options.push('쓰는 사람이 직접 낸다', '선물하는 사람이 낸다', '부모가 낸다');
    }
    if (/(중개|도우미|맞벌이 집|가사)/.test(blob)) {
      options.push('집이 낸다', '도우미가 낸다', '양쪽이 낸다');
    }
    if (/(여행객|현장 발견)/.test(blob)) {
      options.push('여행객이 낸다', '양조장이 입점료를 낸다');
    }
    if (/(사용자|관리자|영업|선물)/.test(blob)) {
      options.push('쓰는 사람과 돈 내는 사람이 다릅니다');
    }
    if (options.length === 0) {
      options.push(
        ...actors.slice(0, 2).map((actor) => `${actor}${topicParticle(actor)} 비용을 지불합니다`),
      );
    }
    return uniqueOptions(options, new Set(), 4);
  }

  if (targetGap === 'revenueModel' || targetGap === 'pricingHint') {
    const options: string[] = [];
    if (/구독/.test(blob)) options.push('월 구독으로 받습니다');
    if (/(수수료|중개)/.test(blob)) options.push('거래 수수료로 받습니다');
    if (/(건당|회당|사용량)/.test(blob)) options.push('사용량·건당으로 받습니다');
    const labeled = labeledValues(documentText, ['수익', '매출', '가격', '요금']);
    options.push(...labeled.map((item) => `${item}으로 수익이 납니다`));
    return uniqueOptions(options, new Set(), 4);
  }

  if (targetGap === 'alternativesCompetitors') {
    return extractStatusQuo(documentText);
  }

  if (targetGap === 'validationTestability' || targetGap === 'marketSizeEvidence') {
    return ['실제 결제나 사용 증거가 있습니다', '아직 실제 결제·사용 증거는 없습니다'];
  }

  if (targetGap === 'marketChannel') {
    const options: string[] = [];
    if (/(반찬|소상공인|가게|배송)/.test(blob)) options.push('사장님 단톡·상인 모임', '직접 방문');
    if (/(전통주|선물|양조)/.test(blob)) options.push('온라인몰', '팝업·선물 시즌');
    if (/(제조|견적|영업관리)/.test(blob)) options.push('기존 거래 메일', '영업 방문');
    if (/(부모|구독|간식)/.test(blob)) options.push('맘카페', '쿠팡·인스타');
    if (/(쿠키|헬스|단백질)/.test(blob)) options.push('헬스장', '자사몰');
    if (/(도우미|가사|중개)/.test(blob)) options.push('맞벌이 단지 단톡', '지역 카페');
    return uniqueOptions(options, new Set(), 4);
  }
  return [];
}

function answerTextForOption(targetGap: string, label: string): string {
  switch (targetGap) {
    case 'customerPersona':
      return `이 서비스를 가장 필요로 하는 사람은 ${label}입니다.`;
    case 'payer':
      return /지불|결제|낸다|냄|결재/.test(label)
        ? label
        : `서비스 비용은 ${label}이 지불합니다.`;
    case 'problemJtbd':
    case 'problemFrequencySeverity':
      return `지금 가장 크게 해결하려는 불편은 「${label.replace(/입니다$/, '')}」입니다.`;
    case 'revenueModel':
    case 'pricingHint':
      return label.includes('받') || label.includes('수익')
        ? label
        : `수익은 ${label} 구조로 발생합니다.`;
    case 'alternativesCompetitors':
      return /지금은|대안|경쟁/.test(label)
        ? `${label}으로 비슷한 일을 하고 있습니다.`
        : `지금은 ${label}으로 비슷한 일을 하고 있습니다.`;
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

function currentClaimValue(
  living: LivingUnderstandingState,
  targetGap: string,
): string | null {
  const assumed = assumedValuesForGap(living, targetGap)[0];
  if (assumed?.trim()) return assumed.trim();
  const confirmed = [...confirmedValuesForGap(living, targetGap)][0];
  if (confirmed?.trim()) return confirmed.trim();
  if (targetGap === 'customerPersona' && living.spine.customer?.trim()) {
    return clip(living.spine.customer, 36);
  }
  if (targetGap === 'problemJtbd' && living.spine.problem?.trim()) {
    return clip(living.spine.problem, 36);
  }
  if (targetGap === 'businessOneLiner' && living.spine.business?.trim()) {
    return clip(living.spine.business, 36);
  }
  return null;
}

function accurateChoice(
  targetGap: string,
  claimValue: string,
): BusinessChoiceOption {
  return {
    id: `${targetGap}-accurate`,
    label: ACCURATE_CHOICE_LABEL,
    answerText: answerTextForOption(targetGap, claimValue),
    kind: 'accurate',
    appliesToGap: targetGap,
    evidenceClassHint: 'ASSUMPTION',
  };
}

function reviseChoice(targetGap: string): BusinessChoiceOption {
  return {
    id: `${targetGap}-revise`,
    label: REVISE_CHOICE_LABEL,
    answerText: '',
    kind: 'revise',
    appliesToGap: targetGap,
    evidenceClassHint: 'ASSUMPTION',
  };
}

function rejectChoice(targetGap: string): BusinessChoiceOption {
  return {
    id: `${targetGap}-reject`,
    label: REJECT_CHOICE_LABEL,
    answerText: REJECT_CHOICE_ANSWER,
    kind: 'reject',
    appliesToGap: targetGap,
    evidenceClassHint: 'UNKNOWN',
  };
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

function understandingQuestionText(
  targetGap: string,
  claimValue: string | null,
  fallback: string,
): string {
  if (!claimValue) return fallback;
  const label = founderFieldLabel(targetGap);
  return `지금 이해로는 ${label}이(가) 「${clip(claimValue, 48)}」입니다. 이 이해가 맞나요?`;
}

function resolveTargetGap(living: LivingUnderstandingState, requested?: string | null): string {
  const requestedGap = requested?.trim();
  if (requestedGap) return requestedGap;
  return living.gaps[0]?.fieldKey ?? 'customerPersona';
}

/**
 * Build one founder-facing MCQ as understanding verification.
 * Options confirm, revise, or reject the current claim; they do not
 * pick a new engine gap.
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
  const claimValue = currentClaimValue(input.living, targetGap);
  const fallbackQuestion = toHumanLanguageQuestion(
    input.displayQuestionText?.trim() || binding.questionText,
    targetGap,
  );
  const specific = buildSpecificOptions({
    targetGap,
    documentText: input.documentText,
    living: input.living,
  }).slice(0, 3);
  const options: BusinessChoiceOption[] = [
    ...(claimValue ? [accurateChoice(targetGap, claimValue)] : []),
    ...specific,
    reviseChoice(targetGap),
    escapeChoiceValue(targetGap),
    rejectChoice(targetGap),
    unknownChoice(targetGap),
  ];

  return {
    businessSummary: buildCeoUnderstandingSnapshot(input.living),
    facts,
    assumptions,
    targetUnknown: founderFieldLabel(targetGap),
    targetGap,
    questionText: understandingQuestionText(targetGap, claimValue, fallbackQuestion),
    options,
    mode: 'understanding-verification',
  };
}

export function isEscapeChoice(option: Pick<BusinessChoiceOption, 'kind'>): boolean {
  return option.kind === 'other' || option.kind === 'revise';
}

export function isUnknownChoice(option: Pick<BusinessChoiceOption, 'kind'>): boolean {
  return option.kind === 'unknown';
}
