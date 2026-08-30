/**
 * S11 Presenter — maps Engine Thinking → Surface Contract.
 * Knowledge Engine stays read-only.
 * Must not downgrade Assumed → Unknown in Founder copy.
 */
import {
  presentThinkingSurface,
  type PresentThinkingSurfaceOptions,
} from './build-thinking-surface-presenter';
import type {
  ThinkingKnowledgeItem,
  ThinkingPresenterModel,
} from './build-thinking-presenter';
import type { ConversationFactKey } from './conversation-memory';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import {
  emptySurfacePresenter,
  type SurfaceAssumption,
  type SurfacePresenter,
} from './surface-presenter-contract';

const ASSUME_REASON =
  '문서에서 추론했지만 확인은 필요합니다.';

function lineConfirmed(item: ThinkingKnowledgeItem): string | null {
  if (item.confidence !== 'confirmed' || !item.value?.trim()) return null;
  return item.value.trim().replace(/\.$/, '');
}

function toAssumption(item: ThinkingKnowledgeItem): SurfaceAssumption | null {
  if (item.confidence !== 'assumed' || !item.value?.trim()) return null;
  return {
    value: item.value.trim().replace(/\.$/, ''),
    confidence: 'assumed',
    reason: ASSUME_REASON,
  };
}

/** Display-only soft cue from document (does not write Memory). */
function softCustomerFromDocument(documentText: string): string | null {
  const target = documentText.match(/대상\s*[:：]\s*([^\n.（(]+)/u);
  if (target?.[1]?.trim()) return target[1].trim().replace(/\s+/g, ' ').slice(0, 80);
  const trip = documentText.match(/국내\s*여행객[^\n]{0,24}/u);
  return trip?.[0]?.trim().replace(/\s+/g, ' ') ?? null;
}

function softAssumeForIssue(
  issueId: AiPmLoopIssueId | null,
  factKey: ConversationFactKey | null,
  knowledge: ThinkingKnowledgeItem[],
  documentText: string,
): SurfaceAssumption | null {
  if (!issueId || !factKey) return null;
  const item = knowledge.find((k) => k.key === factKey);
  if (item?.confidence === 'assumed' && item.value) {
    return toAssumption(item);
  }
  if (item?.confidence === 'confirmed') return null;
  // Preserve document signal when entities failed to mark Assumed
  if (factKey === 'customer') {
    const soft = softCustomerFromDocument(documentText);
    if (soft) {
      return { value: soft, confidence: 'assumed', reason: ASSUME_REASON };
    }
  }
  return null;
}

function founderDecisionForAssumed(params: {
  issueId: AiPmLoopIssueId;
  assumedValue: string;
}): { summary: string; blockingReason: string; actionReason: string } {
  const v = params.assumedValue;
  switch (params.issueId) {
    case 'customer_definition':
      return {
        summary: `문서에서는 ${v}(으)로 보입니다.`,
        blockingReason:
          '다만 실제 돈을 내는 고객인지 아직 확인되지 않았습니다.',
        actionReason: `문서에 「${v}」이(가) 있지만 Primary Customer로 확정하려면 확인이 필요합니다.`,
      };
    case 'bm_design':
      return {
        summary: `문서에서는 수익 관련 단서가 「${v}」로 보입니다.`,
        blockingReason: '다만 결제·수익 구조로 확정되지 않았습니다.',
        actionReason: `문서 단서「${v}」만으로는 수익 구조를 잠글 수 없습니다.`,
      };
    case 'problem_definition':
      return {
        summary: `문서에서는 문제로 「${v}」이(가) 보입니다.`,
        blockingReason: '다만 핵심 Pain으로 아직 확정되지 않았습니다.',
        actionReason: `「${v}」이(가) 추정일 뿐이므로 확인이 필요합니다.`,
      };
    default:
      return {
        summary: `문서에서는 「${v}」로 보입니다.`,
        blockingReason: '다만 아직 확정되지 않아 다음 판단이 막혀 있습니다.',
        actionReason: `「${v}」은(는) 추정입니다. 확인하면 다음 단계로 갈 수 있습니다.`,
      };
  }
}

/**
 * Build Founder Surface from Thinking model (confidence preserved).
 */
export function presentS11Surface(
  thinking: ThinkingPresenterModel,
  options: PresentThinkingSurfaceOptions & { documentText?: string },
): SurfacePresenter {
  const surface = presentThinkingSurface(thinking, options);
  const out = emptySurfacePresenter();
  const doc = options.documentText ?? '';

  out.understanding.confirmed = thinking.knowledge
    .map(lineConfirmed)
    .filter((line): line is string => Boolean(line));

  const assumptions = thinking.knowledge
    .map(toAssumption)
    .filter((a): a is SurfaceAssumption => Boolean(a));

  const softAsk = softAssumeForIssue(
    thinking.question.issueId,
    thinking.question.factKey,
    thinking.knowledge,
    doc,
  );
  if (
    softAsk &&
    !assumptions.some((a) => a.value === softAsk.value)
  ) {
    assumptions.push(softAsk);
  }
  out.understanding.assumptions = assumptions;

  const gapQuestion = options.gapQuestionText?.trim() ?? '';

  if (options.mode === 'update') {
    out.decision.summary =
      surface.updateConfirm || surface.updateLead || '조건이 하나 충족되었습니다.';
    out.question = {
      text: gapQuestion || surface.nextQuestion,
      purpose: '',
    };
    out.action.current = surface.nextFocusLead || '다음 확인으로 이어갑니다.';
    out.action.reason = surface.conditionMetLabel
      ? `${surface.conditionMetLabel}이 확인되어 다음 확인으로 이어갑니다.`
      : '방금 답으로 조건이 채워져 다음 단계로 이동합니다.';
    if (surface.conditionMetLabel) {
      out.understanding.confirmed = [
        ...out.understanding.confirmed,
        surface.conditionMetLabel,
      ];
    }
    return out;
  }

  const issueId = thinking.question.issueId;
  const askAssumed =
    softAsk ??
    (thinking.question.factKey
      ? assumptions.find((a) => {
          const item = thinking.knowledge.find((k) => k.key === thinking.question.factKey);
          return item?.value?.trim() === a.value;
        })
      : undefined);

  if (issueId && askAssumed) {
    const copy = founderDecisionForAssumed({
      issueId,
      assumedValue: askAssumed.value,
    });
    out.decision.summary = copy.summary;
    out.decision.blockingReason = copy.blockingReason;
    out.question.text = gapQuestion || surface.nextQuestion;
    out.question.purpose =
      surface.unlockLead && surface.unlockResult
        ? `${surface.unlockLead} ${surface.unlockResult}`
        : surface.unlockResult || '';
    out.action.current = '이 질문에 답해 주세요.';
    out.action.next = surface.unlockResult
      ? `${surface.unlockResult.replace(/\.$/, '')}.`
      : undefined;
    out.action.reason = copy.actionReason;
    return out;
  }

  // True Unknown — no document assumption to preserve
  out.decision.summary = surface.blockedReason
    ? surface.blockedReason
    : surface.documentLead || '아직 확인이 더 필요합니다.';
  if (surface.blockedReason) {
    out.decision.blockingReason = surface.blockedReason;
  }

  out.question.text = gapQuestion || surface.nextQuestion;
  out.question.purpose =
    surface.unlockLead && surface.unlockResult
      ? `${surface.unlockLead} ${surface.unlockResult}`
      : surface.unlockResult || '';

  if (out.question.text) {
    out.action.current = '이 질문에 답해 주세요.';
    out.action.next = surface.unlockResult
      ? `${surface.unlockResult.replace(/\.$/, '')}.`
      : undefined;
    out.action.reason = surface.blockedReason
      ? `${surface.blockedReason.replace(/\.$/, '')} — 그래서 지금 이 답을 확보해야 합니다.`
      : out.question.purpose || '확인이 있어야 다음 판단이 가능합니다.';
  } else {
    out.action.current = surface.unlockResult || '확인된 내용으로 다음 단계를 진행합니다.';
    out.action.reason =
      '필요한 확인이 끝나 다음 단계(분석·액션)로 넘어갈 수 있습니다.';
  }

  return out;
}
