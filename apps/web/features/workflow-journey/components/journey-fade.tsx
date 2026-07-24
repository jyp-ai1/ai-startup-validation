'use client';

import { cn } from '@repo/ui/lib/utils';

type JourneyFadeProps = {
  children: React.ReactNode;
  className?: string;
};

/** Route/content fade-in ~200ms (Epic 1.6). */
export function JourneyFade({ children, className }: JourneyFadeProps) {
  return (
    <div
      className={cn(className)}
      style={{
        animation: 'journeyFadeIn 0.2s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes journeyFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {children}
    </div>
  );
}
