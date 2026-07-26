'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { cn } from '@repo/ui/lib/utils';

type V2WorkspaceHomeHeaderProps = {
  className?: string;
};

export function V2WorkspaceHomeHeader({ className }: V2WorkspaceHomeHeaderProps) {
  const t = useTranslations('workflow.v2.home');

  return (
    <header className={cn('border-b border-border/60 bg-background/95 backdrop-blur', className)}>
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/workspaces" className="text-sm font-semibold tracking-tight">
          {t('nav.workspace')}
        </Link>
        <nav className="flex items-center gap-4 text-sm" aria-label={t('nav.aria')}>
          <Link href="/who" className="font-medium text-primary hover:underline">
            {t('nav.newProject')}
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-foreground">
            {t('nav.settings')}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
