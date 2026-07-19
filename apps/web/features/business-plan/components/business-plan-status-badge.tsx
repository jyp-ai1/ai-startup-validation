import type { BusinessPlanStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { BUSINESS_PLAN_STATUS_LABELS } from '../utils/default-sections';

const VARIANT: Record<
  BusinessPlanStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'outline',
  GENERATING: 'secondary',
  COMPLETED: 'default',
};

export function BusinessPlanStatusBadge({ status }: { status: BusinessPlanStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="text-sm">
      {BUSINESS_PLAN_STATUS_LABELS[status]}
    </Badge>
  );
}
