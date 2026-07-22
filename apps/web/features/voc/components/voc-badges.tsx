'use client';

import { useTranslations } from 'next-intl';

import type {
  VOCCustomerSegment,
  VOCEmotion,
  VOCFrequency,
  VOCSeverity,
  VOCSourceType,
  VOCWillingnessToPay,
} from '@repo/types/validation';
import { Badge } from '@repo/ui';

export function VOCSourceTypeBadge({ type }: { type: VOCSourceType | null }) {
  const t = useTranslations('enums.vocSourceType');
  if (!type) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="outline">{t(type)}</Badge>;
}

export function VOCCustomerSegmentBadge({
  segment,
}: {
  segment: VOCCustomerSegment | null;
}) {
  const t = useTranslations('enums.vocCustomerSegment');
  if (!segment) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <Badge variant="secondary">{t(segment)}</Badge>;
}

export function VOCEmotionBadge({ emotion }: { emotion: VOCEmotion | null }) {
  const t = useTranslations('enums.vocEmotion');
  if (!emotion) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    emotion === 'NEGATIVE'
      ? 'destructive'
      : emotion === 'POSITIVE'
        ? 'default'
        : 'secondary';
  return <Badge variant={variant}>{t(emotion)}</Badge>;
}

export function VOCFrequencyBadge({
  frequency,
}: {
  frequency: VOCFrequency | null;
}) {
  const t = useTranslations('enums.vocFrequency');
  if (!frequency) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    frequency === 'HIGH' ? 'destructive' : frequency === 'MEDIUM' ? 'default' : 'secondary';
  return <Badge variant={variant}>{t(frequency)}</Badge>;
}

export function VOCSeverityBadge({ severity }: { severity: VOCSeverity | null }) {
  const t = useTranslations('enums.vocSeverity');
  if (!severity) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const variant =
    severity === 'CRITICAL' || severity === 'HIGH'
      ? 'destructive'
      : severity === 'MEDIUM'
        ? 'default'
        : 'secondary';
  return <Badge variant={variant}>{t(severity)}</Badge>;
}

export function VOCWillingnessBadge({
  willingness,
}: {
  willingness: VOCWillingnessToPay;
}) {
  const t = useTranslations('enums.vocWillingness');
  const variant =
    willingness === 'HIGH'
      ? 'default'
      : willingness === 'MEDIUM'
        ? 'secondary'
        : 'outline';
  return <Badge variant={variant}>{t(willingness)}</Badge>;
}
