'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';

import { loadV2Validation } from '../../lib/v2-validation-store';
import { createV2Workspace } from '../../lib/v2-workspace-store';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

const DETAIL_KEYS = ['market', 'competitor', 'pricing', 'grants'] as const;
const OPINION_KEYS = ['marketOk', 'pricingGap', 'grantsOk'] as const;

export function V2ConclusionView() {
  const t = useTranslations('workflow.v2.conclusion');
  const router = useRouter();
  const validation = loadV2Validation();
  const pipeline = loadAgentPipelineResult();

  const score = useMemo(() => {
    const fromPipeline =
      pipeline?.founderOs?.successScore?.percent ??
      pipeline?.decision?.confidence ??
      pipeline?.growth?.metrics?.successScore;
    if (fromPipeline != null) return Math.round(fromPipeline);
    return validation?.score ?? 82;
  }, [pipeline, validation?.score]);

  const verdict = score >= 70 ? 'GO' : 'HOLD';

  const handleCreateWorkspace = () => {
    const name = validation?.idea
      ? validation.idea.length <= 36
        ? validation.idea
        : `${validation.idea.slice(0, 33).trim()}…`
      : 'AI Startup';
    createV2Workspace(name, score);
    router.push('/workspace');
  };

  return (
    <JourneyLayout phase="workspace" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('scoreLabel')}</p>
            <p className="mt-2 text-6xl font-bold tabular-nums">{score}%</p>
            <p
              className={
                verdict === 'GO'
                  ? 'mt-3 text-2xl font-semibold text-emerald-700 dark:text-emerald-400'
                  : 'mt-3 text-2xl font-semibold text-amber-700 dark:text-amber-400'
              }
            >
              {verdict === 'GO' ? t('verdictGo') : t('verdictHold')}
            </p>
          </div>
        }
        result={
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('opinionLabel')}
            </p>
            <ul className="mt-3 space-y-2 text-sm" role="list">
              {OPINION_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  {t(`opinion.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        }
        details={
          <details className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">{t('detailsSummary')}</summary>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {DETAIL_KEYS.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm"
                >
                  {t(`details.${key}`)}
                </div>
              ))}
            </div>
          </details>
        }
        footer={
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl font-semibold"
            onClick={handleCreateWorkspace}
          >
            {t('createWorkspaceCta')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        }
      />
    </JourneyLayout>
  );
}
