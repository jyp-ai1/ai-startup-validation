import { z } from '@repo/core/validation';

export const createValidationScoreSchema = z.object({
  marketScore: z.coerce.number().int().min(0).max(20),
  problemScore: z.coerce.number().int().min(0).max(20),
  competitionScore: z.coerce.number().int().min(0).max(15),
  businessModelScore: z.coerce.number().int().min(0).max(15),
  executionScore: z.coerce.number().int().min(0).max(15),
  founderFitScore: z.coerce.number().int().min(0).max(15),
  comment: z.string().trim().nullable().optional(),
});

export const updateValidationScoreSchema = createValidationScoreSchema.partial();

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}
