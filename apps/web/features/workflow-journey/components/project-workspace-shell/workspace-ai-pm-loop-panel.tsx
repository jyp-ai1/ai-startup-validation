'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { applyAiPmLoopAnswer } from '../../lib/business-understanding/apply-ai-pm-loop-answer';
import { buildAiPmRuntimeJudgment } from '../../lib/business-understanding/build-workspace-ai-pm-state';
import {
  appendAiPmLoopTurn,
  isAiPmLoopComplete,
  loadAiPmLoopState,
  patchAiPmLoopState,
  setAiPmLoopPhase,
} from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';
import { resolveNextLoopIssue } from '../../lib/business-understanding/resolve-ai-pm-priority-issue';
import { buildBusinessUnderstanding } from '../../lib/business-understanding/build-business-understanding';
import { buildAiPmInitialDiagnosis } from '../../lib/business-understanding/build-ai-pm-initial-diagnosis';
import { buildAiPmIssueFraming } from '../../lib/business-understanding/build-ai-pm-issue-framing';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';
import { WorkspaceAiPmMemoryBlock } from './workspace-ai-pm-memory-block';
import { WorkspaceAiPmDiagnosisSummary } from './workspace-ai-pm-diagnosis-summary';
import { WorkspaceAiPmReadingSequence } from './workspace-ai-pm-reading-sequence';
import type { WorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';

type WorkspaceAiPmLoopPanelProps = {
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  projectId?: string;
  readOnly?: boolean;
  workspaceFacts?: WorkspacePersistedFacts | null;
  onDocumentUpdated?: (issueId: AiPmLoopIssueId, answer: string) => void;
  onLoopComplete?: () => void;
  onSessionPause?: () => void;
  className?: string;
};

const REANALYZE_MS = 1800;

export function WorkspaceAiPmLoopPanel({
  understanding,
  entities = null,
  projectId,
  readOnly = false,
  workspaceFacts = null,
  onDocumentUpdated,
  onLoopComplete,
  onSessionPause,
  className,
}: WorkspaceAiPmLoopPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');
  const [loopState, setLoopState] = useState(() => loadAiPmLoopState(projectId));
  const [answerDraft, setAnswerDraft] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);

  const nextIssue = useMemo(
    () => resolveNextLoopIssue(understanding, loopState),
    [understanding, loopState],
  );
  const documentText = useMemo(() => loadWorkspaceDocumentText(projectId), [projectId, understanding]);
  const initialDiagnosis = useMemo(
    () => buildAiPmInitialDiagnosis(understanding, entities, documentText),
    [understanding, entities, documentText],
  );
  const activeIssueFraming = useMemo(() => {
    const issueId = loopState.currentIssueId ?? nextIssue;
    if (!issueId) return null;
    return buildAiPmIssueFraming(understanding, issueId, initialDiagnosis);
  }, [initialDiagnosis, loopState.currentIssueId, nextIssue, understanding]);

  const runtimeJudgment = useMemo(() => {
    return buildAiPmRuntimeJudgment({
      documentText: loadWorkspaceDocumentText(projectId) ?? undefined,
      loop: loopState,
      understanding,
      facts: workspaceFacts,
    });
  }, [loopState, projectId, understanding, workspaceFacts]);

  const showResumeBriefing = loopState.turns.length > 0;

  const pauseSession = useCallback(() => {
    if (readOnly) return;
    setSessionPaused(true);
    onSessionPause?.();
  }, [onSessionPause, readOnly]);

  useEffect(() => {
    if (isAiPmLoopComplete(loopState)) {
      onLoopComplete?.();
    }
  }, [loopState, onLoopComplete]);

  const syncState = useCallback(
    (next: ReturnType<typeof loadAiPmLoopState>) => {
      setLoopState(next);
    },
    [],
  );

  const beginIssue = useCallback(() => {
    if (!nextIssue || readOnly) return;
    const next = patchAiPmLoopState(
      { phase: 'answer', currentIssueId: nextIssue, dismissedReadAck: true },
      projectId,
    );
    syncState(next);
  }, [nextIssue, projectId, readOnly, syncState]);

  const completeReading = useCallback(() => {
    if (readOnly) return;
    const next = patchAiPmLoopState({ readingCompleted: true, phase: 'read_ack' }, projectId);
    syncState(next);
  }, [projectId, readOnly, syncState]);

  const dismissReadAck = useCallback(() => {
    const next = patchAiPmLoopState(
      {
        dismissedReadAck: true,
        phase: nextIssue ? 'issue' : 'complete',
        currentIssueId: nextIssue,
      },
      projectId,
    );
    syncState(next);
  }, [nextIssue, projectId, syncState]);

  const submitAnswer = useCallback(() => {
    const issueId = loopState.currentIssueId ?? nextIssue;
    const trimmed = answerDraft.trim();
    if (!issueId || trimmed.length < 4 || readOnly) return;

    applyAiPmLoopAnswer(issueId, trimmed, projectId);
    onDocumentUpdated?.(issueId, trimmed);

    appendAiPmLoopTurn(
      { issueId, answer: trimmed, appliedAt: new Date().toISOString() },
      projectId,
    );

    setAnswerDraft('');
    setReanalyzing(true);
    setAiPmLoopPhase('reanalyze', projectId);

    window.setTimeout(() => {
      setReanalyzing(false);
      const refreshed = loadAiPmLoopState(projectId);
      const doc = loadWorkspaceDocumentText(projectId);
      const freshUnderstanding = doc?.trim()
        ? buildBusinessUnderstanding(doc)
        : understanding;

      if (isAiPmLoopComplete(refreshed)) {
        const complete = patchAiPmLoopState({ phase: 'complete', currentIssueId: null }, projectId);
        syncState(complete);
        onLoopComplete?.();
        return;
      }
      const plannedNext = resolveNextLoopIssue(freshUnderstanding, refreshed);
      const next = patchAiPmLoopState(
        { phase: plannedNext ? 'issue' : 'complete', currentIssueId: plannedNext },
        projectId,
      );
      syncState(next);
      if (!plannedNext) onLoopComplete?.();
    }, REANALYZE_MS);
  }, [
    answerDraft,
    loopState.currentIssueId,
    onDocumentUpdated,
    onLoopComplete,
    nextIssue,
    projectId,
    readOnly,
    syncState,
    understanding,
  ]);

  if (sessionPaused && loopState.turns.length > 0) {
    const lastTurn = loopState.turns[loopState.turns.length - 1]!;
    const pauseNextIssue = runtimeJudgment?.nextIssueId ?? nextIssue;
    const todayTopic = t(`issues.${lastTurn.issueId}.riskLabel`);
    const tomorrowTopic = pauseNextIssue
      ? t(`issues.${pauseNextIssue}.riskLabel`)
      : t('sessionEndTomorrowFallback');
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.06] px-5 py-6 sm:px-7',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          {t('sessionEndTodayDone', { topic: todayTopic })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('sessionEndTomorrowTogether', { topic: tomorrowTopic })}
        </p>
      </section>
    );
  }

  if (isAiPmLoopComplete(loopState)) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.04] px-5 py-5 sm:px-7',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
        <p className="mt-3 text-[15px] font-medium leading-relaxed">
          {t('completeLead', { count: loopState.turns.length })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t('completeSub')}</p>
      </section>
    );
  }

  if (reanalyzing || loopState.phase === 'reanalyze') {
    return (
      <section
        className={cn(
          'flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-primary/25 bg-muted/20 px-6 py-10 text-center',
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm font-medium">{t('reanalyzeTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('reanalyzeHint')}</p>
      </section>
    );
  }

  if (!loopState.readingCompleted && loopState.turns.length === 0) {
    return (
      <WorkspaceAiPmReadingSequence
        diagnosis={initialDiagnosis}
        onComplete={completeReading}
        className={className}
      />
    );
  }

  if (!loopState.dismissedReadAck || loopState.phase === 'read_ack') {
    return (
      <WorkspaceAiPmDiagnosisSummary
        diagnosis={initialDiagnosis}
        primaryIssueId={nextIssue}
        readOnly={readOnly}
        onContinue={dismissReadAck}
        className={className}
      />
    );
  }

  const activeIssue = loopState.currentIssueId ?? nextIssue;

  if (loopState.phase === 'answer' && activeIssue) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
        <p className="mt-3 text-[15px] font-medium leading-relaxed">
          {t(`issues.${activeIssue}.question`)}
        </p>
        <textarea
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          rows={5}
          readOnly={readOnly}
          placeholder={t(`issues.${activeIssue}.placeholder`)}
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl"
            disabled={readOnly || answerDraft.trim().length < 4}
            onClick={submitAnswer}
          >
            {t('submitAnswerCta')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={readOnly}
            onClick={() => syncState(setAiPmLoopPhase('issue', projectId))}
          >
            {t('backCta')}
          </Button>
          {loopState.turns.length > 0 ? (
            <Button type="button" variant="ghost" className="rounded-xl" disabled={readOnly} onClick={pauseSession}>
              {t('sessionPauseCta')}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (!activeIssue) {
    return null;
  }

  const lastTurn = loopState.turns[loopState.turns.length - 1];

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      {showResumeBriefing && runtimeJudgment ? (
        <WorkspaceAiPmMemoryBlock
          judgment={runtimeJudgment}
          showResumeBriefing
          className="mt-4"
        />
      ) : null}
      {lastTurn ? (
        <p className="mt-4 text-[15px] font-medium leading-relaxed">
          {t('turnAck', {
            resolved: t(`issues.${lastTurn.issueId}.riskLabel`),
            next: t(`issues.${activeIssue}.riskLabel`),
          })}
        </p>
      ) : (
        <>
          <p className="mt-4 text-[15px] font-medium leading-relaxed">
            {t('priorityLead', { issue: t(`issues.${activeIssue}.riskLabel`) })}
          </p>
          {initialDiagnosis.confidencePercent != null ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('diagnosisBridge', {
                confidence: initialDiagnosis.confidencePercent,
              })}
            </p>
          ) : null}
          {activeIssueFraming?.documentPhrase ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('hypothesisLead', {
                phrase: activeIssueFraming.documentPhrase,
              })}
            </p>
          ) : null}
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-foreground">
            {t('firstQuestionLead', { issue: t(`issues.${activeIssue}.riskLabel`) })}
          </p>
        </>
      )}
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(`issues.${activeIssue}.insight`)}
      </p>
      {!showResumeBriefing ? (
        <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">
          {t(`issues.${activeIssue}.question`)}
        </p>
      ) : null}
      <p className="mt-3 text-sm font-medium text-foreground">{t(`issues.${activeIssue}.timeHint`)}</p>
      <Button type="button" className="mt-5 rounded-xl" disabled={readOnly} onClick={beginIssue}>
        {t('startIssueCta', { issue: t(`issues.${activeIssue}.actionLabel`) })}
      </Button>
      {loopState.turns.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 rounded-xl"
          disabled={readOnly}
          onClick={pauseSession}
        >
          {t('sessionPauseCta')}
        </Button>
      ) : null}
    </section>
  );
}
