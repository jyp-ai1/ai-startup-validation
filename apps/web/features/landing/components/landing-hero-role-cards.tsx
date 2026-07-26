import { getTranslations } from 'next-intl/server';

import { cn } from '@repo/ui/lib/utils';

type LandingHeroRoleCardsProps = {
  className?: string;
};

const ROLES = ['research', 'strategy', 'judgment', 'execution'] as const;

export async function LandingHeroRoleCards({ className }: LandingHeroRoleCardsProps) {
  const t = await getTranslations('landing.roleCards');

  return (
    <section className={cn('mt-12 sm:mt-16', className)} aria-labelledby="role-cards-title">
      <h2 id="role-cards-title" className="text-center text-lg font-semibold sm:text-xl">
        {t('title')}
      </h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="list">
        {ROLES.map((role) => (
          <li
            key={role}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-2xl" aria-hidden>
              {t(`items.${role}.icon`)}
            </p>
            <p className="mt-3 text-base font-semibold">{t(`items.${role}.title`)}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {t(`items.${role}.desc`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
