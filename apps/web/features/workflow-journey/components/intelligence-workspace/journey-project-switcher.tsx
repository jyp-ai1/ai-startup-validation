'use client';

import { Archive, ChevronDown, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MOCK_PROJECTS, type MockProject } from '@/features/project-intelligence/constants/mock-projects';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type JourneyProjectSwitcherProps = {
  project: MockProject;
  onSelect: (id: string) => void;
};

export function JourneyProjectSwitcher({ project, onSelect }: JourneyProjectSwitcherProps) {
  const t = useTranslations('workflow.epic3.project');

  const active = MOCK_PROJECTS.filter((p) => p.status !== 'archived');
  const archived = MOCK_PROJECTS.filter((p) => p.status === 'archived');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 max-w-full justify-between gap-2 rounded-xl border-border/70 px-3 font-normal sm:min-w-[220px]"
          aria-label={t('switchLabel')}
        >
          <span className="flex min-w-0 items-center gap-2">
            {project.isFavorite ? (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            ) : null}
            <span className="truncate text-sm font-medium">{project.name}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t('recent')}</DropdownMenuLabel>
        {active.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn('flex flex-col items-start gap-0.5', p.id === project.id && 'bg-muted')}
          >
            <span className="flex items-center gap-1.5 font-medium">
              {p.isFavorite ? (
                <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              ) : null}
              {p.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('confidence', { value: p.confidence })} · {p.verdict}
            </span>
          </DropdownMenuItem>
        ))}
        {archived.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Archive className="size-3.5" aria-hidden />
              {t('archived')}
            </DropdownMenuLabel>
            {archived.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => onSelect(p.id)} className="text-muted-foreground">
                {p.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
