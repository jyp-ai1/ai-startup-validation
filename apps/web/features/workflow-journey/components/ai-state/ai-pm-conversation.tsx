'use client';

import { cn } from '@repo/ui/lib/utils';

type AiPmMessageProps = {
  children: React.ReactNode;
  variant?: 'pm' | 'system';
  className?: string;
};

export function AiPmMessage({ children, variant = 'pm', className }: AiPmMessageProps) {
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base',
        variant === 'pm'
          ? 'bg-primary/10 text-foreground'
          : 'bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

type AiPmConversationProps = {
  messages: string[];
  className?: string;
};

export function AiPmConversation({ messages, className }: AiPmConversationProps) {
  return (
    <div className={cn('space-y-3', className)} aria-live="polite">
      {messages.map((message, index) => (
        <AiPmMessage key={`${index}-${message.slice(0, 24)}`}>{message}</AiPmMessage>
      ))}
    </div>
  );
}
