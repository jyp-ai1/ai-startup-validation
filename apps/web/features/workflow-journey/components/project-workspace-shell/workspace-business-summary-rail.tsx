'use client';

import { cn } from '@repo/ui/lib/utils';

import {
  uxTrustLabel,
  type UxBusinessSummaryView,
} from '../../lib/ux-flow-recovery/build-ux-business-summary';
import { WorkspaceExpandableText } from './workspace-expandable-text';

type WorkspaceBusinessSummaryRailProps = {
  summary: UxBusinessSummaryView;
  className?: string;
};

export function WorkspaceBusinessSummaryRail({
  summary,
  className,
}: WorkspaceBusinessSummaryRailProps) {
  return (
    <aside
      data-testid="business-summary-rail"
      className={cn(
        'flex w-full shrink-0 flex-col gap-5 border-border/60 lg:w-[min(300px,26vw)] lg:min-w-[240px] lg:border-l lg:pl-6',
        className,
      )}
      aria-label="현재 사업 요약"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          현재 사업 요약
        </p>
        <h2 className="mt-2 text-base font-semibold leading-snug" data-testid="summary-project-title">
          {summary.projectTitle}
        </h2>
        <WorkspaceExpandableText
          text={summary.fullDescription || summary.shortDescription}
          preview={summary.shortDescription}
          testId="summary-business-description"
          className="mt-2 text-muted-foreground"
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground">확인된 내용</p>
        <ul className="mt-2 space-y-1.5" data-testid="summary-confirmed-slots">
          {summary.slots.map((slot) => (
            <li key={slot.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden className={slot.confirmed ? 'text-emerald-600' : 'text-muted-foreground'}>
                {slot.confirmed ? '✓' : '○'}
              </span>
              <span className="min-w-0">
                <span className="font-medium">{slot.label}</span>
                {slot.value ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {slot.value}
                    <span className="ml-1">· {uxTrustLabel(slot.trust)}</span>
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {summary.unknowns.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">아직 모르는 것</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" data-testid="summary-unknowns">
            {summary.unknowns.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground">현재 판단</p>
        <p data-testid="summary-current-judgment" className="mt-2 text-sm leading-relaxed">
          {summary.judgment}
        </p>
      </div>
    </aside>
  );
}
