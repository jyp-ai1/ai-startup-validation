'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { saveV2Validation } from '../../lib/v2-validation-store';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

const BASE_SCORE = 41;
const OPTIONAL_BOOSTS = {
  problem: 12,
  customer: 10,
  mvp: 8,
  pricing: 11,
} as const;

type OptionalKey = keyof typeof OPTIONAL_BOOSTS;

const OPTIONAL_KEYS: OptionalKey[] = ['problem', 'customer', 'mvp', 'pricing'];
const AI_THRESHOLD = 80;

export function V2ValidationView() {
  const t = useTranslations('workflow.v2.validation');
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [selected, setSelected] = useState<Set<OptionalKey>>(new Set());

  const score = useMemo(() => {
    let total = idea.trim().length >= 4 ? BASE_SCORE : 0;
    for (const key of selected) {
      total += OPTIONAL_BOOSTS[key];
    }
    return Math.min(total, 99);
  }, [idea, selected]);

  const canShowScore = idea.trim().length >= 4;
  const readyForAi = score >= AI_THRESHOLD;

  const toggleOptional = (key: OptionalKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartAi = () => {
    const options = {
      problem: selected.has('problem'),
      customer: selected.has('customer'),
      mvp: selected.has('mvp'),
      pricing: selected.has('pricing'),
    };
    saveV2Validation(idea.trim(), score, options);
    router.push('/investigate');
  };

  return (
    <JourneyLayout phase="workflow" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('nextHint')}</p>
              <h1 className="mt-1 text-xl font-semibold">{t('ideaLabel')}</h1>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder={t('ideaPlaceholder')}
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-border/70 bg-background px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
              />
            </div>
            {canShowScore ? (
              <div className="rounded-2xl border border-border/70 bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('scoreLabel')}</p>
                <p className="mt-2 text-5xl font-bold tabular-nums tracking-tight">{score}%</p>
              </div>
            ) : null}
            {canShowScore ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('optionalLead')}</p>
                <div className="flex flex-wrap gap-2">
                  {OPTIONAL_KEYS.map((key) => {
                    const active = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleOptional(key)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/70 text-muted-foreground hover:border-primary/30',
                        )}
                      >
                        + {t(`optional.${key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        }
        result={
          readyForAi ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed">
                  {t('aiIntro')}
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                className="mt-5 h-12 w-full rounded-xl font-semibold"
                onClick={handleStartAi}
              >
                {t('aiStartCta')}
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Button>
            </div>
          ) : canShowScore ? (
            <p className="text-center text-sm text-muted-foreground">{t('keepOptionalHint')}</p>
          ) : null
        }
      />
    </JourneyLayout>
  );
}
