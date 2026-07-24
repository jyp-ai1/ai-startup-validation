'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

import {
  createProjectFromWizard,
  type WizardActionState,
} from '@/features/activation/actions/wizard-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { PROJECT_GOALS } from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const WIZARD_TYPES = [
  { id: 'STARTUP', labelKey: 'typeStartup' },
  { id: 'BUSINESS_STRATEGY', labelKey: 'typeStrategy' },
  { id: 'AI_INITIATIVE', labelKey: 'typeAi' },
] as const;

const initialState: WizardActionState = {};

export function ProjectWizard() {
  const t = useTranslations('activation.wizard');
  const { trackEvent } = useAnalytics();
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState<string>('STARTUP');
  const [projectGoal, setProjectGoal] = useState<string>('MARKET_VALIDATION');
  const [state, formAction, pending] = useActionState(createProjectFromWizard, initialState);

  function nextStep() {
    setStep((s) => Math.min(3, s + 1));
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('desc')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('timeEstimate')}</p>
      </div>

      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn(
              'flex size-8 items-center justify-center rounded-full text-xs font-semibold',
              step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {step > n ? <CheckCircle2 className="size-4" /> : n}
          </div>
        ))}
      </div>

      <form
        action={formAction}
        onSubmit={() => {
          trackEvent(ANALYTICS_EVENTS.wizardComplete, { screen: '/dashboard' });
          trackEvent(ANALYTICS_EVENTS.projectCreate, { screen: '/dashboard' });
        }}
        className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:p-8"
      >
        <input type="hidden" name="projectType" value={projectType} />
        <input type="hidden" name="projectGoal" value={projectGoal} />

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('step1Title')}</h2>
            <div className="grid gap-3">
              {WIZARD_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setProjectType(type.id)}
                  className={cn(
                    'rounded-xl border px-4 py-4 text-left transition-colors',
                    projectType === type.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <p className="font-medium">{t(type.labelKey)}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('step2Title')}</h2>
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">{t('projectName')}</label>
              <Input id="title" name="title" required placeholder={t('projectNamePlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="industry" className="text-sm font-medium">
                {t('industry')} <span className="text-muted-foreground">({t('optional')})</span>
              </label>
              <Input id="industry" name="industry" placeholder={t('industryPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium">
                {t('country')} <span className="text-muted-foreground">({t('optional')})</span>
              </label>
              <Input id="country" name="country" placeholder={t('countryPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="summary" className="text-sm font-medium">
                {t('description')} <span className="text-muted-foreground">({t('optional')})</span>
              </label>
              <Textarea id="summary" name="summary" rows={3} placeholder={t('descriptionPlaceholder')} />
            </div>
            <div className="space-y-2">
              <label htmlFor="targetCustomer" className="text-sm font-medium">
                {t('targetCustomer')} <span className="text-muted-foreground">({t('optional')})</span>
              </label>
              <Input id="targetCustomer" name="targetCustomer" placeholder={t('targetPlaceholder')} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('step3Title')}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROJECT_GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setProjectGoal(goal)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                    projectGoal === goal
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  {t(`goal.${goal}` as 'goal.MARKET_VALIDATION')}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ArrowLeft className="mr-1 size-4" />
              {t('back')}
            </Button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              {t('next')}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? t('creating') : t('create')}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
