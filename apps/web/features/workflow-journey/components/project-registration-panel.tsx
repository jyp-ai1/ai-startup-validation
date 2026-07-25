'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Button, Input, Textarea } from '@repo/ui';

export type ProjectRegistrationData = {
  projectName: string;
  ideaOneLiner: string;
  websiteUrl: string;
  targetMarket: string;
  optionalNote: string;
};

const STORAGE_KEY = 'll_project_registration';

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

type ProjectRegistrationPanelProps = {
  onStart: (data: ProjectRegistrationData) => void;
  disabled?: boolean;
};

export function ProjectRegistrationPanel({ onStart, disabled }: ProjectRegistrationPanelProps) {
  const t = useTranslations('workflow.registration');
  const existing = loadProjectRegistration();
  const [projectName, setProjectName] = useState(existing?.projectName ?? '');
  const [ideaOneLiner, setIdeaOneLiner] = useState(existing?.ideaOneLiner ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(existing?.websiteUrl ?? '');
  const [targetMarket, setTargetMarket] = useState(existing?.targetMarket ?? '');
  const [optionalNote, setOptionalNote] = useState(existing?.optionalNote ?? '');

  const canSubmit = projectName.trim().length >= 2 && ideaOneLiner.trim().length >= 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || disabled) return;
    const data: ProjectRegistrationData = {
      projectName: projectName.trim(),
      ideaOneLiner: ideaOneLiner.trim(),
      websiteUrl: websiteUrl.trim(),
      targetMarket: targetMarket.trim(),
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
          <label htmlFor="project-name" className="text-sm font-medium">
            {t('fields.projectName')}
          </label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t('placeholders.projectName')}
            className="h-11 rounded-xl"
            required
            minLength={2}
          />
        </div>
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
            className="rounded-xl"
            required
            minLength={4}
          />
        </div>
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
        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit || disabled}
          className="mt-2 h-14 w-full rounded-xl text-base font-semibold"
        >
          {t('cta')}
        </Button>
      </form>
    </section>
  );
}
