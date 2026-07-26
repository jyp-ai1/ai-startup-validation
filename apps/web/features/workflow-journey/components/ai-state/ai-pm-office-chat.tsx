'use client';

import type { ReactNode } from 'react';

import { cn } from '@repo/ui/lib/utils';

import { AiPmMessage } from './ai-pm-conversation';

export type AiPmChatMessage = {
  role: 'ai' | 'founder';
  text: string;
};

type AiPmOfficeChatProps = {
  messages: AiPmChatMessage[];
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Center column — chat only. Reports live in the right Decision Board. */
export function AiPmOfficeChat({ messages, footer, children, className }: AiPmOfficeChatProps) {
  return (
    <div
      className={cn(
        'flex min-h-[420px] flex-col rounded-2xl border border-border/70 bg-card p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.role}-${message.text.slice(0, 16)}`}
            className={cn('flex', message.role === 'founder' ? 'justify-end' : 'justify-start')}
          >
            <AiPmMessage
              variant={message.role === 'founder' ? 'system' : 'pm'}
              className={cn(
                'max-w-[92%]',
                message.role === 'founder' && 'bg-muted text-foreground',
              )}
            >
              {message.text}
            </AiPmMessage>
          </div>
        ))}
        {children}
      </div>
      {footer ? <div className="mt-4 shrink-0 border-t border-border/60 pt-4">{footer}</div> : null}
    </div>
  );
}
