'use client';

import { useTranslations } from 'next-intl';

import { DecisionVerdictBadge } from '@/features/decision/components/decision-verdict-badge';
import type { DecisionVerdict } from '@/features/decision';

import type { ReportSectionContent } from '../types/report-types';

type ReportSlidePreviewProps = {
  section: ReportSectionContent;
  projectTitle: string;
  slideIndex: number;
  totalSlides: number;
};

export function ReportSlidePreview({
  section,
  projectTitle,
  slideIndex,
  totalSlides,
}: ReportSlidePreviewProps) {
  const t = useTranslations('reportEngine');
  const td = useTranslations('decision');
  const te = useTranslations('executive');
  const tf = useTranslations('framework');

  return (
    <div className="aspect-[16/10] w-full rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-8 md:p-12 shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-border/40 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {projectTitle}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
              {t(section.titleKey as 'sections.executiveSummary')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(section.storyStepKey as 'story.step1')}
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {slideIndex}/{totalSlides}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pt-6">
          {section.blocks.map((block) => {
            if (block.type === 'verdict' && typeof block.value === 'string') {
              return (
                <DecisionVerdictBadge
                  key={block.id}
                  verdict={block.value as DecisionVerdict}
                  size="lg"
                />
              );
            }

            if (block.type === 'metric') {
              return (
                <div key={block.id} className="flex items-baseline justify-between border-b border-border/30 pb-2">
                  <span className="text-sm text-muted-foreground">
                    {block.labelKey
                      ? resolveLabel(block.labelKey, t, te, td, tf)
                      : block.bodyKey
                        ? t(block.bodyKey as 'sections.executiveSummary')
                        : '—'}
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{block.value ?? '—'}</span>
                </div>
              );
            }

            if (block.type === 'heading') {
              return (
                <h3 key={block.id} className="text-lg font-semibold">
                  {block.bodyKey ? t(block.bodyKey as 'sections.executiveSummary') : ''}
                </h3>
              );
            }

            if (block.type === 'paragraph') {
              const key = block.bodyKey ?? '';
              const text = key.startsWith('executive.')
                ? te(key.replace('executive.', '') as 'summary.line1')
                : key.startsWith('summary.')
                  ? te(key as 'summary.line1')
                  : td(key as 'executive.insufficient1');
              return (
                <p key={block.id} className="text-[15px] leading-relaxed text-foreground/90">
                  {text}
                </p>
              );
            }

            if (block.type === 'bullet' || block.type === 'table_row') {
              return (
                <div key={block.id} className="flex gap-2 text-sm">
                  <span className="text-primary">•</span>
                  <span>
                    {block.value
                      ? String(block.value)
                      : block.labelKey
                        ? resolveLabel(block.labelKey, t, te, td, tf)
                        : block.bodyKey
                          ? td(block.bodyKey as 'risks.competitionIntensity')
                          : ''}
                  </span>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

function resolveLabel(
  key: string,
  t: ReturnType<typeof useTranslations<'reportEngine'>>,
  te: ReturnType<typeof useTranslations<'executive'>>,
  td: ReturnType<typeof useTranslations<'decision'>>,
  tf: ReturnType<typeof useTranslations<'framework'>>,
): string {
  if (key.startsWith('names.') || key.startsWith('framework.')) {
    return tf(key as 'names.swot');
  }
  if (key.startsWith('kpis.') || key.startsWith('metrics.')) {
    return te(key as 'kpis.startup.tam');
  }
  if (key.startsWith('sections.')) {
    return t(key as 'sections.executiveSummary');
  }
  if (key.startsWith('agents.') || key.startsWith('summary.')) {
    return te(key as 'summary.line1');
  }
  if (key.startsWith('risks.') || key.startsWith('actions.') || key.startsWith('opportunities.')) {
    return td(key as 'risks.competitionIntensity');
  }
  return key;
}
