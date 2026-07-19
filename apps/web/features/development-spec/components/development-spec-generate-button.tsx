'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { generateDevelopmentSpec } from '../actions/development-spec-actions';

type DevelopmentSpecGenerateButtonProps = {
  projectId: string;
  specId?: string;
  prdId?: string;
  label?: string;
};

export function DevelopmentSpecGenerateButton({
  projectId,
  specId,
  prdId,
  label = 'AI 개발 명세 생성',
}: DevelopmentSpecGenerateButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateDevelopmentSpec(projectId, specId, prdId);
      if (result.success && result.specId && !specId) {
        router.push(`/projects/${projectId}/development-spec/${result.specId}`);
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
