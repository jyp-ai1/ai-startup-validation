'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WatchCenterTriggerProps = {
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
};

export function WatchCenterTrigger({ unreadCount = 0, onClick, className }: WatchCenterTriggerProps) {
  const t = useTranslations('watch');

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn('relative hidden sm:inline-flex', className)}
      aria-label={t('trigger.label')}
      onClick={onClick}
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}

export function openWatchCenter(): void {
  window.dispatchEvent(new CustomEvent('launchlens:open-watch-center'));
}
