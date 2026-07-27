/**
 * AI PM Personality — Sprint 4
 * LaunchLens never answers first. Evidence → Question → Decision.
 */

export const AI_PM_PERSONALITY_RULES = [
  'brief-first',
  'question-before-answer',
  'evidence-before-confidence',
  'founder-decides',
  'one-cta',
] as const;

export type AiPmPersonalityRule = (typeof AI_PM_PERSONALITY_RULES)[number];

export type AiPmDialogueRole = 'ai' | 'founder';

export type AiPmDialogueTurn = {
  id: string;
  role: AiPmDialogueRole;
  textKey: string;
  /** Linked evidence source for "why?" — optional */
  evidenceKey?: string;
  /** Consulting question id */
  questionKey?: string;
};

export type AiPmMeetingLead = {
  priorityKey: string;
  briefingKey: string;
  leadQuestionKey: string;
  evidenceGapKey?: string;
  artifactOfferKey?: string;
};

export type ConsultingQuestion = {
  id: string;
  textKey: string;
  followUpEvidenceKey?: string;
};

/** Canonical consulting questions — expand thinking, never dump answers. */
export const CONSULTING_QUESTIONS: ConsultingQuestion[] = [
  { id: 'why-think', textKey: 'whyThink', followUpEvidenceKey: 'googleTrends' },
  { id: 'assumption-impact', textKey: 'assumptionImpact' },
  { id: 'what-to-verify', textKey: 'whatToVerify', followUpEvidenceKey: 'competitors' },
  { id: 'pricing-change', textKey: 'pricingChange' },
];
