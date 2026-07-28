'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { DecisionChoice } from '../../lib/v2-ai-pm-decision-types';
import {
  finalizeMeetingClosed,
  getDecisionChoice,
  getSessionPhase,
  resetDecisionSession,
  saveDecisionChoice,
  startDecisionSession,
} from '../../lib/v2-ai-pm-decision-session-store';
import { buildAiPmDecisionWorkspace } from '../../lib/v2-ai-pm-work-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiPmWorkingExperienceProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onPrimaryAction: () => void;
  onShowEvidence?: () => void;
  onFounderDecision?: (text: string) => void;
  className?: string;
};

export function V2AiPmWorkingExperience({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onPrimaryAction,
  onShowEvidence,
  onFounderDecision,
  className,
}: V2AiPmWorkingExperienceProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmWorking');

  const ctx = { evidence, reviewCount, hasIdea, investigationViewed };
  const workspace = buildAiPmDecisionWorkspace(ctx);
  const { brief, session } = workspace;

  const [phase, setPhase] = useState<'brief' | 'session' | 'closed'>(() =>
    getSessionPhase(brief.agendaId),
  );
  const [sessionStep, setSessionStep] = useState<'decide' | 'rationale'>('decide');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [choice, setChoice] = useState<DecisionChoice | null>(() => getDecisionChoice());

  useEffect(() => {
    const storedPhase = getSessionPhase(brief.agendaId);
    setPhase(storedPhase);
    if (storedPhase === 'session') {
      setSessionStep(getDecisionChoice() ? 'rationale' : 'decide');
      setChoice(getDecisionChoice());
    }
  }, [brief.agendaId, reviewCount]);

  const handleStartDecision = () => {
    if (brief.primaryCtaKey === 'enterIdea' || brief.primaryCtaKey === 'startMeeting') {
      onPrimaryAction();
      return;
    }
    startDecisionSession(brief.agendaId);
    setPhase('session');
    setSessionStep('decide');
  };

  const handleChoice = (value: DecisionChoice) => {
    setChoice(value);
    saveDecisionChoice(brief.agendaId, value);

    const labels: Record<DecisionChoice, string> = {
      proceed: t('choices.proceedRecorded'),
      hold: t('choices.holdRecorded'),
      reinvestigate: t('choices.reinvestigateRecorded'),
    };
    onFounderDecision?.(labels[value]);
    setSessionStep('rationale');
  };

  const handleCloseMeeting = () => {
    finalizeMeetingClosed(brief.agendaId);
    setPhase('closed');
  };

  const handleNextMeeting = () => {
    const savedChoice = choice;
    resetDecisionSession();
    setPhase('brief');
    setSessionStep('decide');
    setChoice(null);
    if (savedChoice === 'proceed' || savedChoice === 'reinvestigate') {
      onPrimaryAction();
    }
  };

  if (phase === 'closed' && session) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="rounded-xl border border-primary/30 bg-primary/[0.06] px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t('meetingClosed.title')}
          </p>
          <p className="mt-3 text-lg font-semibold">{t('meetingClosed.todayComplete')}</p>

          <div className="mt-5 border-t border-border/40 pt-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('meetingClosed.changesTitle')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {session.closedChangeKeys.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {t(`meetingClosed.changes.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 border-t border-border/40 pt-4">
            <p className="text-xs text-muted-foreground">{t('meetingClosed.nextMeeting')}</p>
            <p className="mt-1 text-sm font-medium">
              {t(`nextMeeting.${session.nextMeetingAfterKey}`)}
            </p>
          </div>
        </div>
        {!readOnly ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg"
            onClick={handleNextMeeting}
          >
            {t('meetingClosed.dismiss')}
          </Button>
        ) : null}
      </div>
    );
  }

  if (phase === 'brief') {
    return (
      <div className={cn('space-y-5', className)}>
        <p className="text-sm leading-relaxed">{t('morningBrief.greeting')}</p>

        {brief.showApprovalQueue ? (
          <>
            <p className="text-sm text-muted-foreground">{t('morningBrief.researchSoFar')}</p>
            <p className="text-sm font-medium leading-relaxed">
              {t(`morningBrief.whyTodayLead.${brief.whyTodayLeadKey}`)}
            </p>

            <div className="rounded-xl border border-border/60 bg-background px-5 py-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                {t('morningBrief.whyNow')}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {brief.whyTodayReasonKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    <span>{t(`morningBrief.whyToday.${key}`)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                <span className="text-muted-foreground">{t('morningBrief.decisionEta')}</span>
                <span className="font-medium">
                  {t('morningBrief.decisionEtaValue', { minutes: brief.decisionEtaMinutes })}
                </span>
              </div>

              {!readOnly ? (
                <Button
                  type="button"
                  id="journey-section-next-action"
                  className="mt-4 w-full rounded-lg"
                  onClick={handleStartDecision}
                >
                  {t(`cta.${brief.primaryCtaKey}`)}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background px-5 py-5 shadow-sm">
            <p className="text-sm font-medium">{t('morningBrief.noDecisionYet')}</p>
            {!readOnly ? (
              <Button type="button" className="mt-4 w-full rounded-lg" onClick={handleStartDecision}>
                {t(`cta.${brief.primaryCtaKey}`)}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (!session) return null;

  if (sessionStep === 'rationale') {
    return (
      <div className={cn('space-y-5', className)}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('rationale.title')}
        </p>

        <ul className="space-y-2 text-sm leading-relaxed">
          {session.discoveries.map((id) => (
            <li key={id}>{t(`discoveries.${id}`)}</li>
          ))}
        </ul>

        {session.recommendationDetailKeys.map((key) => (
          <p key={key} className="text-sm text-muted-foreground">
            {t(`recommendation.sessionDetails.${key}`)}
          </p>
        ))}

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setDetailsOpen((v) => !v)}
        >
          {detailsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {t('rationale.detailsToggle')}
        </button>
        {detailsOpen ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {session.activityDetails.map((id) => (
              <li key={id}>
                <button type="button" className="hover:text-foreground" onClick={onShowEvidence}>
                  · {t(`activity.details.${id}`)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!readOnly ? (
          <Button type="button" className="w-full rounded-lg" onClick={handleCloseMeeting}>
            {t('rationale.closeMeeting')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="rounded-lg bg-primary/[0.06] px-4 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('recommendation.label')}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {t(`recommendation.short.${session.recommendationShortKey}`)}
        </p>
      </div>

      <div className="border-t border-border/40 pt-4">
        <p className="text-sm font-medium">{t('decisionSession.question')}</p>
        {!readOnly ? (
          <div className="mt-3 space-y-2" role="group" aria-label={t('decisionSession.question')}>
            {(['proceed', 'hold', 'reinvestigate'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-border/60 px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                onClick={() => handleChoice(value)}
              >
                <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/40" aria-hidden />
                {t(`choices.${value}`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
