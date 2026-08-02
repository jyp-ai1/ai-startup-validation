'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import {
  buildCommonStrategyPaths,
  buildDefaultMarketAlignment,
  buildMarketCandidates,
  buildReviewReadyTrust,
  isMarketAlignmentValid,
  type MarketAlignmentState,
  type MarketCandidate,
  type StrategyDirection,
} from '../../lib/business-understanding/workspace-alignment';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceBusinessAlignmentBlockProps = {
  understanding: BusinessUnderstanding;
  initialState?: MarketAlignmentState | null;
  onConfirm: (state: MarketAlignmentState, candidates: MarketCandidate[]) => void;
  documentReadable?: boolean;
  readOnly?: boolean;
  className?: string;
};

function ChoiceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors',
        active
          ? 'border-primary/50 bg-primary/[0.04] font-medium'
          : 'border-border/60 hover:border-primary/30',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'size-4 shrink-0 rounded-full border-2',
          active ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        )}
        aria-hidden
      />
      {children}
    </button>
  );
}

export function WorkspaceBusinessAlignmentBlock({
  understanding,
  initialState,
  onConfirm,
  documentReadable = true,
  readOnly = false,
  className,
}: WorkspaceBusinessAlignmentBlockProps) {
  const ta = useTranslations('workflow.journey.workspaceShell.businessUnderstanding.alignment');
  const candidates = useMemo(() => buildMarketCandidates(understanding), [understanding]);
  const strategyPaths = useMemo(() => buildCommonStrategyPaths(candidates), [candidates]);
  const [state, setState] = useState<MarketAlignmentState>(
    () => initialState ?? buildDefaultMarketAlignment(),
  );
  const [customDraft, setCustomDraft] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const setDirection = (direction: StrategyDirection) => {
    setState({ direction, primaryLabel: null });
    setShowCustom(false);
    setCustomDraft('');
  };

  const hasDirection = state.direction === 'has_direction';
  const canStart = isMarketAlignmentValid(state);
  const startBlockedHint =
    readOnly || canStart
      ? null
      : state.direction === 'has_direction'
        ? ta('startBlockedPrimary')
        : ta('startBlockedDirection');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/20 bg-primary/[0.02] px-5 py-5 sm:px-7',
        className,
      )}
    >
      <div className="space-y-5 text-[15px] leading-relaxed">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {ta('aiLabel')}
          </p>
          <p className="mt-3">
            {documentReadable ? ta('readLead') : ta('readLeadUnreadable')}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {candidates.map((c) => (
              <li key={c.id}>{c.label}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">{ta('withholdLine')}</p>
        </div>

        {strategyPaths.length >= 2 ? (
          <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-4 text-sm">
            <p>{ta('pmLead')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {strategyPaths.map((path) => (
                <li key={path}>{ta('strategyPath', { target: path })}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2 text-sm leading-relaxed">
          <p>{ta('pmUnderstanding1')}</p>
          <p>{ta('pmUnderstanding2')}</p>
          <p className="font-medium text-foreground">{ta('pmUnderstanding3')}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">{ta('directionTitle')}</p>
          <div className="space-y-2">
            <ChoiceButton
              active={hasDirection}
              disabled={readOnly}
              onClick={() => setDirection('has_direction')}
            >
              {ta('optionHasDirection')}
            </ChoiceButton>
            <ChoiceButton
              active={state.direction === 'thinking'}
              disabled={readOnly}
              onClick={() => setDirection('thinking')}
            >
              {ta('optionThinking')}
            </ChoiceButton>
            <ChoiceButton
              active={state.direction === 'decide_after_review'}
              disabled={readOnly}
              onClick={() => setDirection('decide_after_review')}
            >
              {ta('optionDecideAfterReview')}
            </ChoiceButton>
          </div>
        </div>

        {hasDirection ? (
          <div className="space-y-3">
            <p className="font-medium">{ta('whichDirection')}</p>
            <div className="space-y-2">
              {candidates.map((candidate) => (
                <ChoiceButton
                  key={candidate.id}
                  active={state.primaryLabel === candidate.label && !showCustom}
                  disabled={readOnly}
                  onClick={() => {
                    setShowCustom(false);
                    setState({ direction: 'has_direction', primaryLabel: candidate.label });
                  }}
                >
                  {candidate.label}
                </ChoiceButton>
              ))}
              <ChoiceButton
                active={showCustom}
                disabled={readOnly}
                onClick={() => {
                  setShowCustom(true);
                  setState({
                    direction: 'has_direction',
                    primaryLabel: customDraft.trim() || null,
                  });
                }}
              >
                {ta('customOption')}
              </ChoiceButton>
            </div>
            {showCustom ? (
              <input
                value={customDraft}
                readOnly={readOnly}
                onChange={(e) => {
                  const label = e.target.value;
                  setCustomDraft(label);
                  setState({
                    direction: 'has_direction',
                    primaryLabel: label.trim() || null,
                  });
                }}
                placeholder={ta('customPlaceholder')}
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
            ) : null}
          </div>
        ) : null}

        {canStart ? (
          <div className="space-y-3 whitespace-pre-line rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-4 text-sm leading-relaxed">
            {buildReviewReadyTrust().split('\n\n').map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        ) : null}

        <Button
          type="button"
          className="rounded-xl"
          disabled={readOnly || !canStart}
          onClick={() => onConfirm(state, candidates)}
        >
          {ta('startReview')}
        </Button>
        {startBlockedHint ? (
          <p className="text-sm text-muted-foreground" role="status">
            {startBlockedHint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
