import type { SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';
import { SI_VERDICT_LABELS } from '@repo/types/domain/strategic-intelligence';

/**
 * Founder-visible judgment presenter.
 * Does not recompute stage, verdict, CU, evidence, or questions.
 * Reconciles verdict meaning at the current validation altitude so S3 and S4
 * are not shown as the same headline.
 */
export function presentSiFounderHeadline(
  judgment: Pick<SiStrategicJudgment, 'stageId' | 'verdictId'>,
): string {
  const verdictLabel = SI_VERDICT_LABELS[judgment.verdictId];
  if (judgment.verdictId !== 'viable') return verdictLabel;
  if (judgment.stageId === 'S4') return verdictLabel;
  if (judgment.stageId === 'S3') {
    return '출시·초기 매출은 있으나 반복 검증은 아직이다';
  }
  return verdictLabel;
}

export function presentSiFounderJudgment(judgment: SiStrategicJudgment): {
  headline: string;
  prose: string;
} {
  const headline = presentSiFounderHeadline(judgment);
  const leading = `현재 판단: ${SI_VERDICT_LABELS[judgment.verdictId]}`;
  const prose = judgment.judgment.startsWith(leading)
    ? `현재 판단: ${headline}${judgment.judgment.slice(leading.length)}`
    : judgment.judgment;
  return { headline, prose };
}
