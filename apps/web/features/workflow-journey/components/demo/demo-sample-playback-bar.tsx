'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@repo/ui';

import {
  advanceDemoPlaybackFrame,
  currentDemoPlaybackFrame,
  isDemoPlaybackAtTerminalFrame,
} from '@/lib/demo/demo-playback';

type DemoSamplePlaybackBarProps = {
  projectId: string;
  onAdvanced: () => void;
};

export function DemoSamplePlaybackBar({ projectId, onAdvanced }: DemoSamplePlaybackBarProps) {
  const frame = currentDemoPlaybackFrame(projectId);
  const atEnd = isDemoPlaybackAtTerminalFrame(projectId);

  const handleNext = () => {
    if (atEnd) return;
    advanceDemoPlaybackFrame(projectId);
    onAdvanced();
  };

  return (
    <section
      className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-4 sm:px-5"
      data-testid="demo-sample-playback-bar"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Sample Playback</p>
      <p className="mt-1 text-sm font-medium">{frame?.stepLabel ?? '시나리오 재생'}</p>
      {frame?.presenter?.prefilledAnswerDisplay ? (
        <p className="mt-2 text-sm text-muted-foreground">
          확인된 답변: {frame.presenter.prefilledAnswerDisplay}
        </p>
      ) : null}
      <div className="mt-3">
        <Button type="button" size="sm" disabled={atEnd} onClick={handleNext}>
          다음
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
