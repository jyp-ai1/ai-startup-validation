import { z } from 'zod';

export const validationAgentSourceSchema = z.object({
  title: z.string().min(1),
  source: z.string().min(1),
  excerpt: z.string(),
  score: z.number().optional(),
});

export const validationAgentOutputSchema = z.object({
  recommendation: z.string().min(1),
  summary: z.string().min(1),
  decision: z.enum(['GO', 'CONDITIONAL GO', 'NO GO', 'INSUFFICIENT DATA']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sources: z.array(validationAgentSourceSchema),
  nextActions: z.array(z.string()),
});

export type ParsedValidationAgentOutput = z.infer<typeof validationAgentOutputSchema>;

export { parseAIJsonResponse } from './schemas';

export function validateValidationAgentOutput(raw: unknown): ParsedValidationAgentOutput {
  return validationAgentOutputSchema.parse(raw);
}
