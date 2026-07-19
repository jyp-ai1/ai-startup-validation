'use client';

import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button, PageHeader } from '@repo/ui';

import { FeatureLinkCard } from '@/components/feature-link-card';
import { NAV_ITEM_CONFIGS } from '@/lib/navigation';

type DashboardHomeProps = {
  projectCount: number;
};

const FEATURE_ITEMS = NAV_ITEM_CONFIGS.filter(
  (item) => item.key !== 'dashboard' && item.key !== 'settings',
);

export function DashboardHome({ projectCount }: DashboardHomeProps) {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('dashboard.welcome')}
        description={t('dashboard.welcomeDesc')}
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t('dashboard.newProject')}
            </Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">{t('meta.appName')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.statusHint')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm">
              {t('dashboard.projectCount', { count: projectCount })}
            </span>
            <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm">
              {t('dashboard.featureCount', { count: FEATURE_ITEMS.length })}
            </span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.featuresTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.featuresDesc')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <FeatureLinkCard
                key={item.href}
                href={item.href}
                icon={Icon}
                title={t(item.labelKey)}
                description={t(item.descKey)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
