'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { trackProductEvent, PRODUCT_ANALYTICS_EVENTS } from '@/lib/analytics/product-analytics';
import { Button, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const STORAGE_KEY = 'll_goal_intake';
const REFINEMENT_KEYS = ['problem', 'customer', 'market'] as const;
type RefinementKey = (typeof REFINEMENT_KEYS)[number];

type GoalIntakePanelProps = {
  className?: string;
};

type IntakeState = {
  idea: string;
  chips: RefinementKey[];
};

function readIntake(): IntakeState {
  if (typeof window === 'undefined') return { idea: '', chips: [] };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { idea: '', chips: [] };
    const parsed = JSON.parse(raw) as Partial<IntakeState>;
    return {
      idea: parsed.idea ?? '',
      chips: Array.isArray(parsed.chips)
        ? parsed.chips.filter((c): c is RefinementKey =>
            REFINEMENT_KEYS.includes(c as RefinementKey),
          )
        : [],
    };
  } catch {
    return { idea: '', chips: [] };
  }
}

function writeIntake(state: IntakeState) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function GoalIntakePanel({ className }: GoalIntakePanelProps) {
  const t = useTranslations('workflow.goal.intake');
  const [idea, setIdea] = useState('');
  const [chips, setChips] = useState<RefinementKey[]>([]);
  const [refined, setRefined] = useState(false);

  useEffect(() => {
    const saved = readIntake();
    setIdea(saved.idea);
    setChips(saved.chips);
    setRefined(saved.idea.trim().length > 0 && saved.chips.length > 0);
  }, []);

  const preview = useMemo(() => {
    if (!idea.trim() || chips.length === 0) return null;
    const parts = chips.map((key) => t(`refinement.${key}`));
    return t('refinedPreview', { idea: idea.trim(), focus: parts.join(' · ') });
  }, [chips, idea, t]);

  const persist = useCallback((nextIdea: string, nextChips: RefinementKey[]) => {
    writeIntake({ idea: nextIdea, chips: nextChips });
  }, []);

  const toggleChip = (key: RefinementKey) => {
    setChips((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      persist(idea, next);
      if (idea.trim() && next.length > 0 && !refined) {
        setRefined(true);
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.goalIntakeRefined, {
          action_key: key,
        });
      }
      return next;
    });
  };

  const handleIdeaChange = (value: string) => {
    setIdea(value);
    persist(value, chips);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Brain className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
          <p className="mt-1 text-base font-semibold leading-relaxed text-foreground">{t('prompt')}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label htmlFor="goal-intake-idea" className="sr-only">
          {t('ideaLabel')}
        </label>
        <Textarea
          id="goal-intake-idea"
          value={idea}
          onChange={(e) => handleIdeaChange(e.target.value)}
          placeholder={t('ideaPlaceholder')}
          rows={3}
          className="rounded-xl text-sm"
        />
        <p className="text-xs font-medium text-muted-foreground">{t('chipLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {REFINEMENT_KEYS.map((key) => {
            const active = chips.includes(key);
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="rounded-full"
                aria-pressed={active}
                onClick={() => toggleChip(key)}
              >
                {t(`chips.${key}`)}
              </Button>
            );
          })}
        </div>
      </div>

      {preview ? (
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-foreground motion-safe:animate-in motion-safe:fade-in"
          role="status"
          aria-live="polite"
        >
          <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          <p>{preview}</p>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>{t('hint')}</p>
        </div>
      )}
    </div>
  );
}
