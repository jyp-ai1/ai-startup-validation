import { z } from '@repo/core/validation';

export const createBusinessPlanSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
});

export const updateBusinessPlanSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED']).optional(),
  summary: z.string().trim().nullable().optional(),
});

export const updateBusinessPlanSectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string(),
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
