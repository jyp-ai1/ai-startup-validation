'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button, Input } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { readGoalIntakeIdea } from '../lib/goal-intake-store';
import {
  getOnboardingFeedbackPhase,
} from '../lib/ai-pm-onboarding-feedback';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
  type FounderMicroAnswers,
} from '../lib/founder-micro-interaction-store';
import { AiPmConversation } from './ai-state/ai-pm-conversation';
import { FounderInformationBuilder } from './founder-ai-pm/founder-information-builder';

export type ProjectRegistrationData = {
  projectName: string;
  ideaOneLiner: string;
  websiteUrl: string;
  targetMarket: string;
  optionalNote: string;
};

const STORAGE_KEY = 'll_project_registration';
const AUTOSAVE_MS = 400;

type WizardStep = 'idea' | 'customer' | 'ready';

export function loadProjectRegistration(): ProjectRegistrationData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectRegistrationData;
  } catch {
    return null;
  }
}

export function saveProjectRegistration(data: ProjectRegistrationData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  sessionStorage.setItem('ll_project_started', '1');
}

function deriveProjectName(idea: string): string {
  const trimmed = idea.trim();
  if (trimmed.length <= 36) return trimmed;
  return `${trimmed.slice(0, 33).trim()}…`;
}

type ProjectRegistrationPanelProps = {
  goalLabel: string;
  onStart: (data: ProjectRegistrationData) => void;
  disabled?: boolean;
};

const CUSTOMER_OPTIONS = ['office', 'student', 'enterprise', 'unknown'] as const;

export function ProjectRegistrationPanel({
  goalLabel,
  onStart,
  disabled,
}: ProjectRegistrationPanelProps) {
  const t = useTranslations('workflow.registration');
  const tw = useTranslations('workflow.registration.wizard');
  const tpm = useTranslations('workflow.aiPm.registration');
  const existing = loadProjectRegistration();
  const intakeIdea = readGoalIntakeIdea();

  const [step, setStep] = useState<WizardStep>('idea');
  const [ideaOneLiner, setIdeaOneLiner] = useState(
    existing?.ideaOneLiner ?? intakeIdea ?? '',
  );
  const [customer, setCustomer] = useState<FounderMicroAnswers['targetCustomer']>(
    loadFounderMicroAnswers().targetCustomer,
  );

  const autosaveRef = useRef<number | null>(null);
  const canContinueIdea = ideaOneLiner.trim().length >= 4;
  const feedbackPhase = getOnboardingFeedbackPhase(ideaOneLiner.trim().length);

  const ideaMessages = useMemo(() => {
    const exampleKeys = ['1', '2', '3'] as const;
    const examples = exampleKeys.map((key) => t(`examples.${key}`)).join('\n');
    const keys: Array<'greeting' | 'askIdea' | 'oneLineEnough' | 'typingFeedback' | 'readyFeedback'> =
      ['greeting', 'askIdea'];

    if (feedbackPhase === 'typing' || feedbackPhase === 'ready') {
      keys.push('typingFeedback');
    }
    if (feedbackPhase === 'ready') {
      keys.push('readyFeedback');
    }

    return keys.map((key) => {
      if (key === 'askIdea') {
        return `${tw('askIdea')}\n\n${tw('examplesDivider')}\n\n${examples}`;
      }
      if (key === 'greeting') return tw('greeting');
      if (key === 'oneLineEnough') return tpm('oneLineEnough');
      if (key === 'typingFeedback') return tpm('typingFeedback');
      return tpm('readyFeedback');
    });
  }, [feedbackPhase, t, tw, tpm]);

  useEffect(() => {
    if (autosaveRef.current !== null) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      if (!ideaOneLiner.trim()) return;
      const draft: ProjectRegistrationData = {
        projectName: deriveProjectName(ideaOneLiner),
        ideaOneLiner: ideaOneLiner.trim(),
        websiteUrl: existing?.websiteUrl ?? '',
        targetMarket: existing?.targetMarket ?? t('defaults.targetMarket', { goal: goalLabel }),
        optionalNote: existing?.optionalNote ?? '',
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveRef.current !== null) window.clearTimeout(autosaveRef.current);
    };
  }, [existing?.optionalNote, existing?.targetMarket, existing?.websiteUrl, goalLabel, ideaOneLiner, t]);

  const buildData = (): ProjectRegistrationData => ({
    projectName: deriveProjectName(ideaOneLiner),
    ideaOneLiner: ideaOneLiner.trim(),
    websiteUrl: existing?.websiteUrl ?? '',
    targetMarket: existing?.targetMarket ?? t('defaults.targetMarket', { goal: goalLabel }),
    optionalNote: existing?.optionalNote ?? '',
  });

  const handleStartAnalysis = () => {
    if (!canContinueIdea || disabled) return;
    saveProjectRegistration(buildData());
    onStart(buildData());
  };

  const handleCustomerSelect = (value: NonNullable<FounderMicroAnswers['targetCustomer']>) => {
    saveFounderMicroAnswer('targetCustomer', value);
    setCustomer(value);
    setStep('ready');
  };

  const aiWillDoKeys = ['market', 'competitor', 'viability', 'today'] as const;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-8">
      {step === 'idea' ? (
        <>
          <AiPmConversation messages={ideaMessages} className="mb-6" />
          <div className="space-y-4">
            <Input
              id="idea-one-liner"
              value={ideaOneLiner}
              onChange={(e) => setIdeaOneLiner(e.target.value)}
              placeholder={t('placeholders.4')}
              className="h-12 rounded-xl border-dashed text-base"
              autoFocus
            />
            <Button
              type="button"
              size="lg"
              disabled={!canContinueIdea || disabled}
              className="h-12 w-full rounded-xl"
              onClick={() => setStep('customer')}
            >
              {tw('nextStep')}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </>
      ) : null}

      {step === 'customer' ? (
        <>
          <AiPmConversation messages={[tw('customerThanks'), tw('customerQuestion')]} className="mb-6" />
          <div className="grid grid-cols-2 gap-2">
            {CUSTOMER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleCustomerSelect(option)}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                  customer === option
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border/70 hover:border-primary/40',
                )}
              >
                {tw(`customerOptions.${option}`)}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full rounded-xl text-muted-foreground"
            onClick={() => setStep('ready')}
          >
            {tw('customerSkip')}
          </Button>
        </>
      ) : null}

      {step === 'ready' ? (
        <>
          <AiPmConversation
            messages={[tw('readyThanks'), tw('readyStartLead'), tw('readyDuration')]}
            className="mb-6"
          />
          <FounderInformationBuilder className="mb-6" />
          <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5 text-center">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {tw('readyNoMoreInput')}
            </p>
            <p className="mt-4 text-base font-semibold sm:text-lg">{t('ctaTitle')}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground" role="list">
              {aiWillDoKeys.map((key) => (
                <li key={key}>{t(`aiWillDo.${key}`)}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium tabular-nums text-primary">{t('ctaDuration')}</p>
            <Button
              type="button"
              size="lg"
              disabled={disabled}
              className="mt-4 h-14 w-full rounded-xl text-base font-semibold"
              onClick={handleStartAnalysis}
            >
              <Sparkles className="mr-2 size-4" aria-hidden />
              {t('cta')}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
