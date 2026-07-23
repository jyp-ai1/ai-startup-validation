'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ArrowRight, Bot, CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  completeOnboardingInterview,
  startOnboardingResearch,
} from '../actions/onboarding-actions';
import { buildResearchPlanItems } from '../services/onboarding-service';
import {
  ONBOARDING_CONCERNS,
  ONBOARDING_FINAL_GOALS,
  type OnboardingAnswers,
  type OnboardingConcern,
  type OnboardingFinalGoal,
  type OnboardingPhase,
} from '../types';

type OnboardingConsultantDialogProps = {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const INITIAL_ANSWERS: OnboardingAnswers = {
  validation: '',
  targetCustomer: '',
  competitors: '',
  concern: 'MARKET',
  finalGoal: 'STRATEGY',
};

export function OnboardingConsultantDialog({
  projectId,
  projectTitle,
  open,
  onOpenChange,
}: OnboardingConsultantDialogProps) {
  const t = useTranslations('onboardingConsultant');
  const { trackEvent } = useAnalytics();
  const [phase, setPhase] = useState<OnboardingPhase>('welcome');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const planItems = buildResearchPlanItems(answers);

  useEffect(() => {
    if (open && phase === 'welcome') {
      trackEvent(ANALYTICS_EVENTS.onboardingStart, { project_id: projectId, screen: '/dashboard' });
    }
  }, [open, phase, projectId, trackEvent]);

  useEffect(() => {
    if (phase === 'interview') {
      inputRef.current?.focus();
    }
  }, [phase, step]);

  const handleClose = useCallback(() => {
    if (phase === 'interview' && step > 1) {
      const confirmed = window.confirm(t('confirmClose'));
      if (!confirmed) return;
    }
    onOpenChange(false);
  }, [onOpenChange, phase, step, t]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  function updateAnswer<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function trackAnswer(stepNumber: number) {
    trackEvent(ANALYTICS_EVENTS.questionAnswer, {
      project_id: projectId,
      screen: '/dashboard',
      step: stepNumber,
    });
  }

  function goNextInterviewStep() {
    trackAnswer(step);
    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }
    setPhase('summary');
  }

  function handleInterviewKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && step !== 4 && step !== 5) {
      event.preventDefault();
      if (canProceedInterview()) goNextInterviewStep();
    }
  }

  function canProceedInterview(): boolean {
    if (step === 1) return answers.validation.trim().length > 0;
    if (step === 2) return answers.targetCustomer.trim().length > 0;
    if (step === 3) return true;
    return true;
  }

  function handleConfirmSummary() {
    startTransition(async () => {
      trackEvent(ANALYTICS_EVENTS.onboardingComplete, { project_id: projectId, screen: '/dashboard' });
      trackEvent(ANALYTICS_EVENTS.researchPlanGenerate, { project_id: projectId, screen: '/dashboard' });
      const result = await completeOnboardingInterview(projectId, answers);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setPhase('research_plan');
    });
  }

  function handleStartAi() {
    startTransition(async () => {
      setPhase('starting');
      const result = await startOnboardingResearch(projectId);
      if (result.error) {
        setError(result.error);
        setPhase('research_plan');
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {phase === 'welcome' ? (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="size-6" />
              </div>
              <DialogTitle>{t('welcome.title')}</DialogTitle>
              <DialogDescription className="whitespace-pre-line pt-2 text-left leading-relaxed">
                {t('welcome.body')}
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t('welcome.project', { project: projectTitle })}</p>
            <Button className="mt-4 w-full" onClick={() => setPhase('interview')}>
              {t('welcome.cta')}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </>
        ) : null}

        {phase === 'interview' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t(`questions.q${step}.title` as 'questions.q1.title')}</DialogTitle>
              <DialogDescription>{t(`questions.q${step}.hint` as 'questions.q1.hint')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4" onKeyDown={handleInterviewKeyDown}>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      step >= n ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                ))}
              </div>

              {step === 1 ? (
                <Textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={answers.validation}
                  onChange={(e) => updateAnswer('validation', e.target.value)}
                  placeholder={t('questions.q1.placeholder')}
                  rows={3}
                />
              ) : null}

              {step === 2 ? (
                <Input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={answers.targetCustomer}
                  onChange={(e) => updateAnswer('targetCustomer', e.target.value)}
                  placeholder={t('questions.q2.placeholder')}
                />
              ) : null}

              {step === 3 ? (
                <Input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={answers.competitors}
                  onChange={(e) => updateAnswer('competitors', e.target.value)}
                  placeholder={t('questions.q3.placeholder')}
                />
              ) : null}

              {step === 4 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ONBOARDING_CONCERNS.map((concern) => (
                    <button
                      key={concern}
                      type="button"
                      onClick={() => updateAnswer('concern', concern as OnboardingConcern)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        answers.concern === concern
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      {t(`concerns.${concern}` as 'concerns.MARKET')}
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 5 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ONBOARDING_FINAL_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => updateAnswer('finalGoal', goal as OnboardingFinalGoal)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                        answers.finalGoal === goal
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      {t(`goals.${goal}` as 'goals.STRATEGY')}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                >
                  {t('back')}
                </Button>
                <Button
                  type="button"
                  disabled={!canProceedInterview()}
                  onClick={goNextInterviewStep}
                >
                  {step === 5 ? t('review') : t('next')}
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {phase === 'summary' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('summary.title')}</DialogTitle>
              <DialogDescription>{t('summary.desc')}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line">
              {t('summary.intro')}
              {'\n\n'}
              <strong>{answers.validation}</strong>
              {'\n'}
              {t('summary.target', { target: answers.targetCustomer })}
              {'\n'}
              {t('summary.competitors', { competitors: answers.competitors || t('summary.unknown') })}
              {'\n'}
              {t('summary.concern', { concern: t(`concerns.${answers.concern}` as 'concerns.MARKET') })}
              {'\n'}
              {t('summary.goal', { goal: t(`goals.${answers.finalGoal}` as 'goals.STRATEGY') })}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPhase('interview')}>
                {t('edit')}
              </Button>
              <Button className="flex-1" disabled={pending} onClick={handleConfirmSummary}>
                {pending ? t('saving') : t('summary.confirm')}
              </Button>
            </div>
          </>
        ) : null}

        {phase === 'research_plan' || phase === 'starting' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                {t('plan.title')}
              </DialogTitle>
              <DialogDescription>{t('plan.desc')}</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2">
              {planItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border px-3 py-3 text-sm"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t(item.titleKey as 'plans.market.title')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(item.categoryKey as 'plans.market.category')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      item.priority === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-700'
                        : item.priority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.priority}
                  </span>
                </li>
              ))}
            </ul>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={pending} onClick={handleStartAi}>
              {pending ? t('plan.starting') : t('plan.start')}
              <CheckCircle2 className="ml-1 size-4" />
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
