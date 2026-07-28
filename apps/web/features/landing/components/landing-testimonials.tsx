'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

const TESTIMONIAL_KEYS = ['one', 'two', 'three'] as const;

type LandingTestimonialsProps = {
  className?: string;
};

export function LandingTestimonials({ className }: LandingTestimonialsProps) {
  const t = useTranslations('landing.testimonials');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((i) => (i + 1) % TESTIMONIAL_KEYS.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={cn('mx-auto max-w-2xl px-4', className)} aria-label={t('ariaLabel')}>
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        {TESTIMONIAL_KEYS.map((key, index) => (
          <blockquote
            key={key}
            className={cn(
              'transition-opacity duration-500',
              index === active ? 'opacity-100' : 'pointer-events-none absolute inset-6 opacity-0',
            )}
          >
            <div className="mb-3 flex gap-0.5" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'size-4',
                    i < (key === 'two' ? 4 : 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30',
                  )}
                />
              ))}
            </div>
            <p className="text-sm leading-relaxed">{t(`${key}.quote`)}</p>
            <footer className="mt-3 text-xs text-muted-foreground">{t(`${key}.role`)}</footer>
          </blockquote>
        ))}
        <div className="mt-6 flex justify-center gap-2">
          {TESTIMONIAL_KEYS.map((key, index) => (
            <button
              key={key}
              type="button"
              aria-label={t('dotLabel', { index: index + 1 })}
              onClick={() => setActive(index)}
              className={cn(
                'size-2 rounded-full transition-colors',
                index === active ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
