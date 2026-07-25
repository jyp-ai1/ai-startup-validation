'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@repo/ui/lib/utils';

type LandingLazySectionProps = {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
  className?: string;
};

/** Mount below-fold landing sections only when near viewport — reduces initial JS + LCP cost. */
export function LandingLazySection({
  children,
  minHeight = 160,
  rootMargin = '240px 0px',
  className,
}: LandingLazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={visible ? undefined : { minHeight }}
    >
      {visible ? children : null}
    </div>
  );
}
