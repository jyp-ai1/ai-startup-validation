'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Button, toast } from '@repo/ui';

import { confirmWorkflowAction } from '../actions/journey-actions';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { AiPmOfficeChat, type AiPmChatMessage } from './ai-state/ai-pm-office-chat';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';
import { V2JourneyStack } from './v2/v2-journey-stack';

const STRATEGY_PHASES = ['discover', 'validate', 'decide', 'execute'] as const;

type WorkflowPlanViewProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
};

export function WorkflowPlanView({ goalId, template }: WorkflowPlanViewProps) {
  const t = useTranslations('workflow.confirmation');
  const tg = useTranslations('workflow.goal');
  const tt = useTranslations('workflow.toast');
  const { locked, lock } = useSubmitLock(2000);
  const analytics = useJourneyAnalytics();

  useEffect(() => {
    analytics.trackWorkflowCreated(goalId, template.stepCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, template.stepCount]);

  useEffect(() => {
    if (sessionStorage.getItem('workflow_toast') === '1') {
      sessionStorage.removeItem('workflow_toast');
      toast.success(tt('workflowReady'));
    }
  }, [tt]);

  const goalTitle = tg(`options.${goalId}.title`);
  const phaseLines = STRATEGY_PHASES.map(
    (key, index) => `${index + 1}. ${t(`phases.${key}.title`)} — ${t(`phases.${key}.desc`)}`,
  ).join('\n');

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    return [
      { role: 'ai', text: t('officeChat.greeting') },
      { role: 'ai', text: t('officeChat.planReady', { goal: goalTitle }) },
      { role: 'ai', text: t('officeChat.rationale') },
      { role: 'ai', text: t('officeChat.phasesIntro') },
      { role: 'ai', text: phaseLines },
      { role: 'ai', text: t('officeChat.eta', { minutes: 20 }) },
    ];
  }, [goalTitle, phaseLines, t]);

  const footer = (
    <form
      action={confirmWorkflowAction}
      onSubmit={() => {
        if (locked) return;
        lock();
        sessionStorage.removeItem('ll_project_started');
        sessionStorage.setItem('workspace_toast', '1');
      }}
    >
      <Button
        type="submit"
        size="lg"
        disabled={locked}
        className="h-12 w-full rounded-xl font-semibold"
      >
        {t('cta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t('ctaHint')}</p>
    </form>
  );

  return (
    <JourneyLayout phase="workflow" width="default" variant="journey" versionLabel="V2">
      <JourneyFade>
        <V2JourneyStack
          embedded
          main={<AiPmOfficeChat messages={chatMessages} footer={footer} />}
        />
      </JourneyFade>
    </JourneyLayout>
  );
}
