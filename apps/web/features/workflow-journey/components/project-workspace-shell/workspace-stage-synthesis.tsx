'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { UxViabilityResultView } from '../../lib/ux-flow-recovery/build-ux-viability-result';

type WorkspaceStageSynthesisProps = {
  preview: UxViabilityResultView;
  founderContextHint?: string;
  onOpenResult: () => void;
  className?: string;
};

/** Stage ③ — A/B synthesis only. No new gaps, no new questions. */
export function WorkspaceStageSynthesis({
  preview,
  founderContextHint,
  onOpenResult,
  className,
}: WorkspaceStageSynthesisProps) {
  return (
    <section
      data-testid="stage-synthesis-panel"
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        ③ 확인/종합
      </p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">
        ①②에서 확인한 것으로 사업성을 판단합니다
      </h2>
      {founderContextHint ? (
        <p className="mt-2 text-sm text-muted-foreground">{founderContextHint}</p>
      ) : null}

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">확인된 사실</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="synthesis-facts">
            {(preview.confirmedFacts.length
              ? preview.confirmedFacts
              : ['아직 확정된 사실이 없습니다.']
            ).map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">AI의 가정</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="synthesis-assumptions">
            {(preview.assumptions.length ? preview.assumptions : ['표시할 가정이 없습니다.']).map(
              (line) => (
                <li key={line}>• {line}</li>
              ),
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">아직 모르는 것</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="synthesis-unknowns">
            {preview.unknowns.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">핵심 리스크</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="synthesis-risks">
            {preview.risks.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">판단 근거</p>
          <p className="mt-2 text-sm leading-relaxed">{preview.why}</p>
        </div>
      </div>

      <Button
        type="button"
        className="mt-6 rounded-xl"
        data-testid="open-result-cta"
        onClick={onOpenResult}
      >
        결과 보기
      </Button>
    </section>
  );
}
