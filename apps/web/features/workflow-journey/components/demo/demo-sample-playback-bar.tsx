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
  onOpenResult?: () => void;
};

export function DemoSamplePlaybackBar({
  projectId,
  onAdvanced,
  onOpenResult,
}: DemoSamplePlaybackBarProps) {
  const frame = currentDemoPlaybackFrame(projectId);
  const visibleQuestion = frame?.presenter?.questionText?.trim();
  const atEnd = isDemoPlaybackAtTerminalFrame(projectId);

  const handleNext = () => {
    if (atEnd) {
      onOpenResult?.();
      return;
    }
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
      {visibleQuestion ? (
        <p className="mt-2 text-sm text-foreground">{visibleQuestion}</p>
      ) : null}
      {frame?.presenter?.prefilledAnswerDisplay ? (
        <p className="mt-2 text-sm text-muted-foreground">
          확인된 답변: {frame.presenter.prefilledAnswerDisplay}
        </p>
      ) : null}
      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          disabled={atEnd && !onOpenResult}
          onClick={handleNext}
          data-testid={atEnd ? 'demo-open-result-cta' : 'demo-playback-next'}
          aria-label={atEnd ? '✓ 맞습니다 — 분석 시작' : '다음'}
        >
          {atEnd ? '사업성 검토 결과 보기' : '다음'}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
