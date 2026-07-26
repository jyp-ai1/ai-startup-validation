'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowRight } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useSubmitLock } from '../../hooks/use-submit-lock';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

const FLOW_STEPS = ['basic', 'optional', 'investigate', 'result'] as const;

/** V2 STEP 3 — review process guide only (no AI PM, no chat). */
export function V2WorkflowGuideView() {
  const t = useTranslations('workflow.v2.workflowGuide');
  const router = useRouter();
  const { locked, lock } = useSubmitLock(2000);

  const handleStart = () => {
    if (locked) return;
    lock();
    router.push('/validation');
  };

  return (
    <JourneyLayout phase="workflow" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="space-y-8">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">{t('lead')}</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
              <p className="text-base text-muted-foreground">{t('subtitle')}</p>
            </div>

            <ol className="space-y-0" role="list">
              {FLOW_STEPS.map((step, index) => {
                const isFirst = index === 0;
                const isLast = index === FLOW_STEPS.length - 1;
                return (
                  <li key={step}>
                    <div
                      className={cn(
                        'flex gap-4 rounded-2xl border p-5',
                        isFirst
                          ? 'border-primary/40 bg-primary/[0.04]'
                          : 'border-border/60 bg-card/50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          isFirst
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">{t(`steps.${step}.title`)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t(`steps.${step}.desc`)}
                        </p>
                        {isFirst ? (
                          <p className="mt-2 text-xs font-medium text-primary">{t('youAreHere')}</p>
                        ) : null}
                      </div>
                    </div>
                    {!isLast ? (
                      <div className="flex justify-center py-2 text-muted-foreground/70">
                        <ArrowDown className="size-4" aria-hidden />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        }
        footer={
          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              disabled={locked}
              onClick={handleStart}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {t('cta')}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('ctaHint')}</p>
          </div>
        }
      />
    </JourneyLayout>
  );
}
