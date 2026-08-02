'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiPmSharedThinking } from '../../lib/business-understanding/build-ai-pm-shared-thinking';
import { formatCompactThinkingProse } from '../../lib/business-understanding/build-ai-pm-shared-thinking';
import { buildCompactQuestionInvite } from '../../lib/business-understanding/build-ai-pm-conversation-rhythm';
import { logG1LoopEvent } from '../../lib/business-understanding/g1-loop-instrumentation';

const THINKING_MS = 400;
const QUESTION_MS = 900;

type WorkspaceAiPmSharedThinkingRevealProps = {
  thinking: AiPmSharedThinking;
  readOnly?: boolean;
  showQuestionPreview?: boolean;
  documentReadable?: boolean;
  onContinue: () => void;
  workspace?: string;
  turn?: number;
  className?: string;
};

/** S5.2 — CEO sees Thinking → Question only (agreement/permission merged). */
export function WorkspaceAiPmSharedThinkingReveal({
  thinking,
  readOnly = false,
  showQuestionPreview = false,
  documentReadable = true,
  onContinue,
  workspace = 'demo',
  turn = 1,
  className,
}: WorkspaceAiPmSharedThinkingRevealProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop.sharedThinking');
  const [showThinking, setShowThinking] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [revealedAt, setRevealedAt] = useState<number | null>(null);

  const thinkingLine = useMemo(() => formatCompactThinkingProse(thinking), [thinking]);
  const questionInvite = useMemo(
    () => buildCompactQuestionInvite(thinking.issueId, thinking.question),
    [thinking.issueId, thinking.question],
  );

  const readyToContinue = showQuestionPreview ? showQuestion : showThinking;

  useEffect(() => {
    setShowThinking(false);
    setShowQuestion(false);
    setRevealedAt(null);

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setShowThinking(true);
        setRevealedAt(Date.now());
      }, THINKING_MS),
    );

    if (showQuestionPreview) {
      timers.push(
        window.setTimeout(() => {
          setShowQuestion(true);
          logG1LoopEvent({
            event: 'question_show',
            workspace,
            turn,
            issueId: thinking.issueId,
          });
        }, THINKING_MS + QUESTION_MS),
      );
    }

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [thinking.issueId, thinking.rethink, thinking.question, showQuestionPreview, turn, workspace]);

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>

      <div
        className={cn(
          'mt-4 transition-all duration-500',
          showThinking ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
        )}
        aria-hidden={!showThinking}
      >
        <p className="text-[15px] font-medium leading-relaxed">
          {documentReadable ? t('thinkingLead') : t('thinkingLeadUnreadable')}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground">{thinkingLine}</p>
      </div>

      {showQuestionPreview ? (
        <div
          className={cn(
            'mt-5 space-y-2 transition-all duration-500',
            showQuestion ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
          )}
          aria-hidden={!showQuestion}
        >
          {questionInvite.lines.map((line, index) => (
            <p
              key={`${thinking.issueId}-q-${index}`}
              className={cn(
                'text-[15px] leading-relaxed',
                index === questionInvite.lines.length - 1
                  ? 'font-medium text-foreground'
                  : index === 0
                    ? 'text-muted-foreground'
                    : 'font-medium text-primary',
              )}
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        className={cn(
          'mt-5 rounded-xl transition-all duration-500',
          readyToContinue ? 'opacity-100' : 'pointer-events-none opacity-40',
        )}
        disabled={readOnly || !readyToContinue}
        onClick={() => {
          if (revealedAt != null) {
            logG1LoopEvent({
              event: 'thinking_reveal',
              workspace,
              turn,
              duration: Date.now() - revealedAt,
              issueId: thinking.issueId,
            });
          }
          onContinue();
        }}
      >
        {t('continueCta')}
      </Button>
    </section>
  );
}
