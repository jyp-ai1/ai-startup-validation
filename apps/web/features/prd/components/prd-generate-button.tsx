'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { generatePRD } from '../actions/prd-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type PRDGenerateButtonProps = {
  projectId: string;
  prdId?: string;
  label?: string;
};

export function PRDGenerateButton({
  projectId,
  prdId,
  label = 'AI PRD 생성',
}: PRDGenerateButtonProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generatePRD(projectId, prdId);
      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.strategyGenerate, {
          project_id: projectId,
          screen: `/projects/${projectId}/prd`,
        });
      }
      if (result.success && result.prdId && !prdId) {
        router.push(`/projects/${projectId}/prd/${result.prdId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button onClick={handleGenerate} disabled={isPending}>
      <Sparkles className="size-4" />
      {isPending ? 'Generating...' : label}
    </Button>
  );
}
