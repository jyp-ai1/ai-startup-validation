'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Sparkles } from 'lucide-react';

import { Button, Input } from '@repo/ui';

import { readGoalIntakeIdea } from '../lib/goal-intake-store';
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

  const exampleKeys = ['1', '2', '3'] as const;
  const aiWillDoKeys = ['market', 'competitor', 'viability', 'today'] as const;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-8">
      <AiPmConversation
        messages={[tpm('greeting'), tpm('intro'), tpm('askIdea')]}
        className="mb-6"
      />

      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          {t('taskLabel')}
        </p>
        <p className="mt-2 text-base font-semibold sm:text-lg">{t('taskTitle')}</p>

        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground" role="list">
          {exampleKeys.map((key) => (
            <li key={key} className="flex gap-2">
              <span aria-hidden>›</span>
              <span>{t(`examples.${key}`)}</span>
            </li>
          ))}
        </ul>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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

          <div className="rounded-xl bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">{t('aiWillDo.label')}</p>
            <ul className="mt-2 space-y-1.5" role="list">
              {aiWillDoKeys.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                  {t(`aiWillDo.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || disabled}
            className="h-14 w-full rounded-xl text-base font-semibold"
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {t('cta')}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('ctaHint')}</p>
        </form>
      </div>
    </section>
  );
}
