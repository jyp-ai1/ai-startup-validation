'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

export function OfflineStatusBanner() {
  const t = useTranslations('errors.offline');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-4 left-1/2 z-[150] flex w-[min(92vw,420px)] -translate-x-1/2 items-center gap-2',
        'rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm shadow-lg backdrop-blur-sm',
      )}
    >
      <WifiOff className="size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
      <span>{t('banner')}</span>
    </div>
  );
}
