'use client';

import { useTranslations } from 'next-intl';

import { ThemeToggle } from '@repo/ui';

type WorkspaceSettingsPanelProps = {
  projectName?: string;
  idea?: string;
};

export function WorkspaceSettingsPanel({ projectName, idea }: WorkspaceSettingsPanelProps) {
  const t = useTranslations('workflow.epic3.settingsPanel');

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold">{t('profile')}</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('projectName')}</dt>
            <dd className="font-medium">{projectName ?? '—'}</dd>
          </div>
          {idea ? (
            <div>
              <dt className="text-muted-foreground">{t('idea')}</dt>
              <dd>{idea}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold">{t('appearance')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('themeDesc')}</p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-sm font-semibold">{t('feedback')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('feedbackDesc')}</p>
      </section>
    </div>
  );
}
