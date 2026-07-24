'use client';

import { useState, useTransition } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ConsultantChatPanelProps = {
  projectTitle: string;
  className?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
};

export function ConsultantChatPanel({ projectTitle, className }: ConsultantChatPanelProps) {
  const t = useTranslations('aiConsultant');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = question.trim();
    if (!trimmed || pending) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

    startTransition(async () => {
      setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }]);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          projectTitle,
          stream: true,
          locale: document.documentElement.lang || 'ko',
        }),
      });

      if (!response.ok || !response.body) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: t('chat.error'),
          };
          return next;
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload) as { delta?: string; error?: string };
            if (parsed.error) {
              answer = parsed.error;
            } else if (parsed.delta) {
              answer += parsed.delta;
            }
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: answer, streaming: true };
              return next;
            });
          } catch {
            /* ignore */
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: answer || t('chat.empty') };
        return next;
      });
    });
  }

  return (
    <section className={cn('ll-consulting-card space-y-4 p-5', className)}>
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{t('chat.title')}</h3>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('chat.placeholder')}</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'ml-8 bg-primary/10 text-foreground'
                  : 'mr-8 bg-background text-muted-foreground',
              )}
            >
              {message.streaming && !message.content ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t('chat.thinking')}
                </span>
              ) : (
                message.content
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t('chat.inputPlaceholder')}
          className="min-h-[72px] resize-none"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button type="button" className="shrink-0 self-end" disabled={pending} onClick={handleSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </section>
  );
}
