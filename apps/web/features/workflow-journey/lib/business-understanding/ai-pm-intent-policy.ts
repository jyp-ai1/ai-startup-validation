/**
 * DAY 8-B — CEO utterance intent router (not a question classifier).
 * RESEARCH stops the question engine; AI action is stubbed until Phase 4.
 */

import type { AnswerIntent } from './interpret-answer-semantics';
import { researchAcknowledgementMessage } from './ai-pm-research-ux-policy';

export type AiPmCeoIntent =
  | 'ANSWER'
  | 'CORRECT'
  | 'RESEARCH'
  | 'SUMMARIZE'
  | 'DECIDE'
  | 'ASK_AI';

export type AiPmIntentRoute = 'continue_loop' | 'ai_action' | 'meta_explain';

export type AiPmIntentClassification = {
  intent: AiPmCeoIntent;
  route: AiPmIntentRoute;
  rationale: string;
};

const RESEARCH_RE =
  /(찾아\s*줘|찾아주|조사\s*해|조사해\s*줘|검색\s*해|리서치|알아\s*봐|알아봐|알아보|시장\s*조사|시장조사|비슷한\s*서비스\s*조사|확인해\s*줘|확인해\s*주|안내해\s*줘|안내해\s*주|research|look\s+up|find\s+(competitor|alternative|market))/i;
const RESEARCH_UNKNOWN_RE = /(모르겠|모릅니다|모름|잘\s*모르)/i;
const RESEARCH_DOMAIN_RE =
  /(경쟁|대안|시장|비슷한\s*서비스|competitor|alternative|market)/i;
const DECIDE_RE =
  /(이대로\s*(go|고)|go\s*해도|진행\s*해|결정\s*해|확정\s*해|start\s+analysis|분석\s*시작)/i;

/**
 * Classify CEO input before question engine routing.
 * Maps legacy semantic intents where applicable.
 */
export function classifyAiPmCeoIntent(
  answer: string,
  semanticIntent?: AnswerIntent,
): AiPmIntentClassification {
  const trimmed = answer.trim();

  if (semanticIntent === 'why_meta') {
    return {
      intent: 'ASK_AI',
      route: 'meta_explain',
      rationale: 'CEO asked why this question is being asked.',
    };
  }

  if (semanticIntent === 'mid_judgment') {
    return {
      intent: 'SUMMARIZE',
      route: 'meta_explain',
      rationale: 'CEO requested a summary of current understanding.',
    };
  }

  if (semanticIntent === 'correction') {
    return {
      intent: 'CORRECT',
      route: 'continue_loop',
      rationale: 'CEO is correcting prior understanding.',
    };
  }

  if (isResearchDelegation(trimmed)) {
    return {
      intent: 'RESEARCH',
      route: 'ai_action',
      rationale: 'CEO delegated research — question engine should stop.',
    };
  }

  if (DECIDE_RE.test(trimmed)) {
    return {
      intent: 'DECIDE',
      route: 'continue_loop',
      rationale: 'CEO expressed a stage/decision intent.',
    };
  }

  return {
    intent: 'ANSWER',
    route: 'continue_loop',
    rationale: 'Standard factual answer to current question.',
  };
}

/** Research cue with embedded answer (e.g. "배민 찾아줘") → treat as ANSWER. */
function hasEmbeddedFactualAnswer(text: string): boolean {
  const withoutResearch = text
    .replace(RESEARCH_RE, '')
    .replace(RESEARCH_UNKNOWN_RE, '')
    .replace(/[?？!！]/g, '')
    .trim();
  return withoutResearch.length >= 4 && /[가-힣a-zA-Z0-9]/.test(withoutResearch);
}

/** F-4 — delegation phrasing including "모르겠어 확인해주세요" variants. */
function isResearchDelegation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/알아보고\s*안내/.test(trimmed)) return true;
  if (/확인해\s*주/.test(trimmed) && RESEARCH_DOMAIN_RE.test(trimmed)) return true;
  if (RESEARCH_RE.test(trimmed) && !hasEmbeddedFactualAnswer(trimmed)) return true;
  if (RESEARCH_UNKNOWN_RE.test(trimmed) && RESEARCH_DOMAIN_RE.test(trimmed)) return true;
  return false;
}

/** Stub copy when RESEARCH intent is detected — Phase D uses acknowledgement policy. */
export function researchIntentStubMessage(utterance?: string): string {
  return researchAcknowledgementMessage(utterance);
}
