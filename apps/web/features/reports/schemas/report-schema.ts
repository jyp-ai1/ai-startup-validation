import { z } from '@repo/core/validation';
import { REPORT_SECTION_TYPES, REPORT_STATUSES } from '@repo/types/validation';

export const createReportSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
});

export const updateReportSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  summary: z.string().trim().nullable().optional(),
});

export const updateReportSectionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string(),
});

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()).min(1),
});

export const createReportSectionSchema = z.object({
  sectionType: z.enum(REPORT_SECTION_TYPES),
  title: z.string().trim().min(1).max(200),
  content: z.string().optional(),
  order: z.number().int().min(1),
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
