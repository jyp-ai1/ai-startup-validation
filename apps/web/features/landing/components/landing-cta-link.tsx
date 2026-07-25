'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { buttonVariants } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type LandingCtaLinkProps = {
  href: string;
  event: 'cta_start' | 'cta_demo';
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'lg' | 'sm';
  className?: string;
};

export function LandingCtaLink({
  href,
  event,
  children,
  variant = 'default',
  size = 'lg',
  className,
}: LandingCtaLinkProps) {
  const { trackEvent } = useAnalytics();

  function handleClick() {
    if (event === 'cta_start') {
      trackEvent(ANALYTICS_EVENTS.landingStartClick, { screen: '/', destination: href });
      trackEvent(ANALYTICS_EVENTS.ctaStart, { screen: '/', destination: href });
    } else {
      trackEvent(ANALYTICS_EVENTS.ctaDemo, { screen: '/', destination: href });
    }
  }

  return (
    <Link
      href={href}
      prefetch={href === '/goal' || href.startsWith('/goal')}
      onClick={handleClick}
      className={cn(buttonVariants({ variant, size }), 'inline-flex items-center gap-2', className)}
    >
      {children}
    </Link>
  );
}
