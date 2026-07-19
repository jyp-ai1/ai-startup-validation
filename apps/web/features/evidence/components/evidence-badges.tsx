import type {
  EvidenceCategory,
  EvidenceConfidence,
  EvidenceSourceType,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
} from '../schemas/evidence-schema';

type EvidenceCategoryBadgeProps = {
  category: EvidenceCategory;
};

export function EvidenceCategoryBadge({ category }: EvidenceCategoryBadgeProps) {
  return <Badge variant="outline">{EVIDENCE_CATEGORY_LABELS[category]}</Badge>;
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
  return (
    <Badge variant={CONFIDENCE_VARIANT[confidence]}>
      {EVIDENCE_CONFIDENCE_LABELS[confidence]}
    </Badge>
  );
}

type EvidenceSourceBadgeProps = {
  sourceType: EvidenceSourceType | null;
  sourceName?: string | null;
};

export function EvidenceSourceBadge({
  sourceType,
  sourceName,
}: EvidenceSourceBadgeProps) {
  if (!sourceType && !sourceName) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const label = sourceType
    ? EVIDENCE_SOURCE_TYPE_LABELS[sourceType]
    : 'Unknown';

  return (
    <span className="text-sm">
      {sourceName ? `${sourceName} (${label})` : label}
    </span>
  );
}
