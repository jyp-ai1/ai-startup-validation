import { z } from '@repo/core/validation';
import {
  RESEARCH_PLAN_STATUSES,
  RESEARCH_PRIORITIES,
  RESEARCH_TYPES,
} from '@repo/types/validation';

export const createResearchPlanSchema = z.object({
  title: z.string().trim().min(1, 'Research 제목을 입력해주세요'),
  researchType: z.enum(RESEARCH_TYPES, {
    errorMap: () => ({ message: 'Research Type을 선택해주세요' }),
  }),
  description: z.string().trim().optional().nullable(),
  priority: z.enum(RESEARCH_PRIORITIES).optional(),
});

export const updateResearchPlanSchema = createResearchPlanSchema
  .partial()
  .extend({
    status: z.enum(RESEARCH_PLAN_STATUSES).optional(),
  });

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export const RESEARCH_TYPE_LABELS: Record<
  (typeof RESEARCH_TYPES)[number],
  string
> = {
  MARKET_SIZE: 'Market Size',
  CUSTOMER: 'Customer',
  TREND: 'Trend',
  COMPETITOR: 'Competitor',
  BUSINESS_MODEL: 'Business Model',
  TECHNOLOGY: 'Technology',
  REGULATION: 'Regulation',
};

export const RESEARCH_STATUS_LABELS: Record<
  (typeof RESEARCH_PLAN_STATUSES)[number],
  string
> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const RESEARCH_PRIORITY_LABELS: Record<
  (typeof RESEARCH_PRIORITIES)[number],
  string
> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};
