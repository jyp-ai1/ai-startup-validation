import { z } from '@repo/core/validation';

export const createDevelopmentSpecSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  prdId: z.string().trim().min(1, 'PRD is required'),
});

export const updateDevelopmentSpecSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED']).optional(),
  summary: z.string().trim().nullable().optional(),
});

export const updateDevelopmentSpecSectionSchema = z.object({
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
