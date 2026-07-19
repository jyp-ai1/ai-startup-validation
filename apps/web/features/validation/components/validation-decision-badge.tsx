import type { ValidationDecision } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { VALIDATION_DECISION_LABELS } from '../utils/score-calculator';

const VARIANT: Record<
  ValidationDecision,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  GO: 'default',
  CONDITIONAL_GO: 'secondary',
  NO_GO: 'destructive',
  DRAFT: 'outline',
};

export function ValidationDecisionBadge({
  decision,
}: {
  decision: ValidationDecision;
}) {
  return (
    <Badge variant={VARIANT[decision]} className="text-sm">
      {VALIDATION_DECISION_LABELS[decision]}
    </Badge>
  );
}
