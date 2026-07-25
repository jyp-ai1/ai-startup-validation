'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Button, Input, Textarea } from '@repo/ui';

import { readGoalIntakeIdea } from '../lib/goal-intake-store';

export type ProjectRegistrationData = {
  projectName: string;
  ideaOneLiner: string;
  websiteUrl: string;
  targetMarket: string;
  optionalNote: string;
};

const STORAGE_KEY = 'll_project_registration';
const AUTOSAVE_MS = 400;

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

function deriveProjectName(idea: string, goalLabel: string): string {
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
  const existing = loadProjectRegistration();
  const intakeIdea = readGoalIntakeIdea();

  const [projectName, setProjectName] = useState(existing?.projectName ?? '');
  const [ideaOneLiner, setIdeaOneLiner] = useState(
    existing?.ideaOneLiner ?? intakeIdea ?? '',
  );
  const [websiteUrl, setWebsiteUrl] = useState(existing?.websiteUrl ?? '');
  const [targetMarket, setTargetMarket] = useState(existing?.targetMarket ?? '');
  const [optionalNote, setOptionalNote] = useState(existing?.optionalNote ?? '');

  const autosaveRef = useRef<number | null>(null);

  const canSubmit = ideaOneLiner.trim().length >= 4;
  const autoNamePreview =
    projectName.trim() || (ideaOneLiner.trim().length >= 4 ? deriveProjectName(ideaOneLiner, goalLabel) : '');

  useEffect(() => {
    if (autosaveRef.current !== null) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      if (!ideaOneLiner.trim() && !projectName.trim()) return;
      const draft: ProjectRegistrationData = {
        projectName: projectName.trim() || deriveProjectName(ideaOneLiner, goalLabel),
        ideaOneLiner: ideaOneLiner.trim(),
        websiteUrl: websiteUrl.trim(),
        targetMarket: targetMarket.trim(),
        optionalNote: optionalNote.trim(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveRef.current !== null) window.clearTimeout(autosaveRef.current);
    };
  }, [goalLabel, ideaOneLiner, optionalNote, projectName, targetMarket, websiteUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || disabled) return;
    const resolvedName = projectName.trim() || deriveProjectName(ideaOneLiner, goalLabel);
    const data: ProjectRegistrationData = {
      projectName: resolvedName,
      ideaOneLiner: ideaOneLiner.trim(),
      websiteUrl: websiteUrl.trim(),
      targetMarket: targetMarket.trim() || t('defaults.targetMarket', { goal: goalLabel }),
      optionalNote: optionalNote.trim(),
    };
    saveProjectRegistration(data);
    onStart(data);
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-8">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sparkles className="size-3.5" aria-hidden />
        {t('eyebrow')}
      </p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{t('title')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('desc')}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="idea-one-liner" className="text-sm font-medium">
            {t('fields.ideaOneLiner')}
          </label>
          <Textarea
            id="idea-one-liner"
            value={ideaOneLiner}
            onChange={(e) => setIdeaOneLiner(e.target.value)}
            placeholder={t('placeholders.ideaOneLiner')}
            rows={2}
            className="rounded-xl text-base"
            required
            minLength={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{t('quickHint')}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="project-name" className="text-sm font-medium text-muted-foreground">
            {t('fields.projectNameOptional')}
          </label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={autoNamePreview || t('placeholders.projectName')}
            className="h-11 rounded-xl"
          />
          {autoNamePreview ? (
            <p className="text-xs text-muted-foreground">
              {t('autoNameHint', { name: autoNamePreview })}
            </p>
          ) : null}
        </div>

        <details className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            {t('optionalDetails')}
          </summary>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="website-url" className="text-sm font-medium">
                {t('fields.websiteUrl')}
              </label>
              <Input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder={t('placeholders.websiteUrl')}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="target-market" className="text-sm font-medium">
                {t('fields.targetMarket')}
              </label>
              <Input
                id="target-market"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder={t('placeholders.targetMarket')}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="optional-note" className="text-sm font-medium">
                {t('fields.optionalNote')}
              </label>
              <Input
                id="optional-note"
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
                placeholder={t('placeholders.optionalNote')}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </details>

        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit || disabled}
          className="mt-2 h-14 w-full rounded-xl text-base font-semibold"
        >
          {t('cta')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('ctaHint')}</p>
      </form>
    </section>
  );
}
