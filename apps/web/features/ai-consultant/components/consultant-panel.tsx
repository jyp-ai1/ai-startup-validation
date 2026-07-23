'use client';

import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { IntelligenceViewModel } from '@/features/project-intelligence';
import { ConsultantMemoryUpgrade } from '@/features/project-intelligence/components/consultant-memory-upgrade';

import type { ConsultantViewModel } from '../services/consultant-types';
import { ConsultantActions } from './consultant-actions';
import { ConsultantContextPanel } from './consultant-context-panel';
import { ConsultantFeed } from './consultant-feed';
import { ConsultantMemory } from './consultant-memory';
import { ConsultantOverview } from './consultant-overview';
import { ConsultantPrompts } from './consultant-prompts';
import { ConsultantQuestions } from './consultant-questions';
import { ConsultantRecommendations } from './consultant-recommendations';

type ConsultantPanelProps = {
  consultant: ConsultantViewModel;
  intelligence?: IntelligenceViewModel | null;
};

export function ConsultantPanel({ consultant, intelligence = null }: ConsultantPanelProps) {
  const t = useTranslations('aiConsultant');
  const td = useTranslations('decision');
  const ts = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  function translateKey(key: string) {
    if (key.startsWith('actions.')) return td(key as 'actions.voc10.label');
    if (key.startsWith('nextAction.')) {
      return ts(key as 'nextAction.research.label');
    }
    return t(key as 'recommendations.fallback.voc.label');
  }

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.consultantOpen, {
      project_id: consultant.projectId,
      go_probability: consultant.goProbability,
    });
  }, [consultant.projectId, consultant.goProbability, trackEvent]);

  function handleTopAiClick() {
    trackEvent(ANALYTICS_EVENTS.consultantAction, {
      project_id: consultant.projectId,
      action_id: 'top_ai_research',
    });
  }

  function handleTopManualClick() {
    trackEvent(ANALYTICS_EVENTS.consultantAction, {
      project_id: consultant.projectId,
      action_id: 'top_manual_input',
    });
  }

  return (
    <aside className="flex flex-col rounded-2xl border border-primary/20 bg-card shadow-sm">
      <header className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t('panel.eyebrow')}
            </p>
            <h2 className="truncate text-sm font-semibold">{t('panel.title')}</h2>
          </div>
        </div>
        <p className="mt-3 truncate text-sm font-medium">{consultant.projectTitle}</p>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="rounded-xl bg-muted/30 px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(consultant.summaryKey as 'summary.analyzed', consultant.summaryParams)}
          </p>
        </div>

        <ConsultantOverview modules={consultant.modules} />

        {consultant.topRecommendation ? (
          <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t('recommendations.topEyebrow')}
            </p>
            <p className="text-sm font-semibold leading-snug">
              {translateKey(consultant.topRecommendation.labelKey)}
            </p>
            <p className="text-xs text-muted-foreground">
              {translateKey(consultant.topRecommendation.descriptionKey)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs" asChild onClick={handleTopAiClick}>
                <Link href={consultant.topRecommendation.href}>
                  <Sparkles className="size-3.5" />
                  {t('recommendations.aiInvestigate')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild onClick={handleTopManualClick}>
                <Link href={consultant.topRecommendation.manualHref}>{t('recommendations.manualInput')}</Link>
              </Button>
            </div>
          </section>
        ) : null}

        <ConsultantRecommendations recommendations={consultant.recommendations} />

        <ConsultantContextPanel context={consultant.context} />

        <ConsultantQuestions questions={consultant.questions} projectId={consultant.projectId} />

        {intelligence ? (
          <ConsultantMemoryUpgrade
            projectId={consultant.projectId}
            sections={intelligence.memorySections}
            proactiveMessage={intelligence.proactiveMessage}
          />
        ) : (
          <ConsultantMemory items={consultant.memory} projectId={consultant.projectId} />
        )}

        <ConsultantActions actions={consultant.actions} projectId={consultant.projectId} />

        <ConsultantPrompts prompts={consultant.prompts} projectId={consultant.projectId} />

        <ConsultantFeed feed={consultant.feed} />
      </div>

      <footer className="border-t border-border/50 px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('goProbability.label')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(consultant.goProbabilityLabelKey as 'goProbability.moderate')}
            </p>
          </div>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              consultant.goProbability >= 70
                ? 'text-emerald-600'
                : consultant.goProbability >= 45
                  ? 'text-primary'
                  : 'text-amber-600',
            )}
          >
            {consultant.goProbability}%
          </p>
        </div>
      </footer>
    </aside>
  );
}
