import type { NextActionKind } from './v2-next-action-engine';

export type DecisionChoice = 'proceed' | 'hold' | 'reinvestigate';

export type SessionPhase = 'brief' | 'session' | 'closed';

export type AiPmAgendaId =
  | 'enterIdea'
  | 'firstMeeting'
  | 'pricingStrategy'
  | 'customerValidation'
  | 'reinvestigate';

export type AiPmDiscoveryId =
  | 'marketTrendChecked'
  | 'competitorsRaisedPrice'
  | 'newAiServiceFound'
  | 'pricingGapFound'
  | 'noCustomerInterviews'
  | 'inputsChangedNotice';

export type AiPmActivityDetailId =
  | 'googleTrends'
  | 'redditAnalysis'
  | 'productHunt'
  | 'competitorCompare'
  | 'searchVolume'
  | 'ycCases'
  | 'crunchbase';

export type AiPmApprovalBrief = {
  agendaId: AiPmAgendaId;
  decisionCount: number;
  recommendationValueKey: string;
  confidencePercent: number;
  decisionEtaMinutes: number;
  primaryCtaKey: string;
  primaryCtaKind: NextActionKind;
  showApprovalQueue: boolean;
  /** Morning Brief v2 — why this agenda today */
  whyTodayLeadKey: string;
  whyTodayReasonKeys: string[];
  focusDecisionKey: string;
};

export type AiPmDecisionSession = {
  agendaId: AiPmAgendaId;
  discoveries: AiPmDiscoveryId[];
  activityDetails: AiPmActivityDetailId[];
  recommendationKey: string;
  recommendationShortKey: string;
  recommendationDetailKeys: string[];
  nextMeetingKey: string;
  nextMeetingAfterKey: string;
  closedDecisionLabelKey: string;
  closedChangeKeys: string[];
};

export type AiPmDecisionWorkspace = {
  brief: AiPmApprovalBrief;
  session: AiPmDecisionSession | null;
};
