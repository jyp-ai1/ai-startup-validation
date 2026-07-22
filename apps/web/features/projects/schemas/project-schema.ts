import { z } from '@repo/core/validation';
import { STARTUP_PROJECT_STATUSES } from '@repo/types/validation';

export const createStartupProjectSchema = z.object({
  title: z.string().trim().min(1, 'projects.validation.titleRequired'),
  summary: z.string().trim().min(1, 'projects.validation.summaryRequired'),
  problem: z.string().trim().optional().nullable(),
  solution: z.string().trim().optional().nullable(),
  targetCustomer: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  businessModel: z.string().trim().optional().nullable(),
});

export const updateStartupProjectSchema = createStartupProjectSchema
  .partial()
  .extend({
    status: z.enum(STARTUP_PROJECT_STATUSES).optional(),
  });

export type CreateStartupProjectFormValues = z.infer<
  typeof createStartupProjectSchema
>;

export type UpdateStartupProjectFormValues = z.infer<
  typeof updateStartupProjectSchema
>;

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}
