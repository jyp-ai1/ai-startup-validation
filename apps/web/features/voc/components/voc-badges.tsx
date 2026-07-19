import type {
  VOCCustomerSegment,
  VOCEmotion,
  VOCFrequency,
  VOCSeverity,
  VOCSourceType,
  VOCWillingnessToPay,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

import {
  VOC_CUSTOMER_SEGMENT_LABELS,
  VOC_EMOTION_LABELS,
  VOC_FREQUENCY_LABELS,
  VOC_SEVERITY_LABELS,
  VOC_SOURCE_TYPE_LABELS,
  VOC_WILLINGNESS_LABELS,
} from '../schemas/voc-schema';

export function VOCSourceTypeBadge({ type }: { type: VOCSourceType | null }) {
  if (!type) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{VOC_SOURCE_TYPE_LABELS[type]}</Badge>;
}

export function VOCCustomerSegmentBadge({
  segment,
}: {
  segment: VOCCustomerSegment | null;
}) {
  if (!segment) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="secondary">{VOC_CUSTOMER_SEGMENT_LABELS[segment]}</Badge>;
}

export function VOCEmotionBadge({ emotion }: { emotion: VOCEmotion | null }) {
  if (!emotion) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    emotion === 'NEGATIVE'
      ? 'destructive'
      : emotion === 'POSITIVE'
        ? 'default'
        : 'secondary';
  return <Badge variant={variant}>{VOC_EMOTION_LABELS[emotion]}</Badge>;
}

export function VOCFrequencyBadge({
  frequency,
}: {
  frequency: VOCFrequency | null;
}) {
  if (!frequency) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    frequency === 'HIGH' ? 'destructive' : frequency === 'MEDIUM' ? 'default' : 'secondary';
  return <Badge variant={variant}>{VOC_FREQUENCY_LABELS[frequency]}</Badge>;
}

export function VOCSeverityBadge({ severity }: { severity: VOCSeverity | null }) {
  if (!severity) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    severity === 'CRITICAL' || severity === 'HIGH'
      ? 'destructive'
      : severity === 'MEDIUM'
        ? 'default'
        : 'secondary';
  return <Badge variant={variant}>{VOC_SEVERITY_LABELS[severity]}</Badge>;
}

export function VOCWillingnessBadge({
  willingness,
}: {
  willingness: VOCWillingnessToPay;
}) {
  const variant =
    willingness === 'HIGH'
      ? 'default'
      : willingness === 'MEDIUM'
        ? 'secondary'
        : willingness === 'LOW'
          ? 'outline'
          : 'outline';
  return (
    <Badge variant={variant}>{VOC_WILLINGNESS_LABELS[willingness]}</Badge>
  );
}
