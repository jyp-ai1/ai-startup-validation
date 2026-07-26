import { getTranslations } from 'next-intl/server';
import { ArrowDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LandingAiTeamSectionProps = {
  className?: string;
};

const ORG_ROLES = ['market', 'strategy', 'customer', 'execution', 'investment'] as const;
const TEAM_CARDS = ['aiPm', 'market', 'strategy', 'execution'] as const;

export async function LandingAiTeamSection({ className }: LandingAiTeamSectionProps) {
  const t = await getTranslations('landing.aiTeam');

  return (
    <section
      id="ai-team"
      className={cn('border-t border-border/60 py-16 sm:py-20', className)}
      aria-labelledby="ai-team-title"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="ai-team-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('desc')}
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3">
          <div className="rounded-2xl border border-border/70 bg-card px-6 py-4 text-center shadow-sm">
            <p className="text-lg font-semibold">{t('org.ceo')}</p>
          </div>
          <ArrowDown className="size-5 text-muted-foreground" aria-hidden />
          <div className="w-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background px-6 py-4 text-center">
            <p className="text-lg font-semibold text-primary">{t('org.aiPm')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('org.aiPmRole')}</p>
          </div>
          <ArrowDown className="size-5 text-muted-foreground" aria-hidden />
          <div className="flex flex-wrap justify-center gap-2">
            {ORG_ROLES.map((role) => (
              <span
                key={role}
                className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium sm:text-sm"
              >
                {t(`org.departments.${role}`)}
              </span>
            ))}
          </div>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {TEAM_CARDS.map((card) => (
            <li
              key={card}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
            >
              <p className="text-base font-semibold">{t(`cards.${card}.title`)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`cards.${card}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
