'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type V2ArtifactTriggerProps = {
  visible: boolean;
  offerKey?: string | null;
  readOnly?: boolean;
  className?: string;
};

export function V2ArtifactTrigger({
  visible,
  offerKey = 'leanCanvasOffer',
  readOnly = false,
  className,
}: V2ArtifactTriggerProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.artifactTrigger');

  if (!visible || !offerKey) return null;

  return (
    <section className={cn('rounded-xl border border-primary/20 bg-primary/[0.04] p-4', className)}>
      <p className="text-sm leading-relaxed">{t(`offers.${offerKey}`)}</p>
      {!readOnly ? (
        <Button type="button" size="sm" variant="outline" className="mt-3 rounded-lg" disabled>
          {t(`cta.${offerKey}`)}
        </Button>
      ) : null}
      <p className="mt-2 text-[10px] text-muted-foreground">{t('mockHint')}</p>
    </section>
  );
}
