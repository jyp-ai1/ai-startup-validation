import type { ReportStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { REPORT_STATUS_LABELS } from '../utils/default-sections';

const VARIANT: Record<
  ReportStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'outline',
  IN_PROGRESS: 'secondary',
  COMPLETED: 'default',
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="text-sm">
      {REPORT_STATUS_LABELS[status]}
    </Badge>
  );
}
