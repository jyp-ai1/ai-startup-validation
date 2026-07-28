'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { AppAuthUser } from '@/lib/auth/server-auth';
import { signOutAndRedirect } from '@/lib/auth/client-sign-out';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type JourneyGlobalNavProps = {
  user?: AppAuthUser | null;
};

const LINKS = [
  { href: '/', key: 'home' as const },
  { href: '/validation', key: 'workspace' as const },
  { href: '/demo/enter', key: 'demo' as const },
] as const;

export function JourneyGlobalNav({ user = null }: JourneyGlobalNavProps) {
  const pathname = usePathname();
  const t = useTranslations('workflow.journey.globalNav');
  const tAuth = useTranslations('auth');

  return (
    <nav
      className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
      aria-label={t('label')}
    >
      {LINKS.map(({ href, key }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t(key)}
          </Link>
        );
      })}
      {user ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs sm:text-sm"
          onClick={() => void signOutAndRedirect()}
        >
          {tAuth('signOut')}
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs sm:text-sm" asChild>
          <Link href="/auth/login?next=/validation">{tAuth('signIn')}</Link>
        </Button>
      )}
    </nav>
  );
}
