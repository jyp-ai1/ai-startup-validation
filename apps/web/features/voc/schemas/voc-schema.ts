import { z } from '@repo/core/validation';
import {
  VOC_CUSTOMER_SEGMENTS,
  VOC_EMOTIONS,
  VOC_FREQUENCIES,
  VOC_SEVERITIES,
  VOC_SOURCE_TYPES,
  VOC_WILLINGNESS_TO_PAY,
} from '@repo/types/validation';

export const createVOCSchema = z.object({
  title: z.string().trim().min(1, 'Title을 입력해주세요'),
  content: z.string().trim().min(1, 'Content를 입력해주세요'),
  painPoint: z.string().trim().min(1, 'Pain Point를 입력해주세요'),
  sourceType: z.enum(VOC_SOURCE_TYPES).nullable().optional(),
  customerSegment: z.enum(VOC_CUSTOMER_SEGMENTS).nullable().optional(),
  emotion: z.enum(VOC_EMOTIONS).nullable().optional(),
  frequency: z.enum(VOC_FREQUENCIES).nullable().optional(),
  severity: z.enum(VOC_SEVERITIES).nullable().optional(),
  willingnessToPay: z.enum(VOC_WILLINGNESS_TO_PAY).optional(),
});

export const updateVOCSchema = createVOCSchema.partial();

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export const VOC_SOURCE_TYPE_LABELS: Record<
  (typeof VOC_SOURCE_TYPES)[number],
  string
> = {
  INTERVIEW: 'Interview',
  SURVEY: 'Survey',
  COMMUNITY: 'Community',
  REVIEW: 'Review',
  ARTICLE: 'Article',
  SOCIAL: 'Social',
  OTHER: 'Other',
};

export const VOC_CUSTOMER_SEGMENT_LABELS: Record<
  (typeof VOC_CUSTOMER_SEGMENTS)[number],
  string
> = {
  B2C: 'B2C',
  B2B: 'B2B',
  B2G: 'B2G',
};

export const VOC_EMOTION_LABELS: Record<(typeof VOC_EMOTIONS)[number], string> =
  {
    NEGATIVE: 'Negative',
    NEUTRAL: 'Neutral',
    POSITIVE: 'Positive',
  };

export const VOC_FREQUENCY_LABELS: Record<
  (typeof VOC_FREQUENCIES)[number],
  string
> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const VOC_SEVERITY_LABELS: Record<(typeof VOC_SEVERITIES)[number], string> =
  {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical',
  };

export const VOC_WILLINGNESS_LABELS: Record<
  (typeof VOC_WILLINGNESS_TO_PAY)[number],
  string
> = {
  UNKNOWN: 'Unknown',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export type VOCFilterParams = {
  sourceType?: string;
  customerSegment?: string;
  severity?: string;
  frequency?: string;
};

export function parseVOCFilters(params: VOCFilterParams): {
  sourceType?: (typeof VOC_SOURCE_TYPES)[number];
  customerSegment?: (typeof VOC_CUSTOMER_SEGMENTS)[number];
  severity?: (typeof VOC_SEVERITIES)[number];
  frequency?: (typeof VOC_FREQUENCIES)[number];
} {
  const filter: {
    sourceType?: (typeof VOC_SOURCE_TYPES)[number];
    customerSegment?: (typeof VOC_CUSTOMER_SEGMENTS)[number];
    severity?: (typeof VOC_SEVERITIES)[number];
    frequency?: (typeof VOC_FREQUENCIES)[number];
  } = {};

  if (
    params.sourceType &&
    VOC_SOURCE_TYPES.includes(params.sourceType as (typeof VOC_SOURCE_TYPES)[number])
  ) {
    filter.sourceType = params.sourceType as (typeof VOC_SOURCE_TYPES)[number];
  }
  if (
    params.customerSegment &&
    VOC_CUSTOMER_SEGMENTS.includes(
      params.customerSegment as (typeof VOC_CUSTOMER_SEGMENTS)[number],
    )
  ) {
    filter.customerSegment =
      params.customerSegment as (typeof VOC_CUSTOMER_SEGMENTS)[number];
  }
  if (
    params.severity &&
    VOC_SEVERITIES.includes(params.severity as (typeof VOC_SEVERITIES)[number])
  ) {
    filter.severity = params.severity as (typeof VOC_SEVERITIES)[number];
  }
  if (
    params.frequency &&
    VOC_FREQUENCIES.includes(params.frequency as (typeof VOC_FREQUENCIES)[number])
  ) {
    filter.frequency = params.frequency as (typeof VOC_FREQUENCIES)[number];
  }

  return filter;
}
