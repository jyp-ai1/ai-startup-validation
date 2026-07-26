'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  getLiveStreamMessageKeys,
  LIVE_STREAM_INTERVAL_MS,
} from '../../lib/ai-pm-live-stream';
import { AiPmConversation } from './ai-pm-conversation';

type AiPmLiveConversationProps = {
  agentIndex: number;
  failed?: boolean;
  className?: string;
};

export function AiPmLiveConversation({
  agentIndex,
  failed = false,
  className,
}: AiPmLiveConversationProps) {
  const tc = useTranslations('workflow.aiPm.conversation');
  const tl = useTranslations('workflow.aiPm.liveStream');
  const [visibleCount, setVisibleCount] = useState(1);

  const messageKeys = failed ? (['retry'] as const) : getLiveStreamMessageKeys(agentIndex);

  const messages = messageKeys.slice(0, visibleCount).map((key) => {
    if (key === 'retry' || key === 'confirmedIdea') {
      return tc(key);
    }
    return tl(key);
  });

  useEffect(() => {
    setVisibleCount(1);
    if (failed || messageKeys.length <= 1) return;

    const timer = window.setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= messageKeys.length) return prev;
        return prev + 1;
      });
    }, LIVE_STREAM_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [agentIndex, failed, messageKeys.length]);

  return (
    <AiPmConversation
      messages={messages}
      className={cn('max-h-48 overflow-y-auto', className)}
    />
  );
}
