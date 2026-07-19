'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { generateBusinessPlan } from '../actions/business-plan-actions';

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
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateBusinessPlan(projectId, planId);
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
