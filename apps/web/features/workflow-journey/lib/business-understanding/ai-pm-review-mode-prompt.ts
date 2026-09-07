/**
 * DAY 8-I P0 FIX-4 — Review mode & research acknowledgement (presentation).
 * FIX-5: next judgment focus + hypothesis label + meta confirmation ack.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS } from './ai-pm-ceo-judgment-dimensions';
import {
  buildNextCheckPrompt,
  pickNextCheckDimension,
} from './ai-pm-judgment-conclusion';

function dimensionLabel(id: keyof CeoJudgmentState['dimensions'], d: CeoJudgmentState['dimensions'][typeof id]): string {
  if (d.label?.trim()) return d.label;
  return CEO_JUDGMENT_DIMENSION_LABELS[id];
}

export function formatReviewModeDisplay(judgment: CeoJudgmentState): string {
  const line = (id: keyof CeoJudgmentState['dimensions']) => {
    const d = judgment.dimensions[id];
    const val = d.summary.trim() || '(미확인)';
    const prefix =
      d.evidenceType === 'hypothesis' ? '🟡 (가설) ' : '';
    return `${dimensionLabel(id, d)}: ${prefix}${val}`;
  };

  const nextFocusId = pickNextCheckDimension(judgment);
  const nextFocus = nextFocusId
    ? buildNextCheckPrompt(nextFocusId)
    : '현재 정보로 사업 판단을 계속 정교화할 수 있습니다.';

  return [
    '[현재 AI 판단]',
    line('customer'),
    line('problem'),
    line('solution'),
    line('customerChange'),
    '',
    '[다음 AI 판단 초점]',
    `· ${nextFocus}`,
    '',
    '[다음 선택]',
    '· 이 부분 보완하기',
    '· 현재 정보로 계속 검토',
  ].join('\n');
}

export function formatResearchAcknowledgement(answer: string): string {
  const t = answer.trim();
  if (/경쟁사/.test(t)) {
    return '알겠습니다. 경쟁사 확인이 필요한 상태로 기록했습니다. [검토 흐름으로 돌아가기]';
  }
  if (/시장\s*조사|조사는\s*AI/.test(t)) {
    return '알겠습니다. 시장 조사 요청으로 기록했습니다. [검토 흐름으로 돌아가기]';
  }
  return '알겠습니다. 확인·조사 요청으로 기록했습니다. [검토 흐름으로 돌아가기]';
}

export function isResearchIntentAnswer(answer: string): boolean {
  return /(?:확인해\s*주세요|조사(?:해|를)?|research|경쟁사)/i.test(answer.trim());
}

export function isMetaConfirmationPrompt(text: string): boolean {
  return text.trim().startsWith('알겠습니다. 지금까지 정리한');
}
