'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { InvestigationTopic } from '../../lib/v2-next-action-engine';
import { getEvidenceForTopic } from '../../lib/v2-evidence-mock-data';
import { getTopicJudgment } from '../../lib/v2-topic-judgment';
import { V2AiConfidenceBadge } from './v2-ai-confidence-badge';
import { V2EvidenceQaBlock } from './v2-evidence-qa-block';
import { StarRating } from './v2-star-rating';
import { TrendIndicator } from './v2-trend-indicator';
import { V2TopicRecentChangeBlock } from './v2-topic-recent-change-block';

type V2EvidenceDetailDrawerProps = {
  topic: InvestigationTopic | null;
  onClose: () => void;
  readOnly?: boolean;
  onFillPricing?: () => void;
};

export function V2EvidenceDetailDrawer({
  topic,
  onClose,
  readOnly = false,
  onFillPricing,
}: V2EvidenceDetailDrawerProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.evidenceDrawer');
  const [showWhy, setShowWhy] = useState(true);

  useEffect(() => {
    if (!topic) return;
    setShowWhy(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [topic, onClose]);

  if (!topic) return null;

  const judgment = getTopicJudgment(topic);
  const data = getEvidenceForTopic(topic);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t('close')}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-background shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300">
        <header className="shrink-0 border-b border-border/40 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t(`title.${topic}`)}</h2>
            <Button type="button" size="icon" variant="ghost" className="size-8 rounded-lg" onClick={onClose}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* 1. AI 현재 판단 */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t('sections.judgment')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating stars={judgment.stars} className="text-base" />
              <TrendIndicator trend={judgment.trend} starDelta={judgment.starDelta} />
              <V2AiConfidenceBadge
                confidence={judgment.confidence}
                level={judgment.confidenceLevel}
              />
            </div>
            <div className="space-y-2 text-sm leading-relaxed">
              {judgment.judgmentParagraphs.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {judgment.recentChange ? (
              <V2TopicRecentChangeBlock
                change={judgment.recentChange}
                currentStars={judgment.stars}
                trend={judgment.trend}
              />
            ) : null}
          </section>

          <div className="border-t border-border/40" />

          {/* 2. 왜 그렇게 판단했나요? */}
          <section className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setShowWhy((v) => !v)}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('why.title')}
              </p>
              <span className="text-xs text-primary">{showWhy ? t('why.hide') : t('why.show')}</span>
            </button>
            {showWhy ? (
              <ul className="space-y-2 motion-safe:animate-in motion-safe:fade-in">
                {data.whySources.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border/40 px-3 py-2.5 text-sm">
                    <p className="font-medium">{s.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                  </li>
                ))}
                {'startupCases' in data
                  ? data.startupCases.map((c) => (
                      <li key={c.name} className="rounded-lg bg-muted/20 px-3 py-2.5 text-sm">
                        <p className="font-semibold">{c.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{c.whySuccess}</p>
                      </li>
                    ))
                  : null}
                {'competitors' in data ? (
                  <li className="overflow-x-auto rounded-lg border border-border/40">
                    <table className="w-full min-w-[400px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/30">
                          <th className="px-2 py-1.5">{t('competition.colName')}</th>
                          <th className="px-2 py-1.5">{t('competition.pricing')}</th>
                          <th className="px-2 py-1.5">{t('competition.diff')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.competitors.map((c) => (
                          <tr
                            key={c.name}
                            className={cn('border-b border-border/20', c.isUs && 'bg-primary/[0.06]')}
                          >
                            <td className="px-2 py-1.5 font-medium">{c.name}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{c.pricing}</td>
                            <td className="px-2 py-1.5">{c.diffFromUs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </section>

          <div className="border-t border-border/40" />

          {/* 3. 대표가 확인해야 하는 것 */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('sections.founderActions')}
            </p>
            <ul className="space-y-2">
              {judgment.actionChecklist.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">□</span>
                  {item}
                </li>
              ))}
            </ul>
            {topic === 'pricing' && !readOnly && onFillPricing ? (
              <Button type="button" size="sm" className="rounded-lg" onClick={onFillPricing}>
                {t('pricing.inputCta')}
              </Button>
            ) : null}
          </section>

          <div className="border-t border-border/40" />

          {/* 4. AI Q&A */}
          <V2EvidenceQaBlock presets={data.qaPresets} readOnly={readOnly} />
        </div>
      </aside>
    </div>
  );
}
