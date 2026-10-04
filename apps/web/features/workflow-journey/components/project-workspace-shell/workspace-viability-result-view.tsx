'use client';

import { useState } from 'react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ResultSectionId } from '../../lib/ux-flow-recovery/founder-context-lens';
import type { UxViabilityResultView } from '../../lib/ux-flow-recovery/build-ux-viability-result';

type WorkspaceViabilityResultViewProps = {
  result: UxViabilityResultView;
  pdfHref?: string | null;
  className?: string;
};

function ResultSection({
  id,
  result,
}: {
  id: ResultSectionId;
  result: UxViabilityResultView;
}) {
  switch (id) {
    case 'judgment':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">현재 사업성 판단</p>
          <p data-testid="viability-verdict" className="mt-2 text-[17px] font-semibold">
            {result.verdict}
          </p>
          <p className="mt-1 text-sm leading-relaxed">{result.judgment}</p>
        </div>
      );
    case 'why':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">판단 근거</p>
          <p data-testid="viability-why" className="mt-2 text-sm leading-relaxed">
            {result.why}
          </p>
        </div>
      );
    case 'facts':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">확인된 사실</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="viability-confirmed">
            {(result.confirmedFacts.length ? result.confirmedFacts : ['아직 확정된 사실이 없습니다.']).map(
              (line) => (
                <li key={line}>• {line}</li>
              ),
            )}
          </ul>
        </div>
      );
    case 'assumptions':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">AI의 가정</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="viability-assumptions">
            {(result.assumptions.length ? result.assumptions : ['표시할 가정이 없습니다.']).map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      );
    case 'unknowns':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">아직 모르는 것</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="viability-unknowns">
            {result.unknowns.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      );
    case 'risks':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">핵심 리스크</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="viability-risks">
            {result.risks.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      );
    case 'nextValidation':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">추가 검증해야 할 것</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="viability-next">
            {result.nextValidation.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      );
    case 'nextActions':
      return (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">다음 실행/검증</p>
          <ul className="mt-2 space-y-1 text-sm" data-testid="viability-next-actions">
            {result.nextActions.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      );
  }
}

export function WorkspaceViabilityResultView({
  result,
  pdfHref = null,
  className,
}: WorkspaceViabilityResultViewProps) {
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  const handlePdf = () => {
    if (result.pdfReady && pdfHref) {
      window.location.assign(pdfHref);
      return;
    }
    setPdfMessage('PDF 보고서는 아직 준비 중입니다. 결과 화면의 판단·근거를 먼저 확인해 주세요.');
  };

  return (
    <section
      data-testid="viability-result-view"
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">AI PM</p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight">{result.title}</h2>

      <div className="mt-5 space-y-5">
        {result.sectionOrder.map((id) => (
          <ResultSection key={id} id={id} result={result} />
        ))}

        <div>
          <Button
            type="button"
            className="rounded-xl"
            data-testid="pdf-report-cta"
            onClick={handlePdf}
          >
            보고서
          </Button>
          {pdfMessage ? (
            <p data-testid="pdf-report-status" className="mt-2 text-sm text-muted-foreground" role="status">
              {pdfMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
