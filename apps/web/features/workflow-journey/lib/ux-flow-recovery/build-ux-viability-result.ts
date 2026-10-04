/**
 * Presentation mapper: existing living + analysis presenter → result screen.
 * Does not compute a new GO/HOLD engine.
 */

import type { ConversationalFinalOutput } from '../business-understanding/build-conversational-final-output';
import type { AnalysisScreenPresenter } from '../business-understanding/present-analysis-screen';
import {
  resolveFounderContext,
  resultSectionOrder,
  type ResultSectionId,
} from './founder-context-lens';
import { sanitizeUxCopy } from './sanitize-ux-copy';

export type UxVerdictLabel = 'GO' | 'HOLD' | '조건부';

export type UxViabilityResultView = {
  title: string;
  verdict: UxVerdictLabel;
  judgment: string;
  why: string;
  confirmedFacts: string[];
  assumptions: string[];
  unknowns: string[];
  risks: string[];
  nextValidation: string[];
  nextActions: string[];
  sectionOrder: ResultSectionId[];
  pdfReady: boolean;
};

function verdictFromJudgment(judgment: string): UxVerdictLabel {
  if (/\bGO\b/i.test(judgment) && !/HOLD/i.test(judgment)) return 'GO';
  if (/조건부/.test(judgment)) return '조건부';
  return 'HOLD';
}

export function buildUxViabilityResult(input: {
  finalOutput?: ConversationalFinalOutput | null;
  presenter?: AnalysisScreenPresenter | null;
  unknowns?: string[];
  reviewType?: string | null;
}): UxViabilityResultView {
  const judgment =
    sanitizeUxCopy(input.presenter?.judgment) ||
    sanitizeUxCopy(input.finalOutput?.judgmentSummary) ||
    '현재 정보만으로는 사업성 판단을 확정하기 어렵습니다.';

  const why =
    input.presenter?.reasons?.[0] ||
    input.presenter?.criticalGap ||
    '현재 고객의 실제 문제와 지불 의향에 대한 검증 근거가 부족합니다.';

  const rows = input.finalOutput?.claimRows ?? [];
  const confirmedFacts = rows
    .filter((row) => row.status === 'Confirmed' && row.value?.trim())
    .map((row) => `${row.domain}: ${row.value!.trim()}`);
  const assumptions = rows
    .filter((row) => (row.status === 'Inferred' || row.status === 'Needs check') && row.value?.trim())
    .map((row) => `${row.domain}: ${row.value!.trim()}`);
  const unknowns =
    input.unknowns?.length
      ? input.unknowns
      : rows.filter((row) => row.status === 'Unknown' || !row.value?.trim()).map((row) => row.domain);

  const nextValidation = [
    input.presenter?.criticalGap,
    ...((input.presenter?.secondary ?? []).map((item) => item.action)),
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .slice(0, 3);

  const risks = [
    ...(input.presenter?.evidence ?? []),
    input.presenter?.criticalGap,
  ]
    .filter((line): line is string => Boolean(line?.trim()))
    .filter((line, index, all) => all.indexOf(line) === index)
    .slice(0, 4);

  const resolvedNext = nextValidation.length
    ? nextValidation
    : ['핵심 문제와 지불 의향을 실제 근거로 확인해 주세요.'];

  const founderContext = resolveFounderContext(input.reviewType);

  return {
    title: '현재 사업성 판단',
    verdict: verdictFromJudgment(judgment),
    judgment,
    why: sanitizeUxCopy(why),
    confirmedFacts,
    assumptions,
    unknowns: unknowns.length ? unknowns : ['아직 확인되지 않은 핵심 공백이 있습니다.'],
    risks: risks.length ? risks : ['아직 핵심 리스크를 확정하지 못했습니다.'],
    nextValidation: resolvedNext,
    nextActions: resolvedNext,
    sectionOrder: resultSectionOrder(founderContext),
    pdfReady: false,
  };
}
