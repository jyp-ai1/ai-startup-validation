'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Button, Input } from '@repo/ui';

import { readGoalIntakeIdea } from '../lib/goal-intake-store';
import {
  buildOnboardingMessageKeys,
  getOnboardingFeedbackPhase,
} from '../lib/ai-pm-onboarding-feedback';
import { AiPmConversation } from './ai-state/ai-pm-conversation';

export type ProjectRegistrationData = {
  projectName: string;
  ideaOneLiner: string;
  websiteUrl: string;
  targetMarket: string;
  optionalNote: string;
};

const STORAGE_KEY = 'll_project_registration';
const AUTOSAVE_MS = 400;
const PLACEHOLDER_COUNT = 5;
const PLACEHOLDER_ROTATE_MS = 3500;

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

export function ProjectRegistrationPanel({
  goalLabel,
  onStart,
  disabled,
}: ProjectRegistrationPanelProps) {
  const t = useTranslations('workflow.registration');
  const tpm = useTranslations('workflow.aiPm.registration');
  const existing = loadProjectRegistration();
  const intakeIdea = readGoalIntakeIdea();

  const [ideaOneLiner, setIdeaOneLiner] = useState(
    existing?.ideaOneLiner ?? intakeIdea ?? '',
  );
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [savedHint, setSavedHint] = useState(false);

  const autosaveRef = useRef<number | null>(null);

  const canSubmit = ideaOneLiner.trim().length >= 4;
  const feedbackPhase = getOnboardingFeedbackPhase(ideaOneLiner.trim().length);

  const onboardingMessages = useMemo(() => {
    const keys = buildOnboardingMessageKeys(feedbackPhase);
    const exampleKeys = ['1', '2', '3'] as const;
    const examples = exampleKeys.map((key) => `› ${t(`examples.${key}`)}`).join('\n');

    return keys.map((key) => {
      if (key === 'askIdea') {
        return `${tpm('askIdea')}\n\n${tpm('examplesIntro')}\n\n${examples}`;
      }
      return tpm(key);
    });
  }, [feedbackPhase, t, tpm]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_COUNT);
    }, PLACEHOLDER_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

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
      setSavedHint(true);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveRef.current !== null) window.clearTimeout(autosaveRef.current);
    };
  }, [existing?.optionalNote, existing?.targetMarket, existing?.websiteUrl, goalLabel, ideaOneLiner, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || disabled) return;
    const data: ProjectRegistrationData = {
      projectName: deriveProjectName(ideaOneLiner),
      ideaOneLiner: ideaOneLiner.trim(),
      websiteUrl: existing?.websiteUrl ?? '',
      targetMarket: existing?.targetMarket ?? t('defaults.targetMarket', { goal: goalLabel }),
      optionalNote: existing?.optionalNote ?? '',
    };
    saveProjectRegistration(data);
    onStart(data);
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-8">
      <AiPmConversation messages={onboardingMessages} className="mb-6" />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="idea-one-liner" className="sr-only">
            {t('inputLabel')}
          </label>
          <Input
            id="idea-one-liner"
            value={ideaOneLiner}
            onChange={(e) => setIdeaOneLiner(e.target.value)}
            placeholder={t(`placeholders.${placeholderIndex + 1}`)}
            className="h-12 rounded-xl border-dashed text-base"
            required
            minLength={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {savedHint && ideaOneLiner.trim().length >= 4 ? t('savedHint') : t('inputLabel')}
          </p>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5 text-center">
          <p className="text-base font-semibold sm:text-lg">{t('ctaTitle')}</p>
          <p className="mt-1 text-sm font-medium tabular-nums text-primary">{t('ctaDuration')}</p>
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || disabled}
            className="mt-4 h-14 w-full rounded-xl text-base font-semibold"
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {t('cta')}
          </Button>
          <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {t('ctaSub')}
          </p>
        </div>
      </form>
    </section>
  );
}
