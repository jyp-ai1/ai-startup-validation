import type { ID, ISODateString } from './global';
import type { Evidence, EvidenceCategory, EvidenceConfidence } from './validation';

/** External data providers — Sprint 3.1 Evidence Engine. */
export const EVIDENCE_SOURCE_PROVIDERS = [
  'GOOGLE_TRENDS',
  'PRODUCT_HUNT',
  'CRUNCHBASE',
  'GITHUB',
  'NEWS',
  'REDDIT',
  'COMPETITOR',
  'YOUTUBE',
  'SEARCH_VOLUME',
] as const;

export type EvidenceSourceProvider = (typeof EVIDENCE_SOURCE_PROVIDERS)[number];

/** Raw signal from a provider — collected before LLM touches anything. */
export type RawEvidenceSignal = {
  provider: EvidenceSourceProvider;
  query: string;
  title: string;
  signal: string;
  metric?: string;
  sourceUrl?: string;
  category: EvidenceCategory;
  fetchedAt: ISODateString;
  rawPayload?: Record<string, unknown>;
};

/** LLM interpretation of stored evidence — never creates new evidence. */
export type EvidenceInterpretation = {
  id: ID;
  evidenceId: ID;
  meaning: string;
  whyItMatters: string;
  confidence: EvidenceConfidence;
  interpretedAt: ISODateString;
};

/** AI judgment must cite evidence — Rule #1 enforcement. */
export type JudgmentWithEvidence = {
  topic: string;
  rating: number;
  summary: string;
  evidenceIds: ID[];
  interpretationIds?: ID[];
};

export type EvidenceCollectQuery = {
  projectId: ID;
  idea: string;
  topics?: string[];
  locale?: string;
};

export type EvidenceCollectionResult = {
  projectId: ID;
  evidence: Evidence[];
  collectedAt: ISODateString;
  providers: EvidenceSourceProvider[];
};

export type EvidenceInterpretationResult = {
  interpretations: EvidenceInterpretation[];
  evidenceIds: ID[];
  interpretedAt: ISODateString;
};
