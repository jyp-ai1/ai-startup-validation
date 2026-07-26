'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useV2ResearchPipeline } from '../../hooks/use-v2-research-pipeline';
import { useJourneyProject } from '../../hooks/use-journey-project';
import {
  estimateRemainingSeconds,
  getLiveWorkspaceStepProgress,
} from '../../lib/ai-pm-conversation';
import { loadV2Validation } from '../../lib/v2-validation-store';
import type { WorkflowGoalId } from '../../types';
import { AiPmLiveConversation } from '../ai-state/ai-pm-live-conversation';
import { AiPmOfficeChat, type AiPmChatMessage } from '../ai-state/ai-pm-office-chat';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

const RESEARCH_STEP_KEYS = ['market', 'competitor', 'pricing', 'grants'] as const;

type V2ResearchViewProps = {
  goalId: WorkflowGoalId;
};

export function V2ResearchView({ goalId }: V2ResearchViewProps) {
  const t = useTranslations('workflow.v2.research');
  const tAi = useTranslations('workflow.aiPm');
  const router = useRouter();
  const { projectId, ready } = useJourneyProject();
  const validation = loadV2Validation();

  useEffect(() => {
    if (validation == null) {
      router.replace('/validation');
    }
  }, [router, validation]);

  const handleComplete = useCallback(() => {
    router.push('/conclusion');
  }, [router]);

  const handleFailed = useCallback(() => {
    // stay on page — user can retry
  }, []);

  const { agentIndex, failed, running, retry } = useV2ResearchPipeline({
    goalId,
    projectId,
    enabled: ready && validation != null,
    onComplete: handleComplete,
    onFailed: handleFailed,
  });

  const stepProgress = getLiveWorkspaceStepProgress(agentIndex);
  const remaining = estimateRemainingSeconds(agentIndex);

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    const list: AiPmChatMessage[] = [{ role: 'ai', text: t('intro') }];
    if (running || (!failed && agentIndex > 0)) {
      list.push({
        role: 'ai',
        text: t('progress', {
          current: stepProgress.current,
          total: stepProgress.total,
        }),
      });
      list.push({ role: 'ai', text: tAi(`liveStep.phases.${stepProgress.workId}`) });
      if (!failed) {
        list.push({ role: 'ai', text: tAi('remaining', { seconds: remaining }) });
      }
    }
    return list;
  }, [agentIndex, failed, remaining, running, stepProgress, t, tAi]);

  const completedSteps = Math.min(
    RESEARCH_STEP_KEYS.length,
    Math.ceil((stepProgress.current / Math.max(stepProgress.total, 1)) * RESEARCH_STEP_KEYS.length),
  );

  return (
    <JourneyLayout phase="workspace" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <AiPmOfficeChat
            messages={chatMessages}
            footer={
              failed ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t('failedHint')}</p>
                  <Button type="button" className="w-full rounded-xl" onClick={retry}>
                    {t('retryCta')}
                  </Button>
                </div>
              ) : running ? (
                <p className="text-center text-sm text-muted-foreground">{t('waitHint')}</p>
              ) : null
            }
          >
            <AiPmLiveConversation agentIndex={agentIndex} failed={failed} />
          </AiPmOfficeChat>
        }
        result={
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('stepsLabel')}
            </p>
            <ul className="mt-4 space-y-3" role="list">
              {RESEARCH_STEP_KEYS.map((key, index) => {
                const done = index < completedSteps;
                const active = index === completedSteps && running;
                return (
                  <li key={key} className="flex items-center gap-3 text-sm">
                    {done ? (
                      <span className="text-emerald-600" aria-hidden>
                        ✓
                      </span>
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                    ) : (
                      <span className="size-4 rounded-full border border-border/70" aria-hidden />
                    )}
                    <span className={cn(done ? 'text-foreground' : 'text-muted-foreground')}>
                      {t(`stepItems.${key}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        }
      />
    </JourneyLayout>
  );
}
