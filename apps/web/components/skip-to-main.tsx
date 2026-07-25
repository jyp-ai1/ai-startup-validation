'use client';

import { useTranslations } from 'next-intl';

export function SkipToMainLink() {
  const t = useTranslations('common');

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t('skipToMain')}
    </a>
  );
}
