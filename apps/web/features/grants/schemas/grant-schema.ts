import { z } from '@repo/core/validation';
import {
  GRANT_CATEGORIES,
  GRANT_STATUSES,
  GRANT_SUPPORT_TYPES,
  GRANT_TARGET_STAGES,
} from '@repo/types/validation';

export const createGrantSchema = z.object({
  name: z.string().trim().min(1, '사업명을 입력해주세요'),
  organization: z.string().trim().min(1, '기관명을 입력해주세요'),
  description: z.string().trim().nullable().optional(),
  category: z.enum(GRANT_CATEGORIES).nullable().optional(),
  targetStage: z.enum(GRANT_TARGET_STAGES).nullable().optional(),
  supportType: z.enum(GRANT_SUPPORT_TYPES).nullable().optional(),
  amount: z.string().trim().nullable().optional(),
  deadline: z.string().trim().nullable().optional(),
  eligibility: z.string().trim().nullable().optional(),
  applicationUrl: z.string().url().nullable().optional(),
  fitScore: z.coerce
    .number()
    .min(0, '0~100 사이 값을 입력해주세요')
    .max(100, '0~100 사이 값을 입력해주세요')
    .nullable()
    .optional(),
  status: z.enum(GRANT_STATUSES).optional(),
});

export const updateGrantSchema = createGrantSchema.partial();

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export const GRANT_CATEGORY_LABELS: Record<
  (typeof GRANT_CATEGORIES)[number],
  string
> = {
  STARTUP: 'Startup',
  TECHNOLOGY: 'Technology',
  AI: 'AI',
  SOCIAL: 'Social',
  LOCAL: 'Local',
  SME: 'SME',
  CONTENT: 'Content',
  OTHER: 'Other',
};

export const GRANT_TARGET_STAGE_LABELS: Record<
  (typeof GRANT_TARGET_STAGES)[number],
  string
> = {
  IDEA: 'Idea',
  PRE_MVP: 'Pre-MVP',
  MVP: 'MVP',
  GROWTH: 'Growth',
  SCALE: 'Scale',
};

export const GRANT_SUPPORT_TYPE_LABELS: Record<
  (typeof GRANT_SUPPORT_TYPES)[number],
  string
> = {
  FUNDING: 'Funding',
  CONSULTING: 'Consulting',
  EDUCATION: 'Education',
  SPACE: 'Space',
  MARKETING: 'Marketing',
  RND: 'R&D',
};

export const GRANT_STATUS_LABELS: Record<(typeof GRANT_STATUSES)[number], string> =
  {
    OPEN: 'Open',
    CLOSED: 'Closed',
    PREPARING: 'Preparing',
  };

export type GrantFilterParams = {
  category?: string;
  targetStage?: string;
  supportType?: string;
  status?: string;
};

export function parseGrantFilters(params: GrantFilterParams): {
  category?: (typeof GRANT_CATEGORIES)[number];
  targetStage?: (typeof GRANT_TARGET_STAGES)[number];
  supportType?: (typeof GRANT_SUPPORT_TYPES)[number];
  status?: (typeof GRANT_STATUSES)[number];
} {
  const filter: {
    category?: (typeof GRANT_CATEGORIES)[number];
    targetStage?: (typeof GRANT_TARGET_STAGES)[number];
    supportType?: (typeof GRANT_SUPPORT_TYPES)[number];
    status?: (typeof GRANT_STATUSES)[number];
  } = {};

  if (
    params.category &&
    GRANT_CATEGORIES.includes(params.category as (typeof GRANT_CATEGORIES)[number])
  ) {
    filter.category = params.category as (typeof GRANT_CATEGORIES)[number];
  }
  if (
    params.targetStage &&
    GRANT_TARGET_STAGES.includes(
      params.targetStage as (typeof GRANT_TARGET_STAGES)[number],
    )
  ) {
    filter.targetStage = params.targetStage as (typeof GRANT_TARGET_STAGES)[number];
  }
  if (
    params.supportType &&
    GRANT_SUPPORT_TYPES.includes(
      params.supportType as (typeof GRANT_SUPPORT_TYPES)[number],
    )
  ) {
    filter.supportType = params.supportType as (typeof GRANT_SUPPORT_TYPES)[number];
  }
  if (
    params.status &&
    GRANT_STATUSES.includes(params.status as (typeof GRANT_STATUSES)[number])
  ) {
    filter.status = params.status as (typeof GRANT_STATUSES)[number];
  }

  return filter;
}
