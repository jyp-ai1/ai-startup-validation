/**
 * Read-only code-path tracer for CPO Fix Gate review.
 * Mirrors analyzer predicates with file:line citations.
 * Not imported by analyzer, presenter, classifier, or persist SoT.
 */

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { hasCountedCompletion, hasCountedPaidConversion } from '../quantity-unit';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';

/** analyze-strategic-intelligence.ts L87 */
export const STAKE_NOUN = /(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하)/i;

/** quantity-unit.ts L16-17 */
export const PAYMENT_VERB = /(결제했|지불했|유료로\s*(썼|사용|전환))/;
export const COMPLETION_VERB = /(등록했|거래됐|거래가 됐|거래가 발생|재구매했|체결됐|실제로\s*재판매)/;

export function stakeNounHits(text: string): string[] {
  return [...text.matchAll(new RegExp(STAKE_NOUN.source, 'gi'))].map((match) => match[0]);
}

/** L296-301: quantified_problem requires % AND allowlist noun. */
export function quantifiedProblemWouldFire(line: string): boolean {
  return /\d+\s*(?:~\s*)?\d*\s*%/.test(line) && STAKE_NOUN.test(line);
}

/** L103-108 */
export function stakeWorsenedWouldFire(line: string): boolean {
  if (!STAKE_NOUN.test(line)) return false;
  if (/(악화|늘었|증가했|나빠)/.test(line)) return true;
  const pair = line.match(/(\d+)\s*%.{0,12}(에서|→)\s*(\d+)\s*%/);
  return pair !== null && Number(pair[3]) > Number(pair[1]);
}

/** L95-101 */
export function stakeImprovedWouldFire(line: string): boolean {
  if (!STAKE_NOUN.test(line)) return false;
  if (/(악화|늘었|증가했)/.test(line) && !/(줄었|감소했|개선)/.test(line)) return false;
  if (/(줄었|감소했|개선됐|개선되)/.test(line)) return true;
  const pair = line.match(/(\d+)\s*%.{0,12}(에서|→)\s*(\d+)\s*%/);
  return pair !== null && Number(pair[3]) < Number(pair[1]);
}

export function stickyNoRevenue(document: string): boolean {
  return /출시되지\s*않|매출은\s*없/.test(document);
}

export function traceDocument(document: string, founderAnswer?: string | null) {
  const combined = founderAnswer ? appendFounderEvidenceToDocument(document, founderAnswer) : document;
  const judgment = analyzeStrategicIntelligence({ documentText: combined });
  const ask = decideSiValidationAsk(judgment);
  const question = presentSiAiPmQuestion(ask, { documentText: combined });
  const lines = combined.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    document: combined,
    founderAnswer: founderAnswer ?? null,
    founderEvidenceClass: founderAnswer ? classifyFounderEvidenceClass(founderAnswer) : null,
    paidConversionOnAnswer: founderAnswer ? hasCountedPaidConversion(founderAnswer) : false,
    completionOnAnswer: founderAnswer ? hasCountedCompletion(founderAnswer) : false,
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    judgment: judgment.judgment,
    whyPossible: judgment.whyPossible,
    whyFail: judgment.whyFail,
    strengths: judgment.strengths,
    risks: judgment.risks,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
    askKind: ask.kind,
    question: question.questionText,
    whyAsking: question.whyAsking,
    evidenceMap: judgment.evidenceMap,
    gates: {
      stakeNounHits: stakeNounHits(combined),
      quantifiedProblemLines: lines.filter((line) => quantifiedProblemWouldFire(line)),
      stakeImprovedLines: lines.filter((line) => stakeImprovedWouldFire(line)),
      stakeWorsenedLines: lines.filter((line) => stakeWorsenedWouldFire(line)),
      dceStakeOpenWouldHold:
        lines.some((line) => quantifiedProblemWouldFire(line)) &&
        !lines.some((line) => stakeImprovedWouldFire(line)),
      stickyNoRevenueOrNoLaunch: stickyNoRevenue(document),
      headlineNamesViable: /가능성이 높음/.test(judgment.judgment),
      strengthNamesRevenue: judgment.strengths.some((item) => /매출/.test(item)),
      riskNamesNoCommercial: judgment.risks.some((item) => /상업 실행 증거가 없다/.test(item)),
    },
  };
}
