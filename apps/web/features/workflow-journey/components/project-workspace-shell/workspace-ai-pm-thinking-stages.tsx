'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  resolveThinkingStage,
  stateDrivenThinkingCompleteMs,
  THINKING_STAGES,
  type ThinkingStageId,
} from '../../lib/business-understanding/thinking-stages';

type WorkspaceAiPmThinkingStagesProps = {
  className?: string;
  /** Called when total thinking window elapses (parent usually already has timeout). */
  onComplete?: () => void;
  /**
   * Stages already completed by real work before this UI mounts.
   * Answer path writes Memory before PROCESSING — mark `memory` done immediately.
   */
  completedStageIds?: ThinkingStageId[];
};

/** Staged Memory → Understanding update → next question (state-aware, not fake spinner-only). */
export function WorkspaceAiPmThinkingStages({
  className,
  onComplete,
  completedStageIds = ['memory'],
}: WorkspaceAiPmThinkingStagesProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');
  const [elapsed, setElapsed] = useState(0);
  const active = resolveThinkingStage(elapsed);
  const forcedDone = new Set(completedStageIds);
  const completeMs = stateDrivenThinkingCompleteMs(completedStageIds);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const next = performance.now() - started;
      setElapsed(next);
      if (next >= completeMs) {
        window.clearInterval(id);
        onComplete?.();
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [completeMs, onComplete]);

  return (
    <section
      data-testid="ai-pm-thinking-stages"
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-primary/25 bg-muted/20 px-6 py-10 text-center',
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p className="mt-4 text-sm font-medium">{t('reanalyzeTitle')}</p>
      <ol className="mt-5 w-full max-w-xs space-y-2 text-left">
        {THINKING_STAGES.map((stage) => (
          <ThinkingRow
            key={stage.id}
            id={stage.id}
            label={t(stage.labelKey)}
            activeId={active.id}
            elapsed={elapsed}
            endsAtMs={stage.endsAtMs}
            forceDone={forcedDone.has(stage.id)}
          />
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">{t('reanalyzeHint')}</p>
    </section>
  );
}

function ThinkingRow({
  id,
  label,
  activeId,
  elapsed,
  endsAtMs,
  forceDone,
}: {
  id: ThinkingStageId;
  label: string;
  activeId: ThinkingStageId;
  elapsed: number;
  endsAtMs: number;
  forceDone: boolean;
}) {
  const done = forceDone || elapsed >= endsAtMs;
  const active = !done && activeId === id;
  return (
    <li
      data-stage={id}
      data-done={done ? 'true' : 'false'}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        active && 'bg-primary/10 font-medium text-foreground',
        done && 'text-muted-foreground',
        !active && !done && 'text-muted-foreground/70',
      )}
    >
      <span className="w-4 shrink-0 text-center" aria-hidden>
        {done ? '✓' : active ? '●' : '○'}
      </span>
      <span>{label}</span>
    </li>
  );
}
