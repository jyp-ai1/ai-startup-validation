/**
 * Core Final W4 — One Question / One Judgment Purpose.
 * A single ask surface must not multi-ask competition+price+customer.
 */

export type JudgmentPurpose =
  | 'customer'
  | 'problem'
  | 'payer'
  | 'competition'
  | 'differentiation'
  | 'diff_relevance'
  | 'defensibility'
  | 'revenue'
  | 'pricing'
  | 'market'
  | 'channel'
  | 'business'
  | 'other';

const GAP_PURPOSE: Record<string, JudgmentPurpose> = {
  customerPersona: 'customer',
  problemJtbd: 'problem',
  problemFrequencySeverity: 'problem',
  payer: 'payer',
  alternativesCompetitors: 'competition',
  differentiationVsAlternatives: 'differentiation',
  differentiationHypothesis: 'differentiation',
  validationTestability: 'diff_relevance',
  executionConstraints: 'defensibility',
  revenueModel: 'revenue',
  pricingHint: 'pricing',
  marketSizeEvidence: 'market',
  marketChannel: 'channel',
  businessOneLiner: 'business',
  categoryScope: 'business',
  solution: 'business',
};

/** Map gap → single judgment purpose. */
export function judgmentPurposeForGap(targetGap: string): JudgmentPurpose {
  return GAP_PURPOSE[targetGap] ?? 'other';
}

/**
 * Detect multi-ask patterns in a single question string.
 * Returns purposes found; length > 1 ⇒ impure.
 */
export function detectQuestionPurposes(questionText: string): JudgmentPurpose[] {
  const q = questionText.replace(/\s+/g, ' ').trim();
  if (!q) return [];

  const found: JudgmentPurpose[] = [];
  const push = (p: JudgmentPurpose) => {
    if (!found.includes(p)) found.push(p);
  };

  if (/필요로 하는 사람|고객|타깃|페르소나|누구인가요/.test(q) && !/차별점이\s*고객|고객에게\s*왜/.test(q)) {
    push('customer');
  }
  if (/불편|문제|JTBD|해결하려는/.test(q)) push('problem');
  if (/누가\s*지불|비용은 누가|결제자|payer/.test(q)) push('payer');
  if (/비슷한 역할|이미 하고 있는 서비스|대안·경쟁|경쟁사(?!\s*가\s*따라)/.test(q)) {
    push('competition');
  }
  if (/차별점|우리만의 차이|대안과 무엇이 다|결정적 차이/.test(q) && !/고객에게\s*왜|체감/.test(q)) {
    push('differentiation');
  }
  if (/고객에게\s*왜\s*중요|체감되는 순간|차별점이\s*고객/.test(q)) push('diff_relevance');
  if (/방어력|따라오|해자|모방/.test(q)) push('defensibility');
  if (/수익은 어떤 구조|수익이 발생|수수료·구독/.test(q)) push('revenue');
  if (/가격·요금|프라이싱|pricing/.test(q)) push('pricing');
  if (/시장에 수요|수요가 있다는 근거|시장·수요/.test(q)) push('market');
  if (/검증할 채널|도달·검증할 채널/.test(q)) push('channel');

  // Dual question marks / "또한" / second sentence ask
  const askCount = (q.match(/\?/g) ?? []).length + (q.match(/\？/g) ?? []).length;
  if (askCount >= 2 && found.length <= 1) {
    // Two asks same domain still impure for W4
    push(found[0] ?? 'other');
    if (found.length === 1) found.push('other');
  }

  return found;
}

export type QuestionPurityResult = {
  pure: boolean;
  purposes: JudgmentPurpose[];
  /** Sanitized single-purpose question (first purpose only) */
  sanitizedText: string;
};

/**
 * Enforce one judgment purpose. If mixed, keep the primary gap purpose only.
 */
export function enforceQuestionPurity(input: {
  questionText: string;
  targetGap: string;
}): QuestionPurityResult {
  const expected = judgmentPurposeForGap(input.targetGap);
  const purposes = detectQuestionPurposes(input.questionText);

  // Split on second question if dual-ask same screen
  let sanitized = input.questionText.replace(/\s+/g, ' ').trim();
  const qMarks = [...sanitized.matchAll(/[?\？]/g)];
  if (qMarks.length >= 2 && qMarks[0]) {
    sanitized = sanitized.slice(0, qMarks[0].index! + 1).trim();
  }

  // Drop trailing "또한 … ?" clauses
  sanitized = sanitized.replace(/\s*(또한|그리고|아울러)\s+.+$/u, '').trim();
  if (!/[?\？]$/.test(sanitized) && sanitized.length > 0) {
    sanitized = `${sanitized.replace(/[.。]$/, '')}?`;
  }

  const after = detectQuestionPurposes(sanitized);
  const mixed =
    purposes.length > 1 ||
    (after.length > 1 && !after.every((p) => p === expected || p === 'other'));

  // If still mixed vs expected, prefer stock single-purpose from gap (caller may re-bind)
  if (mixed && after.length > 1) {
    return {
      pure: false,
      purposes,
      sanitizedText: sanitized,
    };
  }

  return {
    pure: !mixed || (after.length === 1 && after[0] === expected),
    purposes: after.length > 0 ? after : [expected],
    sanitizedText: sanitized,
  };
}

/** True when question asks more than one judgment purpose. */
export function isMixedQuestion(questionText: string): boolean {
  return detectQuestionPurposes(questionText).length > 1;
}
