'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { cn } from '@repo/ui/lib/utils';

import { savePersonaAction } from '../../actions/journey-actions';
import { useSubmitLock } from '../../hooks/use-submit-lock';
import { V2_PERSONA_IDS, type V2PersonaId } from '../../types/v2-persona';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

type PersonaSelectionViewProps = {
  demoMode?: boolean;
  user?: AppAuthUser | null;
  projectId?: string;
};

export function PersonaSelectionView({
  demoMode: _demoMode = false,
  user = null,
  projectId,
}: PersonaSelectionViewProps) {
  const t = useTranslations('workflow.v2.persona');
  const router = useRouter();
  const { locked, lock, resetLock } = useSubmitLock(12_000);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSelect = useCallback(
    async (personaId: V2PersonaId) => {
      if (locked) return;
      lock();
      const result = await savePersonaAction(personaId);
      if (!result.ok) {
        resetLock();
        return;
      }
      const next = projectId
        ? `/workspace?project=${encodeURIComponent(projectId)}`
        : '/workspace';
      router.push(next);
    },
    [lock, locked, projectId, resetLock, router],
  );

  return (
    <JourneyLayout phase="goal" width="default" versionLabel="V2" user={user}>
      <V2JourneyStack
        embedded
        main={
          <div className="space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">{t('lead')}</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
            </div>
            <ul className="space-y-3" role="list">
              {V2_PERSONA_IDS.map((personaId, index) => {
                const focused = focusedIndex === index;
                return (
                  <li key={personaId}>
                    <button
                      ref={(el) => {
                        cardRefs.current[index] = el;
                      }}
                      type="button"
                      disabled={locked}
                      onClick={() => void handleSelect(personaId)}
                      onFocus={() => setFocusedIndex(index)}
                      className={cn(
                        'group flex w-full gap-4 rounded-2xl border bg-card p-5 text-left transition-colors',
                        'hover:border-primary/40 hover:bg-primary/[0.03]',
                        focused ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border/70',
                        locked && 'pointer-events-none opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1 size-5 shrink-0 rounded-full border-2 transition-colors',
                          focused
                            ? 'border-primary bg-primary/10'
                            : 'border-muted-foreground/35 group-hover:border-primary/50',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <p className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                          {t(`cards.${personaId}.question`)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                          {t(`cards.${personaId}.context`)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground/90">
                          {t(`cards.${personaId}.hint`)}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          {t('selectCta')}
                          <ArrowRight className="size-4" aria-hidden />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-sm text-muted-foreground">{t('nextHint')}</p>
          </div>
        }
      />
    </JourneyLayout>
  );
}
