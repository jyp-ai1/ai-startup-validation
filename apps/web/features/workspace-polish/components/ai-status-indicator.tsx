'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bot, FileText, Loader2, Search } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

export type AiStatus = 'idle' | 'researching' | 'generating_report' | 'analyzing';

type AiStatusIndicatorProps = {
  className?: string;
};

function statusFromPath(pathname: string): AiStatus {
  if (pathname.includes('/research') || pathname.includes('/agent')) return 'researching';
  if (pathname.includes('/report') || pathname.includes('/executive-report')) return 'generating_report';
  if (pathname.includes('/decision')) return 'analyzing';
  return 'idle';
}

export function AiStatusIndicator({ className }: AiStatusIndicatorProps) {
  const pathname = usePathname();
  const t = useTranslations('polish.aiStatus');
  const [override, setOverride] = useState<AiStatus | null>(null);

  const status = override ?? statusFromPath(pathname);

  useEffect(() => {
    function onStatus(event: Event) {
      const detail = (event as CustomEvent<{ status: AiStatus }>).detail;
      if (detail?.status) setOverride(detail.status);
    }

    window.addEventListener('launchlens:ai-status', onStatus);
    return () => window.removeEventListener('launchlens:ai-status', onStatus);
  }, []);

  useEffect(() => {
    if (override && override !== 'idle') {
      const timer = window.setTimeout(() => setOverride(null), 8000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [override, pathname]);

  const icon = useMemo(() => {
    switch (status) {
      case 'researching':
        return Search;
      case 'generating_report':
        return FileText;
      case 'analyzing':
        return Loader2;
      default:
        return Bot;
    }
  }, [status]);

  const Icon = icon;
  const isActive = status !== 'idle';

  return (
    <div
      className={cn(
        'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium md:inline-flex',
        isActive
          ? 'border-primary/30 bg-primary/5 text-primary'
          : 'border-border/60 bg-muted/30 text-muted-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={t(status)}
    >
      <Icon className={cn('size-3.5', status === 'analyzing' && 'motion-safe:animate-spin')} />
      <span>{t(status)}</span>
    </div>
  );
}

export function setAiStatus(status: AiStatus): void {
  window.dispatchEvent(new CustomEvent('launchlens:ai-status', { detail: { status } }));
}
