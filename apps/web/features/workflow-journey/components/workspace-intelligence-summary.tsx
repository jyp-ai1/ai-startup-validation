'use client';

import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Scale,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { JourneyWorkspaceTab } from './intelligence-workspace/journey-workspace-nav';

type WorkspaceIntelligenceSummaryProps = {
  confidence: number;
  verdict: string;
  onNavigate: (tab: JourneyWorkspaceTab) => void;
  className?: string;
};

const CARDS: {
  key: 'evidence' | 'decision' | 'confidence' | 'nextAction';
  icon: typeof Scale;
  tab: JourneyWorkspaceTab;
}[] = [
  { key: 'evidence', icon: ClipboardList, tab: 'decision' },
  { key: 'decision', icon: Scale, tab: 'decision' },
  { key: 'confidence', icon: TrendingUp, tab: 'today' },
  { key: 'nextAction', icon: Sparkles, tab: 'today' },
];

export function WorkspaceIntelligenceSummary({
  confidence,
  verdict,
  onNavigate,
  className,
}: WorkspaceIntelligenceSummaryProps) {
  const t = useTranslations('workflow.workspace.summary');

  return (
    <section className={cn('space-y-3', className)} aria-label={t('label')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('title')}</h3>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <BarChart3 className="size-3.5" aria-hidden />
          {t('confidence', { value: confidence })}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {CARDS.map(({ key, icon: Icon, tab }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(tab)}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-primary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t(`cards.${key}.title`)}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {key === 'decision'
                  ? t('cards.decision.value', { verdict })
                  : t(`cards.${key}.desc`)}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
