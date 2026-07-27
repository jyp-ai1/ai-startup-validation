import type { NextActionKind } from './v2-next-action-engine';
import { getNextAction, type NextActionContext } from './v2-next-action-engine';
import { isReviewStale } from './v2-review-dirty-state';
import { getLatestFounderMemo, getLatestMeetingNote } from './v2-ai-pm-meeting-store';

export type InboxItem = {
  id: string;
  textKey: string;
};

export type AiPmInboxReport = {
  mode: 'firstVisit' | 'resume' | 'report';
  headlineKey: string;
  newFindings: InboxItem[];
  risks: InboxItem[];
  todayTaskKey: string;
  ctaKind: NextActionKind;
  resumeMemo: string | null;
  resumeFocusKey: string | null;
  showReadBadge: boolean;
};

const MOCK_FINDINGS: InboxItem[] = [
  { id: 'n1', textKey: 'competitorsUp' },
  { id: 'n2', textKey: 'searchVolumeUp' },
  { id: 'n3', textKey: 'customerChanged' },
];

const MOCK_RISKS: InboxItem[] = [{ id: 'r1', textKey: 'pricingUnverified' }];

export function buildAiPmInbox(ctx: NextActionContext): AiPmInboxReport {
  const action = getNextAction(ctx);
  const founderMemo = getLatestFounderMemo();
  const latestNote = getLatestMeetingNote();
  const stale = isReviewStale(ctx.evidence, ctx.reviewCount);

  if (ctx.reviewCount === 0) {
    return {
      mode: ctx.hasIdea ? 'firstVisit' : 'firstVisit',
      headlineKey: ctx.hasIdea ? 'readyToReview' : 'enterIdea',
      newFindings: [],
      risks: [],
      todayTaskKey: ctx.hasIdea ? 'startReview' : 'enterIdea',
      ctaKind: action.kind,
      resumeMemo: null,
      resumeFocusKey: null,
      showReadBadge: false,
    };
  }

  if (founderMemo && latestNote && ctx.reviewCount > 0) {
    let resumeFocusKey = 'pricingContinue';
    if (founderMemo.includes('가격') || founderMemo.toLowerCase().includes('pric')) {
      resumeFocusKey = 'pricingContinue';
    }

    return {
      mode: 'resume',
      headlineKey: 'resumeGreeting',
      newFindings: [],
      risks: [],
      todayTaskKey: resumeFocusKey,
      ctaKind: action.kind,
      resumeMemo: founderMemo,
      resumeFocusKey,
      showReadBadge: false,
    };
  }

  const risks = [...MOCK_RISKS];
  if (stale) risks.unshift({ id: 'r-stale', textKey: 'reviewStale' });

  let todayTaskKey = 'pricingOnly';
  if (stale) todayTaskKey = 'reReviewFirst';
  else if (!ctx.investigationViewed) todayTaskKey = 'continueReview';
  else if (action.kind === 'fill-pricing') todayTaskKey = 'pricingOnly';

  return {
    mode: 'report',
    headlineKey: 'reviewComplete',
    newFindings: MOCK_FINDINGS,
    risks: risks.slice(0, 1),
    todayTaskKey,
    ctaKind: action.kind,
    resumeMemo: null,
    resumeFocusKey: null,
    showReadBadge: Boolean(latestNote && !latestNote.readAt),
  };
}

export function shouldShowArtifactTrigger(ctx: NextActionContext): boolean {
  return ctx.reviewCount >= 1 && ctx.investigationViewed && !isReviewStale(ctx.evidence, ctx.reviewCount);
}
