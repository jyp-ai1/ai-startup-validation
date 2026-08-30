'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { SurfacePresenter } from '../../lib/business-understanding/surface-presenter-contract';

type WorkspaceS11SurfaceProps = {
  surface: SurfacePresenter;
  /** When set, why-now renders outside (loop panel owns collapsed block). */
  hideWhyNow?: boolean;
  /** P0-3 — question-only on the active conversation surface. */
  sections?: 'all' | 'question' | 'understanding';
  className?: string;
};

/**
 * Conversation UX — question-first surface.
 * Understanding / decision / action live in collapsed detail (P0-2, P0-3, P0-6).
 */
export function WorkspaceS11Surface({
  surface,
  hideWhyNow = false,
  sections = 'all',
  className,
}: WorkspaceS11SurfaceProps) {
  const t = useTranslations('workflow.journey.workspaceShell.conversationUx');
  const showQuestion = Boolean(surface.question.text.trim());

  const understandingLines = [
    ...surface.understanding.confirmed,
    ...surface.understanding.assumptions.map((item) => item.value),
  ];

  return (
    <div
      data-testid={sections === 'understanding' ? 's11-surface-understanding' : 's11-surface'}
      className={cn('space-y-4', className)}
    >
      {sections !== 'understanding' && showQuestion ? (
        <section data-testid="surface-question" aria-label="question" className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {t('currentQuestionLabel')}
          </p>
          <p className="text-lg font-semibold leading-relaxed sm:text-xl">{surface.question.text}</p>
          {!hideWhyNow && surface.question.purpose ? (
            <details className="mt-1" data-testid="why-now-details">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                {t('whyNowToggle')}
              </summary>
              <p
                data-testid="surface-question-purpose"
                data-cpo-field="why-this-question-now"
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              >
                {surface.question.purpose}
              </p>
            </details>
          ) : null}
        </section>
      ) : null}

      {sections !== 'question' ? (
        <details
          data-testid="surface-understanding"
          className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3"
        >
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {t('understandingToggle')}
          </summary>
          <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          {understandingLines.length > 0 ? (
            <ul className="space-y-2">
              {understandingLines.map((line) => (
                <li key={`u-${line}`} className="flex gap-2 text-sm leading-relaxed">
                  <span className="shrink-0 text-emerald-600" aria-hidden>
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('understandingEmpty')}</p>
          )}

          {(surface.decision.summary ||
            surface.decision.blockingReason ||
            surface.action.current ||
            surface.action.reason) && (
            <div data-testid="surface-decision" className="space-y-2 border-t border-border/30 pt-3">
              {surface.decision.summary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{surface.decision.summary}</p>
              ) : null}
              {surface.decision.blockingReason &&
              surface.decision.blockingReason !== surface.decision.summary ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {surface.decision.blockingReason}
                </p>
              ) : null}
              {surface.action.current ? (
                <p className="text-sm leading-relaxed">{surface.action.current}</p>
              ) : null}
              {surface.action.reason ? (
                <p
                  data-testid="surface-action-reason"
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {surface.action.reason}
                </p>
              ) : null}
              {surface.action.next ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{surface.action.next}</p>
              ) : null}
            </div>
          )}
        </div>
      </details>
      ) : null}
    </div>
  );
}
