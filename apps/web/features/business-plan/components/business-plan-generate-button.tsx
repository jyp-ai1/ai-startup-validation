'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { generateBusinessPlan } from '../actions/business-plan-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type BusinessPlanGenerateButtonProps = {
  projectId: string;
  planId?: string;
  label?: string;
};

export function BusinessPlanGenerateButton({
  projectId,
  planId,
  label = 'AI 사업계획서 생성',
}: BusinessPlanGenerateButtonProps) {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateBusinessPlan(projectId, planId);
      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.businessPlanGenerate, {
          project_id: projectId,
          screen: `/projects/${projectId}/business-plan`,
        });
      }
      if (result.success && result.planId && !planId) {
        router.push(`/projects/${projectId}/business-plan/${result.planId}`);
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
