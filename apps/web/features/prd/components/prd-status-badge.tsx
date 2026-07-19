import type { PRDStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { PRD_STATUS_LABELS } from '../utils/default-sections';

const VARIANT: Record<PRDStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  GENERATING: 'secondary',
  COMPLETED: 'default',
};

export function PRDStatusBadge({ status }: { status: PRDStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="text-sm">
      {PRD_STATUS_LABELS[status]}
    </Badge>
  );
}
