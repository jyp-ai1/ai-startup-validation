import type { NextActionContext } from './v2-next-action-engine';
import { getNextAction } from './v2-next-action-engine';
import { isReviewStale } from './v2-review-dirty-state';
import { isEvidenceFieldFilled } from './v2-validation-store';
import type {
  AiPmActivityDetailId,
  AiPmAgendaId,
  AiPmApprovalBrief,
  AiPmDecisionSession,
  AiPmDecisionWorkspace,
  AiPmDiscoveryId,
} from './v2-ai-pm-decision-types';

function resolveAgenda(ctx: NextActionContext): AiPmAgendaId {
  const action = getNextAction(ctx);

  if (!ctx.hasIdea) return 'enterIdea';
  if (ctx.reviewCount === 0) return 'firstMeeting';
  if (isReviewStale(ctx.evidence, ctx.reviewCount)) return 'reinvestigate';
  if (!isEvidenceFieldFilled('pricing', ctx.evidence)) return 'pricingStrategy';
  if (!isEvidenceFieldFilled('customer', ctx.evidence) && ctx.investigationViewed) {
    return 'customerValidation';
  }
  if (action.kind === 're-review') return 'reinvestigate';
  return 'pricingStrategy';
}

function buildDiscoveries(ctx: NextActionContext, agendaId: AiPmAgendaId): AiPmDiscoveryId[] {
  if (ctx.reviewCount === 0) return [];

  switch (agendaId) {
    case 'pricingStrategy':
      return ['marketTrendChecked', 'competitorsRaisedPrice', 'newAiServiceFound', 'pricingGapFound'];
    case 'customerValidation':
      return ['marketTrendChecked', 'noCustomerInterviews', 'pricingGapFound'];
    case 'reinvestigate':
      return ['inputsChangedNotice', 'marketTrendChecked'];
    default:
      return ['marketTrendChecked'];
  }
}

function buildActivityDetails(ctx: NextActionContext): AiPmActivityDetailId[] {
  if (ctx.reviewCount === 0) return [];
  const base: AiPmActivityDetailId[] = [
    'googleTrends',
    'redditAnalysis',
    'productHunt',
    'competitorCompare',
  ];
  if (ctx.investigationViewed) {
    return [...base, 'searchVolume', 'ycCases', 'crunchbase'];
  }
  return base;
}

function buildWhyToday(agendaId: AiPmAgendaId): {
  leadKey: string;
  reasonKeys: string[];
  focusKey: string;
} {
  switch (agendaId) {
    case 'pricingStrategy':
      return {
        leadKey: 'pricingOnlyToday',
        reasonKeys: ['marketDone', 'competitorPricingReady', 'unlockInterviews'],
        focusKey: 'pricingStrategy',
      };
    case 'customerValidation':
      return {
        leadKey: 'customerOnlyToday',
        reasonKeys: ['pricingDecided', 'marketDone', 'unlockMvp'],
        focusKey: 'customerValidation',
      };
    case 'reinvestigate':
      return {
        leadKey: 'refreshOnlyToday',
        reasonKeys: ['inputsChanged', 'decisionBlocked'],
        focusKey: 'reinvestigate',
      };
    case 'firstMeeting':
      return {
        leadKey: 'firstMeetingToday',
        reasonKeys: ['needBaseline'],
        focusKey: 'firstMeeting',
      };
    default:
      return {
        leadKey: 'enterIdeaToday',
        reasonKeys: ['needIdea'],
        focusKey: 'enterIdea',
      };
  }
}

function buildRecommendation(agendaId: AiPmAgendaId): {
  valueKey: string;
  shortKey: string;
  sessionKey: string;
  detailKeys: string[];
  confidence: number;
} {
  switch (agendaId) {
    case 'pricingStrategy':
      return {
        valueKey: 'pricing29',
        shortKey: 'pricing29Short',
        sessionKey: 'startAt29',
        detailKeys: ['competitorBenchmark', 'founderGap'],
        confidence: 87,
      };
    case 'customerValidation':
      return {
        valueKey: 'interviewsFirst',
        shortKey: 'interviewsFirstShort',
        sessionKey: 'interviewsBeforeScale',
        detailKeys: ['noInterviews', 'viabilityGap'],
        confidence: 72,
      };
    case 'reinvestigate':
      return {
        valueKey: 'refreshInputs',
        shortKey: 'refreshInputsShort',
        sessionKey: 'refreshBeforeDecide',
        detailKeys: ['inputsChanged'],
        confidence: 65,
      };
    case 'firstMeeting':
      return {
        valueKey: 'startMeeting',
        shortKey: 'startMeetingShort',
        sessionKey: 'alignOnIdea',
        detailKeys: ['needBaseline'],
        confidence: 90,
      };
    default:
      return {
        valueKey: 'enterIdeaFirst',
        shortKey: 'enterIdeaShort',
        sessionKey: 'needIdea',
        detailKeys: ['needIdea'],
        confidence: 100,
      };
  }
}

function buildNextMeeting(agendaId: AiPmAgendaId): { key: string; afterKey: string } {
  switch (agendaId) {
    case 'pricingStrategy':
      return { key: 'customerInterviews', afterKey: 'afterCustomerInterviews' };
    case 'customerValidation':
      return { key: 'mvpDefinition', afterKey: 'afterMvpDefinition' };
    case 'firstMeeting':
      return { key: 'pricingStrategy', afterKey: 'afterPricingStrategy' };
    case 'reinvestigate':
      return { key: 'pricingStrategy', afterKey: 'afterReinvestigate' };
    default:
      return { key: 'firstMeeting', afterKey: 'afterFirstMeeting' };
  }
}

function buildClosedChanges(agendaId: AiPmAgendaId, choice?: string): string[] {
  switch (agendaId) {
    case 'pricingStrategy':
      return ['pricingConfirmed', 'recommendationApplied'];
    case 'customerValidation':
      return ['customerValidationStarted', 'recommendationApplied'];
    case 'firstMeeting':
      return ['firstMeetingHeld', 'agendaSet'];
    default:
      return ['sessionComplete'];
  }
}

function buildClosedLabel(agendaId: AiPmAgendaId): string {
  switch (agendaId) {
    case 'pricingStrategy':
      return 'pricingStrategy';
    case 'customerValidation':
      return 'customerValidation';
    case 'firstMeeting':
      return 'firstMeeting';
    default:
      return 'sessionComplete';
  }
}

function mapCta(action: ReturnType<typeof getNextAction>): {
  key: string;
  kind: typeof action.kind;
} {
  switch (action.kind) {
    case 'fill-idea':
      return { key: 'enterIdea', kind: action.kind };
    case 'start-review':
      return { key: 'startMeeting', kind: action.kind };
    case 're-review':
      return { key: 'reinvestigate', kind: action.kind };
    case 'fill-pricing':
      return { key: 'startDecision', kind: action.kind };
    case 'customer-validation':
      return { key: 'startDecision', kind: action.kind };
    default:
      return { key: 'startDecision', kind: action.kind };
  }
}

export function buildAiPmDecisionWorkspace(ctx: NextActionContext): AiPmDecisionWorkspace {
  const agendaId = resolveAgenda(ctx);
  const rec = buildRecommendation(agendaId);
  const cta = mapCta(getNextAction(ctx));
  const whyToday = buildWhyToday(agendaId);
  const nextMeeting = buildNextMeeting(agendaId);

  const brief: AiPmApprovalBrief = {
    agendaId,
    decisionCount: agendaId === 'enterIdea' || agendaId === 'firstMeeting' ? 0 : 1,
    recommendationValueKey: rec.valueKey,
    confidencePercent: rec.confidence,
    decisionEtaMinutes: agendaId === 'pricingStrategy' ? 3 : 5,
    primaryCtaKey: cta.key,
    primaryCtaKind: cta.kind,
    showApprovalQueue: agendaId !== 'enterIdea' && agendaId !== 'firstMeeting',
    whyTodayLeadKey: whyToday.leadKey,
    whyTodayReasonKeys: whyToday.reasonKeys,
    focusDecisionKey: whyToday.focusKey,
  };

  const session: AiPmDecisionSession | null =
    brief.showApprovalQueue || agendaId === 'firstMeeting'
      ? {
          agendaId,
          discoveries: buildDiscoveries(ctx, agendaId),
          activityDetails: buildActivityDetails(ctx),
          recommendationKey: rec.sessionKey,
          recommendationShortKey: rec.shortKey,
          recommendationDetailKeys: rec.detailKeys,
          nextMeetingKey: nextMeeting.key,
          nextMeetingAfterKey: nextMeeting.afterKey,
          closedDecisionLabelKey: buildClosedLabel(agendaId),
          closedChangeKeys: buildClosedChanges(agendaId),
        }
      : null;

  return { brief, session };
}

/** @deprecated use buildAiPmDecisionWorkspace */
export function buildAiPmWorkingExperience(ctx: NextActionContext) {
  return buildAiPmDecisionWorkspace(ctx);
}

export function getArtifactOfferKey(ctx: NextActionContext): string | null {
  const action = getNextAction(ctx);
  if (action.kind === 'customer-validation') return 'interviewOffer';
  if (ctx.investigationViewed && isEvidenceFieldFilled('pricing', ctx.evidence)) {
    return 'leanCanvasOffer';
  }
  return null;
}
