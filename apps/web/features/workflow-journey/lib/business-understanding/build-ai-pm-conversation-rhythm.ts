import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** S5.2 — Three CEO-visible lines (confirm only, no explanation). */
export type AiPmCompactLines = {
  lines: [string, string, string];
};

/** S5.1 — CEO answer → we solved one thing together (not new analysis). */
export type AiPmTurnRecognition = {
  lead: string;
  body: string;
};

/** S5.1 — Tiny win after each turn. */
export type AiPmTinyWin = {
  label: string;
  value: string;
  celebration: string;
};

/** S5.1 — Co-judgment before question (not AI assignment). */
export type AiPmAgreement = {
  hedge: string;
  invite: string;
};

const COMPACT_CONFIRM: Record<AiPmLoopIssueId, string> = {
  customer_definition: '이제 구매자는 명확합니다.',
  problem_definition: '이제 핵심 문제는 명확합니다.',
  bm_design: '이제 수익 구조는 명확합니다.',
  competitor_analysis: '이제 대체재는 명확합니다.',
  market_validation: '이제 시장 타이밍은 명확합니다.',
};

const COMPACT_NEXT: Partial<Record<AiPmLoopIssueId, string>> = {
  customer_definition: '다음은 문제만 같이 보면 됩니다.',
  problem_definition: '다음은 수익 구조만 같이 보면 됩니다.',
  bm_design: '다음은 경쟁만 같이 보면 됩니다.',
  competitor_analysis: '다음은 시장만 같이 보면 됩니다.',
  market_validation: '다음은 정리만 같이 보면 됩니다.',
};

const RECOGNITION_BODY: Record<AiPmLoopIssueId, string> = {
  customer_definition:
    '이 답변 하나로, 우리가 이제 고객과 구매자를 구분할 수 있게 됐습니다.',
  problem_definition:
    '이 답변 하나로, 우리가 이제 왜 돈을 낼 만큼 아픈지 한 줄로 잡을 수 있게 됐습니다.',
  bm_design: '이 답변 하나로, 우리가 이제 누가 얼마를 내는지 윤곽을 잡을 수 있게 됐습니다.',
  competitor_analysis:
    '이 답변 하나로, 우리가 이제 고객이 무엇을 대신 쓰는지 볼 수 있게 됐습니다.',
  market_validation:
    '이 답변 하나로, 우리가 이제 왜 지금 이 시장인지 말할 수 있게 됐습니다.',
};

const TINY_WIN_LABEL: Record<AiPmLoopIssueId, string> = {
  customer_definition: '구매자',
  problem_definition: '핵심 문제',
  bm_design: '수익 구조',
  competitor_analysis: '대체재',
  market_validation: '시장 타이밍',
};

function truncate(text: string, max = 40): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function tinyWinValue(turn: AiPmLoopTurn): string {
  const answer = turn.answer.trim();
  if (turn.issueId === 'customer_definition') {
    const payer = answer.match(/구매자(?:는|가)?\s*([^,.。\n입니다]{1,12})/);
    if (payer?.[1]) return truncate(payer[1], 24);
    if (/대표/i.test(answer)) return '대표';
  }
  return truncate(answer, 32);
}

/** S5.2 — Recognition as three short lines (no tiny-win card). */
export function buildCompactRecognition(
  turn: AiPmLoopTurn,
  nextIssueId?: AiPmLoopIssueId | null,
): AiPmCompactLines {
  const nextLine =
    (nextIssueId ? COMPACT_NEXT[turn.issueId] : undefined) ?? '다음만 같이 보면 됩니다.';
  return {
    lines: ['좋습니다.', COMPACT_CONFIRM[turn.issueId], nextLine],
  };
}

/** S5.2 — Agreement + permission + question as three lines. */
export function buildCompactQuestionInvite(
  _issueId: AiPmLoopIssueId,
  question: string,
): AiPmCompactLines {
  return {
    lines: ['제가 하나 놓친 게 있을 수도 있습니다.', '같이 확인해 볼까요?', question],
  };
}

export function formatCompactLines(block: AiPmCompactLines): string {
  return block.lines.join('\n');
}

/** Recognition after CEO answer — before next thinking. */
export function buildTurnRecognition(turn: AiPmLoopTurn): AiPmTurnRecognition {
  return {
    lead: '좋습니다.',
    body: RECOGNITION_BODY[turn.issueId],
  };
}

/** Tiny win — one line resolved + celebration. */
export function buildTinyWin(turn: AiPmLoopTurn): AiPmTinyWin {
  return {
    label: TINY_WIN_LABEL[turn.issueId],
    value: tinyWinValue(turn),
    celebration: '이제 사업이 한 단계 선명해졌습니다.',
  };
}

/** Agreement before question — CEO as co-judge, not answerer. */
export function buildAgreement(_issueId: AiPmLoopIssueId): AiPmAgreement {
  return {
    hedge: '제가 하나 놓친 게 있을 수도 있습니다.',
    invite: '같이 확인해 볼까요?',
  };
}

/** Question permission — joint exploration, not forced quiz. */
export function buildQuestionPermission(_issueId: AiPmLoopIssueId): string {
  return '같이 확인해 볼까요?';
}

export function formatAgreementProse(agreement: AiPmAgreement): string {
  return `${agreement.hedge}\n${agreement.invite}`;
}
