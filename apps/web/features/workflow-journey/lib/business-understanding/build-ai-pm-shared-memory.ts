import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type AiPmSharedUnderstandingItem = {
  label: string;
  value?: string;
};

/** "우리가 함께 이해한 것" — shown before document delta. */
export type AiPmSharedMemory = {
  lead: string;
  items: AiPmSharedUnderstandingItem[];
  nextStep: string;
};

const ISSUE_MEMORY_LABEL: Record<AiPmLoopIssueId, string> = {
  customer_definition: '구매자',
  problem_definition: '핵심 문제',
  bm_design: '수익 구조',
  competitor_analysis: '대체재',
  market_validation: '시장 타이밍',
};

const NEXT_STEP_LABEL: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객',
  problem_definition: '문제',
  bm_design: '수익 구조',
  competitor_analysis: '경쟁·대체재',
  market_validation: '시장',
};

function truncateValue(value: string, max = 36): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function extractMemoryItems(turn: AiPmLoopTurn): AiPmSharedUnderstandingItem[] {
  const answer = turn.answer.trim();
  const baseLabel = ISSUE_MEMORY_LABEL[turn.issueId];

  if (turn.issueId === 'customer_definition') {
    const items: AiPmSharedUnderstandingItem[] = [
      { label: '구매자', value: truncateValue(answer) },
    ];
    if (/사용자|실무|팀장|담당|user/i.test(answer) && !/구매자만|구매자는\s*대표/i.test(answer)) {
      items.push({ label: '사용자', value: truncateValue(answer) });
    }
    return items;
  }

  return [{ label: baseLabel, value: truncateValue(answer) }];
}

function koreanObjectParticle(noun: string): string {
  const lastChar = noun.charCodeAt(noun.length - 1);
  const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
  return hasBatchim ? `${noun}을` : `${noun}를`;
}

/** Build collaborative checklist from completed loop turns. */
export function buildAiPmSharedMemory(
  turns: AiPmLoopTurn[],
  nextIssueId: AiPmLoopIssueId | null,
): AiPmSharedMemory | null {
  if (turns.length === 0) return null;

  const items = turns.flatMap(extractMemoryItems);
  const deduped = items.filter(
    (item, index, all) =>
      all.findIndex((other) => other.label === item.label && other.value === item.value) === index,
  );

  const nextLabel = nextIssueId ? NEXT_STEP_LABEL[nextIssueId] : null;

  return {
    lead: '우리가 지금까지 정리한 내용입니다.',
    items: deduped,
    nextStep: nextLabel
      ? `다음은 ${koreanObjectParticle(nextLabel)} 보겠습니다.`
      : '다음 단계를 같이 정리하겠습니다.',
  };
}
