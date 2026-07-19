'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { generatePRD } from '../actions/prd-actions';

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
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generatePRD(projectId, prdId);
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
