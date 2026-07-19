import type { AIReportGenerationStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';

const LABELS: Record<AIReportGenerationStatus, string> = {
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const VARIANT: Record<
  AIReportGenerationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PROCESSING: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
};

export function GenerationStatusBadge({
  status,
}: {
  status: AIReportGenerationStatus;
}) {
  return <Badge variant={VARIANT[status]}>{LABELS[status]}</Badge>;
}
