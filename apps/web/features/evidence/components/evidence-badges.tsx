'use client';

import { useTranslations } from 'next-intl';

import type {
  EvidenceCategory,
  EvidenceConfidence,
  EvidenceSourceType,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import { useEnumLabel } from '@/lib/i18n/use-form-labels';

type EvidenceCategoryBadgeProps = {
  category: EvidenceCategory;
};

export function EvidenceCategoryBadge({ category }: EvidenceCategoryBadgeProps) {
  const label = useEnumLabel('evidenceCategory', category);
  return <Badge variant="outline">{label}</Badge>;
}

type EvidenceConfidenceBadgeProps = {
  confidence: EvidenceConfidence;
};

const CONFIDENCE_VARIANT: Record<
  EvidenceConfidence,
  'default' | 'secondary' | 'destructive'
> = {
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'destructive',
};

export function EvidenceConfidenceBadge({
  confidence,
}: EvidenceConfidenceBadgeProps) {
  const label = useEnumLabel('evidenceConfidence', confidence);
  return <Badge variant={CONFIDENCE_VARIANT[confidence]}>{label}</Badge>;
}

type EvidenceSourceBadgeProps = {
  sourceType: EvidenceSourceType | null;
  sourceName?: string | null;
};

export function EvidenceSourceBadge({
  sourceType,
  sourceName,
}: EvidenceSourceBadgeProps) {
  const t = useTranslations('common');
  const typeT = useTranslations('enums.evidenceSourceType');

  if (!sourceType && !sourceName) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const label = sourceType ? typeT(sourceType) : t('notProvided');

  return (
    <span className="text-sm">
      {sourceName ? `${sourceName} (${label})` : label}
    </span>
  );
}
