'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { processEvidence } from '../actions/knowledge-actions';

type KnowledgeProcessButtonProps = {
  projectId: string;
  label?: string;
};

export function KnowledgeProcessButton({
  projectId,
  label = 'Knowledge 생성',
}: KnowledgeProcessButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleProcess() {
    startTransition(async () => {
      await processEvidence(projectId);
      router.refresh();
    });
  }

  return (
    <Button onClick={handleProcess} disabled={isPending}>
      <Sparkles className="size-4" />
      {isPending ? 'Processing...' : label}
    </Button>
  );
}
