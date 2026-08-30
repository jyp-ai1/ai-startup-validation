/**
 * S9 Surface Presenter — one PM-like journey (ADR-055)
 *
 * AI read → understood → why stuck → question → answer → condition met → next
 * Missing Category → fixed Question Template (never LLM-authored).
 */
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import type {
  ThinkingKnowledgeItem,
  ThinkingPresenterModel,
} from './build-thinking-presenter';

export type ThinkingSurfaceMode = 'document' | 'ask' | 'update';

export type ThinkingSurfaceModel = {
  mode: ThinkingSurfaceMode;
  documentLead: string;
  understood: string[];
  openGap: string | null;
  /**
   * Why analysis cannot start yet (CEO-facing)
   * e.g. "수익 구조가 확인되지 않았습니다."
   */
  blockedReason: string;
  /** "이것만 확인되면 시장성 분석을 시작할 수 있습니다." */
  unlockLead: string;
  unlockResult: string;
  askLead: string;
  nextQuestion: string;
  updateLead: string;
  /** "시장성 분석을 위한 조건이 하나 충족되었습니다." */
  updateConfirm: string;
  /** "✓ 수익 구조" short label after answer */
  conditionMetLabel: string;
  nextFocusLead: string;
};

const QUESTION_BY_CATEGORY: Record<AiPmLoopIssueId, string> = {
  customer_definition: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
  problem_definition: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
  bm_design: '서비스 비용은 누가 지불하나요?',
  market_validation: '이 시장에 수요가 있다는 근거는 무엇인가요?',
  competitor_analysis: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
};

const OPEN_GAP: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객',
  problem_definition: '문제',
  bm_design: '수익 구조',
  market_validation: '시장 근거',
  competitor_analysis: '경쟁',
};

const BLOCKED_REASON: Record<AiPmLoopIssueId, string> = {
  customer_definition: '주요 고객이 확인되지 않았습니다.',
  problem_definition: '풀려는 문제가 확인되지 않았습니다.',
  bm_design: '수익 구조가 확인되지 않았습니다.',
  market_validation: '시장 근거가 확인되지 않았습니다.',
  competitor_analysis: '경쟁이 확인되지 않았습니다.',
};

const UNLOCK_RESULT: Record<AiPmLoopIssueId, string> = {
  customer_definition: '누구를 위한 사업인지 분석을 시작할 수 있습니다.',
  problem_definition: '문제 분석을 시작할 수 있습니다.',
  bm_design: '시장성 분석을 시작할 수 있습니다.',
  market_validation: '기회 규모 분석을 시작할 수 있습니다.',
  competitor_analysis: '경쟁 구도 분석을 시작할 수 있습니다.',
};

const UPDATE_CONFIRM: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객 분석을 위한 조건이 하나 충족되었습니다.',
  problem_definition: '문제 분석을 위한 조건이 하나 충족되었습니다.',
  bm_design: '시장성 분석을 위한 조건이 하나 충족되었습니다.',
  market_validation: '시장 분석을 위한 조건이 하나 충족되었습니다.',
  competitor_analysis: '경쟁 분석을 위한 조건이 하나 충족되었습니다.',
};

const CONDITION_LABEL: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객',
  problem_definition: '문제',
  bm_design: '수익 구조',
  market_validation: '시장 근거',
  competitor_analysis: '경쟁',
};

const NEXT_FOCUS_BY_NEXT: Record<AiPmLoopIssueId, string> = {
  customer_definition: '다음은 고객을 확인하겠습니다.',
  problem_definition: '다음은 문제를 확인하겠습니다.',
  bm_design: '다음은 수익 구조를 확인하겠습니다.',
  competitor_analysis: '다음은 경쟁을 확인하겠습니다.',
  market_validation: '다음은 시장 근거를 확인하겠습니다.',
};

function emptySurface(mode: ThinkingSurfaceMode): ThinkingSurfaceModel {
  return {
    mode,
    documentLead: '',
    understood: [],
    openGap: null,
    blockedReason: '',
    unlockLead: '',
    unlockResult: '',
    askLead: '',
    nextQuestion: '',
    updateLead: '',
    updateConfirm: '',
    conditionMetLabel: '',
    nextFocusLead: '',
  };
}

function lineUnderstood(item: ThinkingKnowledgeItem): string | null {
  if (item.confidence !== 'confirmed' || !item.value?.trim()) return null;
  const value = item.value.trim().replace(/\.$/, '');
  switch (item.key) {
    case 'business':
      return value;
    case 'customer':
      return /고객|대상|타깃|타겟/u.test(value) ? value : `${value} 대상`;
    case 'problem':
      return value;
    case 'revenue':
    case 'buyer':
      return value;
    case 'market':
      return value;
    case 'competitor':
      return value;
    default:
      return value;
  }
}

export type PresentThinkingSurfaceOptions = {
  mode: ThinkingSurfaceMode;
  answeredIssueId?: AiPmLoopIssueId | null;
  nextIssueId?: AiPmLoopIssueId | null;
  /** First ask after document — show "문서를 확인했습니다." */
  showDocumentLead?: boolean;
  /** P0-4 — gap-aligned question overrides issue template */
  targetGap?: string | null;
  gapQuestionText?: string | null;
};

export function presentThinkingSurface(
  thinking: ThinkingPresenterModel,
  options: PresentThinkingSurfaceOptions,
): ThinkingSurfaceModel {
  const understood = thinking.knowledge
    .map(lineUnderstood)
    .filter((line): line is string => Boolean(line));

  const issueId = thinking.question.issueId;
  const base = emptySurface(options.mode);
  base.understood = understood;

  if (options.mode === 'document') {
    base.documentLead = '문서를 확인했습니다.';
    base.openGap = issueId ? OPEN_GAP[issueId] : null;
    base.blockedReason = issueId ? BLOCKED_REASON[issueId] : '';
    base.unlockLead = issueId ? '이것만 확인되면' : '';
    base.unlockResult = issueId ? UNLOCK_RESULT[issueId] : '';
    return base;
  }

  if (options.mode === 'ask') {
    const gapQuestion = options.gapQuestionText?.trim() ?? '';
    if (!issueId) {
      // Adaptive gap ask — Memory may mark fact Confirmed while engine still has a next question.
      if (gapQuestion) {
        base.nextQuestion = gapQuestion;
        base.askLead = '그래서 먼저 이것만 알려주세요.';
      }
      return base;
    }
    if (options.showDocumentLead) {
      base.documentLead = '문서를 확인했습니다.';
    }
    base.blockedReason = BLOCKED_REASON[issueId];
    base.unlockLead = '이것만 확인되면';
    base.unlockResult = UNLOCK_RESULT[issueId];
    base.askLead = '그래서 먼저 이것만 알려주세요.';
    base.nextQuestion = gapQuestion || QUESTION_BY_CATEGORY[issueId];
    return base;
  }

  const answered = options.answeredIssueId;
  if (answered) {
    base.updateLead = '좋습니다.';
    base.updateConfirm = UPDATE_CONFIRM[answered];
    base.conditionMetLabel = CONDITION_LABEL[answered];
    const next = options.nextIssueId;
    base.nextFocusLead = next
      ? NEXT_FOCUS_BY_NEXT[next]
      : '이제 확인된 내용으로 다음 단계를 정리할 수 있습니다.';
    const gapQuestion = options.gapQuestionText?.trim() ?? '';
    if (gapQuestion) {
      base.nextQuestion = gapQuestion;
    } else if (next) {
      base.nextQuestion = QUESTION_BY_CATEGORY[next];
    }
  }
  return base;
}
