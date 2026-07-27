import type { NextActionContext } from './v2-next-action-engine';
import { isReviewStale } from './v2-review-dirty-state';
import { getLatestFounderMemo } from './v2-ai-pm-meeting-store';
import type { AiPmDialogueTurn, AiPmMeetingLead } from './v2-ai-pm-personality';
import { isEvidenceFieldFilled } from './v2-validation-store';

export function buildMeetingLead(ctx: NextActionContext): AiPmMeetingLead | null {
  if (ctx.reviewCount === 0) {
    return {
      priorityKey: 'enterIdea',
      briefingKey: 'firstBriefing',
      leadQuestionKey: 'firstQuestion',
    };
  }

  const founderMemo = getLatestFounderMemo();
  if (founderMemo) {
    return {
      priorityKey: 'pricingOverMarket',
      briefingKey: 'resumeBriefing',
      leadQuestionKey: 'newCompetitorLead',
      evidenceGapKey: undefined,
    };
  }

  const stale = isReviewStale(ctx.evidence, ctx.reviewCount);
  if (stale) {
    return {
      priorityKey: 'reReview',
      briefingKey: 'staleBriefing',
      leadQuestionKey: 'staleLead',
    };
  }

  const pricingMissing = !isEvidenceFieldFilled('pricing', ctx.evidence);

  if (pricingMissing) {
    return {
      priorityKey: 'pricingOverMarket',
      briefingKey: 'pricingPriorityBriefing',
      leadQuestionKey: 'pricingLead',
      evidenceGapKey: 'pricingEvidenceGap',
      artifactOfferKey: undefined,
    };
  }

  if (ctx.investigationViewed) {
    return {
      priorityKey: 'marketDone',
      briefingKey: 'marketDoneBriefing',
      leadQuestionKey: 'newCompetitorLead',
      artifactOfferKey: 'leanCanvasOffer',
    };
  }

  return {
    priorityKey: 'continueReview',
    briefingKey: 'continueBriefing',
    leadQuestionKey: 'continueLead',
  };
}

/** Inbox dialogue — AI leads the meeting, not only reports. */
export function buildInboxDialogue(ctx: NextActionContext): AiPmDialogueTurn[] {
  const lead = buildMeetingLead(ctx);
  if (!lead) return [];

  const turns: AiPmDialogueTurn[] = [
    { id: 'brief', role: 'ai', textKey: lead.briefingKey },
    { id: 'priority', role: 'ai', textKey: `priority.${lead.priorityKey}` },
  ];

  if (lead.evidenceGapKey) {
    turns.push({
      id: 'gap',
      role: 'ai',
      textKey: lead.evidenceGapKey,
      evidenceKey: 'competitors',
    });
  }

  turns.push({
    id: 'lead',
    role: 'ai',
    textKey: lead.leadQuestionKey,
    questionKey: lead.leadQuestionKey,
  });

  return turns;
}

export function getActiveConsultingQuestion(ctx: NextActionContext): string {
  const lead = buildMeetingLead(ctx);
  return lead?.leadQuestionKey ?? 'continueLead';
}

export function getArtifactOfferKey(ctx: NextActionContext): string | null {
  const lead = buildMeetingLead(ctx);
  return lead?.artifactOfferKey ?? null;
}
