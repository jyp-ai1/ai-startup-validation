'use client';

import type { ValidationDecision } from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { useEnumLabel } from '@/lib/i18n/use-form-labels';

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
  const label = useEnumLabel('validationDecision', decision);
  return (
    <Badge variant={VARIANT[decision]} className="text-sm">
      {label}
    </Badge>
  );
}
