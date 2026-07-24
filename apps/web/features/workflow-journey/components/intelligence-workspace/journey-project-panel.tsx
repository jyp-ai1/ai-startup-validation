'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Plus } from 'lucide-react';

import type { MockProject } from '@/features/project-intelligence/constants/mock-projects';
import { Button, Input, toast } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { JourneyProjectSwitcher } from './journey-project-switcher';
import { JourneyProgressRing } from './journey-progress-ring';
import { useJourneyProject } from '../../hooks/use-journey-project';

type JourneyProjectPanelProps = {
  className?: string;
};

export function JourneyProjectPanel({ className }: JourneyProjectPanelProps) {
  const t = useTranslations('workflow.epic4.project');
  const { project, setProjectId, recentProjects, createProject, toggleFavorite } =
    useJourneyProject();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = createProject(trimmed);
    setProjectId(created.id);
    setName('');
    setCreating(false);
    toast.success(t('created'));
  };

  return (
    <div className={cn('space-y-6', className)}>
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <JourneyProjectSwitcher project={project} onSelect={setProjectId} />
            <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.goalLabel}</p>
          </div>
          <JourneyProgressRing value={project.confidence} label={t('confidence')} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => toggleFavorite(project.id)}
          >
            <Star
              className={cn(
                'size-4',
                project.isFavorite && 'fill-amber-400 text-amber-400',
              )}
              aria-hidden
            />
            {project.isFavorite ? t('unfavorite') : t('favorite')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setCreating((c) => !c)}
          >
            <Plus className="size-4" aria-hidden />
            {t('create')}
          </Button>
        </div>
        {creating ? (
          <div className="mt-4 flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="rounded-xl"
            />
            <Button type="button" className="rounded-xl" onClick={handleCreate}>
              {t('save')}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6">
        <h3 className="text-sm font-semibold">{t('recentTitle')}</h3>
        <ul className="mt-3 space-y-2">
          {recentProjects.map((p: MockProject) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setProjectId(p.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40',
                  p.id === project.id && 'border-primary/50 bg-primary/5',
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{p.confidence}%</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
