import { z } from 'zod';
import { REPORT_SECTION_TYPES } from '@repo/types/validation';

export const aiValidationReportSectionSchema = z.object({
  type: z.enum(REPORT_SECTION_TYPES),
  title: z.string().min(1),
  content: z.string(),
});

export const aiValidationReportOutputSchema = z.object({
  summary: z.string(),
  sections: z.array(aiValidationReportSectionSchema).min(1),
});

export type ParsedAIValidationReportOutput = z.infer<
  typeof aiValidationReportOutputSchema
>;

/** Extract JSON from raw LLM text (plain JSON or markdown code block). */
export function parseAIJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    throw new Error('Invalid JSON in AI response');
  }
}

export function validateAIReportOutput(raw: unknown): ParsedAIValidationReportOutput {
  return aiValidationReportOutputSchema.parse(raw);
}
