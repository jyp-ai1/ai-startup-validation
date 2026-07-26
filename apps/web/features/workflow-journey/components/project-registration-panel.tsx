'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button, Input } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { readGoalIntakeIdea } from '../lib/goal-intake-store';
import { getOnboardingFeedbackPhase } from '../lib/ai-pm-onboarding-feedback';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
  type FounderMicroAnswers,
} from '../lib/founder-micro-interaction-store';
import { AiPmOfficeChat, type AiPmChatMessage } from './ai-state/ai-pm-office-chat';

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

  const chatMessages = useMemo((): AiPmChatMessage[] => {
    if (step === 'customer') {
      return [
        { role: 'ai', text: tw('customerThanks') },
        { role: 'ai', text: tw('customerQuestion') },
      ];
    }
    if (step === 'ready') {
      return [
        { role: 'ai', text: tw('readyThanks') },
        { role: 'ai', text: tw('readyStartLead') },
        { role: 'ai', text: tw('readyDuration') },
        { role: 'ai', text: tw('readyNoMoreInput') },
      ];
    }

    const exampleKeys = ['1', '2', '3'] as const;
    const examples = exampleKeys.map((key) => t(`examples.${key}`)).join('\n');
    const messages: AiPmChatMessage[] = [
      { role: 'ai', text: tw('greeting') },
      { role: 'ai', text: `${tw('askIdea')}\n\n${tw('examplesDivider')}\n\n${examples}` },
    ];

    if (feedbackPhase === 'typing' || feedbackPhase === 'ready') {
      messages.push({ role: 'ai', text: tpm('typingFeedback') });
    }
    if (feedbackPhase === 'ready') {
      messages.push({ role: 'ai', text: tpm('readyFeedback') });
    }

    return messages;
  }, [feedbackPhase, step, t, tw, tpm]);

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

  const footer =
    step === 'idea' ? (
      <div className="space-y-3">
        <Input
          id="idea-one-liner"
          value={ideaOneLiner}
          onChange={(e) => setIdeaOneLiner(e.target.value)}
          placeholder={t('placeholders.4')}
          className="h-12 rounded-xl text-base"
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
    ) : step === 'customer' ? (
      <div className="space-y-3">
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
          className="w-full rounded-xl text-muted-foreground"
          onClick={() => setStep('ready')}
        >
          {tw('customerSkip')}
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        className="h-12 w-full rounded-xl font-semibold"
        onClick={handleStartAnalysis}
      >
        <Sparkles className="mr-2 size-4" aria-hidden />
        {t('cta')}
      </Button>
    );

  return <AiPmOfficeChat messages={chatMessages} footer={footer} />;
}
