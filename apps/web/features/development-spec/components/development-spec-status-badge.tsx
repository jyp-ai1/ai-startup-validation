import type { DevelopmentSpecStatus } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { DEVELOPMENT_SPEC_STATUS_LABELS } from '../utils/default-sections';

const VARIANT: Record<
  DevelopmentSpecStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'outline',
  GENERATING: 'secondary',
  COMPLETED: 'default',
};

export function DevelopmentSpecStatusBadge({ status }: { status: DevelopmentSpecStatus }) {
  return (
    <Badge variant={VARIANT[status]} className="text-sm">
      {DEVELOPMENT_SPEC_STATUS_LABELS[status]}
    </Badge>
  );
}
