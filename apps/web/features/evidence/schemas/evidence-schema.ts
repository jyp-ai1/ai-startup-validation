import { z } from '@repo/core/validation';
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_CONFIDENCE_LEVELS,
  EVIDENCE_SOURCE_TYPES,
} from '@repo/types/validation';

export const createEvidenceSchema = z.object({
  title: z.string().trim().min(1, 'Evidence 제목을 입력해주세요'),
  category: z.enum(EVIDENCE_CATEGORIES, {
    errorMap: () => ({ message: 'Category를 선택해주세요' }),
  }),
  summary: z.string().trim().min(1, 'Summary를 입력해주세요'),
  researchId: z.string().uuid().nullable().optional(),
  sourceType: z.enum(EVIDENCE_SOURCE_TYPES).nullable().optional(),
  sourceName: z.string().trim().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  content: z.string().trim().nullable().optional(),
  confidence: z.enum(EVIDENCE_CONFIDENCE_LEVELS).optional(),
  publishedDate: z.string().trim().nullable().optional(),
});

export const updateEvidenceSchema = createEvidenceSchema.partial();

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export const EVIDENCE_CATEGORY_LABELS: Record<
  (typeof EVIDENCE_CATEGORIES)[number],
  string
> = {
  MARKET: 'Market',
  CUSTOMER: 'Customer',
  COMPETITOR: 'Competitor',
  TREND: 'Trend',
  TECHNOLOGY: 'Technology',
  REGULATION: 'Regulation',
  BUSINESS: 'Business',
};

export const EVIDENCE_SOURCE_TYPE_LABELS: Record<
  (typeof EVIDENCE_SOURCE_TYPES)[number],
  string
> = {
  REPORT: 'Report',
  ARTICLE: 'Article',
  NEWS: 'News',
  PAPER: 'Paper',
  SURVEY: 'Survey',
  STATISTICS: 'Statistics',
  WEBSITE: 'Website',
  OTHER: 'Other',
};

export const EVIDENCE_CONFIDENCE_LABELS: Record<
  (typeof EVIDENCE_CONFIDENCE_LEVELS)[number],
  string
> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export type EvidenceFilterParams = {
  category?: string;
  sourceType?: string;
  confidence?: string;
};

export function parseEvidenceFilters(
  params: EvidenceFilterParams,
): {
  category?: (typeof EVIDENCE_CATEGORIES)[number];
  sourceType?: (typeof EVIDENCE_SOURCE_TYPES)[number];
  confidence?: (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];
} {
  const filter: {
    category?: (typeof EVIDENCE_CATEGORIES)[number];
    sourceType?: (typeof EVIDENCE_SOURCE_TYPES)[number];
    confidence?: (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];
  } = {};

  if (
    params.category &&
    EVIDENCE_CATEGORIES.includes(
      params.category as (typeof EVIDENCE_CATEGORIES)[number],
    )
  ) {
    filter.category = params.category as (typeof EVIDENCE_CATEGORIES)[number];
  }
  if (
    params.sourceType &&
    EVIDENCE_SOURCE_TYPES.includes(
      params.sourceType as (typeof EVIDENCE_SOURCE_TYPES)[number],
    )
  ) {
    filter.sourceType = params.sourceType as (typeof EVIDENCE_SOURCE_TYPES)[number];
  }
  if (
    params.confidence &&
    EVIDENCE_CONFIDENCE_LEVELS.includes(
      params.confidence as (typeof EVIDENCE_CONFIDENCE_LEVELS)[number],
    )
  ) {
    filter.confidence =
      params.confidence as (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];
  }

  return filter;
}
