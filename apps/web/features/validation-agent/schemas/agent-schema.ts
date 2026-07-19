import { z } from '@repo/core/validation';

export const askValidationAgentSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(2000),
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
