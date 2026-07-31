/** Field status for Business Understanding — no inference, only these three. */
export type UnderstandingFieldStatus = 'document' | 'unknown' | 'needs_confirmation';

export type UnderstandingField = {
  value: string | null;
  status: UnderstandingFieldStatus;
  /** Source line excerpt from the document */
  excerpt?: string | null;
  /** Estimated page reference (e.g. "2page") */
  pageRef?: string | null;
  /** One-line explanation of why AI understood it this way (internal — not shown in UI) */
  reasoning?: string | null;
  /** What AI still does not know or has not concluded */
  unknownNote?: string | null;
  /** Short phrases read from the document — shown as Read Before Speak (Rank 2) */
  confirmedExpressions?: string[] | null;
  /** User-facing: what the document alone could not confirm (Rank 1) */
  missingLine?: string | null;
  /** Suggested next action when AI deliberately withholds a conclusion */
  nextStep?: string | null;
};

/** Document mention — not a confirmed customer until founder validates. */
export type CustomerMention = {
  label: string;
  excerpt: string;
  /** Short quoted expression from the document (e.g. "MZ") */
  quote: string;
};

export type BusinessUnderstanding = {
  founder: UnderstandingField;
  business: UnderstandingField;
  valueProposition: UnderstandingField;
  customer: UnderstandingField;
  /** Segments named in the document — not auto-selected as Customer */
  customerMentions: CustomerMention[];
  revenue: UnderstandingField;
  partner: UnderstandingField;
  problem: UnderstandingField;
  solution: UnderstandingField;
};

/** Post-card confirmation path — understanding ≠ agreement to review immediately */
export type UnderstandingConfirmMode = 'accepted' | 'edit' | 'together';
