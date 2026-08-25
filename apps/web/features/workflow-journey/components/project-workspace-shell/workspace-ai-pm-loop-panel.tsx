'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { applyWorkspaceLoopAnswer } from '../../lib/business-understanding/workspace-state-update';
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
import {
  buildAiPmSharedThinking,
} from '../../lib/business-understanding/build-ai-pm-shared-thinking';
import {
  g1WorkspaceLabel,
  logG1LoopEvent,
} from '../../lib/business-understanding/g1-loop-instrumentation';
import {
  getWorkspaceDocumentTrust,
} from '../../lib/business-understanding/workspace-document-eligibility';
import { loadConversationMemory } from '../../lib/business-understanding/conversation-memory-store';
import { buildConversationMemoryFromSources } from '../../lib/business-understanding/build-conversation-memory';
import { factKeyForIssue } from '../../lib/business-understanding/build-conversation-memory';
import { getFact } from '../../lib/business-understanding/conversation-memory';
import { hasAnalysisResult } from '../../lib/business-understanding/analysis-result-store';
import { presentThinking } from '../../lib/business-understanding/build-thinking-presenter';
import { presentS11Surface } from '../../lib/business-understanding/build-s11-surface-presenter';
import { THINKING_TOTAL_MS } from '../../lib/business-understanding/thinking-stages';
import {
  evaluateAnswerQuality,
  type AnswerQuality,
} from '../../lib/business-understanding/understanding-contract';
import { canEnterValidation } from '../../lib/business-understanding/stage-transition';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDocumentTrustBlock } from './workspace-document-trust-block';
import { WorkspaceAiPmReturnWelcomeBlock } from './workspace-ai-pm-return-welcome-block';
import { WorkspaceAiPmReadingSequence } from './workspace-ai-pm-reading-sequence';
import { WorkspaceAiPmThinkingStages } from './workspace-ai-pm-thinking-stages';
import { WorkspaceS11Surface } from './workspace-s11-surface';
import type { WorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';

type WorkspaceAiPmLoopPanelProps = {
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  projectId?: string;
  readOnly?: boolean;
  /** S16 P0-2 — only open first ask after Shared Understanding confirm */
  allowAsk?: boolean;
  workspaceFacts?: WorkspacePersistedFacts | null;
  onDocumentUpdated?: (issueId: AiPmLoopIssueId, answer: string) => void;
  /** S16 P0-2 — parent must refresh loop snapshot so Shared Understanding confirm can mount */
  onLoopStateChange?: () => void;
  onLoopComplete?: () => void;
  onSessionPause?: () => void;
  className?: string;
};

export function WorkspaceAiPmLoopPanel({
  understanding,
  entities = null,
  projectId,
  readOnly = false,
  allowAsk = true,
  workspaceFacts = null,
  onDocumentUpdated,
  onLoopStateChange,
  onLoopComplete,
  onSessionPause,
  className,
}: WorkspaceAiPmLoopPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');
  const [loopState, setLoopState] = useState(() => loadAiPmLoopState(projectId));
  const [answerDraft, setAnswerDraft] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [answerQualityHint, setAnswerQualityHint] = useState<AnswerQuality | null>(null);
  const [contradiction, setContradiction] = useState<{
    issueId: AiPmLoopIssueId;
    prior: string;
    next: string;
  } | null>(null);

  const [updateSavedFlash, setUpdateSavedFlash] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [returnWelcomeDismissed, setReturnWelcomeDismissed] = useState(false);
  const [recognitionDismissed, setRecognitionDismissed] = useState(true);
  const confirmParkNotifiedRef = useRef(false);

  const documentText = useMemo(() => loadWorkspaceDocumentText(projectId), [projectId, understanding]);
  const documentTrust = useMemo(() => getWorkspaceDocumentTrust(documentText), [documentText]);
  const documentReadable = documentTrust.status === 'readable';
  const conversationMemory = useMemo(() => {
    return buildConversationMemoryFromSources({
      projectId: projectId ?? 'default',
      documentText: documentText ?? '',
      turns: loopState.turns,
      entities,
      previous: loadConversationMemory(projectId),
    });
  }, [projectId, documentText, loopState.turns, entities]);
  const analysisResultExists = hasAnalysisResult(projectId);
  const nextIssue = useMemo(
    () =>
      resolveNextLoopIssue(understanding, loopState, {
        documentText: documentText ?? undefined,
        entities,
        memory: conversationMemory,
        analysisResultExists,
      }),
    [understanding, loopState, documentText, entities, conversationMemory, analysisResultExists],
  );
  const activeIssueId = loopState.currentIssueId ?? nextIssue;
  const lastTurn = loopState.turns.at(-1) ?? null;
  const s11Surface = useMemo(() => {
    const askIssueId = loopState.currentIssueId ?? nextIssue;
    const showUpdate =
      loopState.phase === 'issue' &&
      lastTurn != null &&
      !recognitionDismissed &&
      lastTurn.issueId !== askIssueId;

    const thinking = presentThinking({
      memory: conversationMemory,
      documentText: documentText ?? '',
      entities,
      nextIssueId: askIssueId,
    });

    // Founder never picks a path — only answers. S11: Engine → Presenter Contract only.
    if (showUpdate) {
      return presentS11Surface(thinking, {
        mode: 'update',
        answeredIssueId: lastTurn.issueId,
        nextIssueId: askIssueId,
        documentText: documentText ?? '',
      });
    }
    return presentS11Surface(thinking, {
      mode: 'ask',
      showDocumentLead: loopState.turns.length === 0,
      documentText: documentText ?? '',
    });
  }, [
    conversationMemory,
    documentText,
    entities,
    loopState.currentIssueId,
    loopState.phase,
    loopState.turns.length,
    nextIssue,
    lastTurn,
    recognitionDismissed,
  ]);
  const initialDiagnosis = useMemo(
    () => buildAiPmInitialDiagnosis(understanding, entities, documentText),
    [understanding, entities, documentText],
  );
  const sharedThinking = useMemo(() => {
    if (!activeIssueId) return null;
    const useContinuous = loopState.phase === 'issue' && lastTurn != null;
    return buildAiPmSharedThinking({
      issueId: activeIssueId,
      understanding,
      documentText,
      entities,
      turns: loopState.turns,
      lastTurn: useContinuous ? lastTurn : null,
    });
  }, [
    activeIssueId,
    understanding,
    documentText,
    entities,
    loopState.phase,
    loopState.turns,
    lastTurn,
  ]);

  const runtimeJudgment = useMemo(() => {
    return buildAiPmRuntimeJudgment({
      documentText: loadWorkspaceDocumentText(projectId) ?? undefined,
      loop: loopState,
      understanding,
      facts: workspaceFacts,
      projectId,
    });
  }, [loopState, projectId, understanding, workspaceFacts]);

  const showResumeBriefing = loopState.turns.length > 0;
  const showReturnWelcome =
    showResumeBriefing &&
    Boolean(runtimeJudgment?.returnWelcome) &&
    !returnWelcomeDismissed &&
    loopState.phase === 'issue';

  const dismissReturnWelcome = useCallback(() => {
    setReturnWelcomeDismissed(true);
  }, []);

  const showContinuousThinking =
    Boolean(lastTurn) &&
    lastTurn != null &&
    lastTurn.issueId !== activeIssueId;

  const showRecognition =
    loopState.phase === 'issue' &&
    showContinuousThinking &&
    !recognitionDismissed &&
    !showReturnWelcome;

  const workspaceLabel = useMemo(() => g1WorkspaceLabel(projectId), [projectId]);

  useEffect(() => {
    if (showRecognition && lastTurn) {
      logG1LoopEvent({
        event: 'learning_show',
        workspace: workspaceLabel,
        turn: loopState.turns.length,
        issueId: lastTurn.issueId,
        phase: loopState.phase,
      });
    }
  }, [showRecognition, workspaceLabel, loopState.turns.length, lastTurn, loopState.phase]);

  useEffect(() => {
    if (loopState.phase === 'answer' && activeIssueId) {
      logG1LoopEvent({
        event: 'question_show',
        workspace: workspaceLabel,
        turn: loopState.turns.length + 1,
        issueId: activeIssueId,
        phase: 'answer',
      });
    }
  }, [loopState.phase, activeIssueId, workspaceLabel, loopState.turns.length]);

  useEffect(() => {
    if (showReturnWelcome) {
      logG1LoopEvent({
        event: 'resume',
        workspace: workspaceLabel,
        turn: loopState.turns.length,
        phase: 'issue',
      });
    }
  }, [showReturnWelcome, workspaceLabel, loopState.turns.length]);

  const pauseSession = useCallback(() => {
    if (readOnly) return;
    logG1LoopEvent({
      event: 'pause',
      workspace: workspaceLabel,
      turn: loopState.turns.length,
      phase: loopState.phase,
    });
    setSessionPaused(true);
    onSessionPause?.();
  }, [loopState.phase, loopState.turns.length, onSessionPause, readOnly, workspaceLabel]);

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
    const issue = loopState.currentIssueId ?? nextIssue;
    if (!issue || readOnly) return;
    const next = patchAiPmLoopState(
      { phase: 'answer', currentIssueId: issue, dismissedReadAck: true },
      projectId,
    );
    syncState(next);
  }, [loopState.currentIssueId, nextIssue, projectId, readOnly, syncState]);

  const dismissRecognition = useCallback(() => {
    setRecognitionDismissed(true);
    beginIssue();
  }, [beginIssue]);

  const completeReading = useCallback(() => {
    if (readOnly) return;
    const issue = nextIssue;
    // S16 P0-2 — park on issue until Shared Understanding confirm; open answer only when allowAsk
    const next = patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: allowAsk ? (issue ? 'answer' : 'complete') : 'issue',
        currentIssueId: issue,
      },
      projectId,
    );
    syncState(next);
    // Parent gates UnderstandingCard on readingCompleted — sync or main stays empty.
    onLoopStateChange?.();
  }, [allowAsk, nextIssue, onLoopStateChange, projectId, readOnly, syncState]);

  useEffect(() => {
    // Recover when reading already completed in-store but parent snapshot lagged.
    if (allowAsk || !loopState.readingCompleted || loopState.turns.length > 0) {
      confirmParkNotifiedRef.current = false;
      return;
    }
    if (confirmParkNotifiedRef.current) return;
    confirmParkNotifiedRef.current = true;
    onLoopStateChange?.();
  }, [allowAsk, loopState.readingCompleted, loopState.turns.length, onLoopStateChange]);

  useEffect(() => {
    // S16 P0-2 — after reading, park until Shared Understanding confirm (allowAsk).
    if (!loopState.readingCompleted) return;
    if (loopState.turns.length > 0) return;
    if (isAiPmLoopComplete(loopState)) return;

    if (!allowAsk) {
      if (loopState.phase === 'answer' || loopState.phase === 'read_ack') {
        syncState(
          patchAiPmLoopState(
            {
              dismissedReadAck: true,
              phase: 'issue',
              currentIssueId: loopState.currentIssueId ?? nextIssue,
            },
            projectId,
          ),
        );
      }
      return;
    }

    if (
      loopState.phase === 'read_ack' ||
      loopState.phase === 'issue' ||
      !loopState.dismissedReadAck
    ) {
      const issue = loopState.currentIssueId ?? nextIssue;
      if (loopState.phase === 'answer' && loopState.currentIssueId) return;
      syncState(
        patchAiPmLoopState(
          {
            dismissedReadAck: true,
            phase: issue ? 'answer' : 'complete',
            currentIssueId: issue,
          },
          projectId,
        ),
      );
    }
  }, [
    allowAsk,
    loopState,
    loopState.readingCompleted,
    loopState.dismissedReadAck,
    loopState.phase,
    loopState.currentIssueId,
    loopState.turns.length,
    nextIssue,
    projectId,
    syncState,
  ]);

  const submitAnswer = useCallback(() => {
    const issueId = loopState.currentIssueId ?? nextIssue;
    const trimmed = answerDraft.trim();
    if (!issueId || trimmed.length < 4 || readOnly) return;

    const factKey = factKeyForIssue(issueId);
    const memory = loadConversationMemory(projectId);
    const existingFact = factKey ? getFact(memory, factKey)?.value ?? null : null;
    const preview = evaluateAnswerQuality(trimmed, { existingFact });
    if (preview.quality === 'CONTRADICTORY' && existingFact) {
      setAnswerQualityHint('CONTRADICTORY');
      setContradiction({ issueId, prior: existingFact, next: trimmed });
      return;
    }
    if (!preview.mergeable) {
      setAnswerQualityHint(preview.quality);
      setContradiction(null);
      return;
    }

    setAnswerQualityHint(null);
    setContradiction(null);

    logG1LoopEvent({
      event: 'answer_submit',
      workspace: g1WorkspaceLabel(projectId),
      turn: loopState.turns.length + 1,
      issueId,
      phase: 'answer',
    });

    // S15 — append turn BEFORE Memory rebuild so bag includes the latest Fact
    appendAiPmLoopTurn(
      { issueId, answer: trimmed, appliedAt: new Date().toISOString() },
      projectId,
    );
    const result = applyWorkspaceLoopAnswer(issueId, trimmed, projectId);
    if (!result.applied) {
      setAnswerQualityHint(result.quality);
      return;
    }
    onDocumentUpdated?.(issueId, trimmed);

    setAnswerDraft('');
    setReturnWelcomeDismissed(true);
    setRecognitionDismissed(false);
    setReanalyzing(true);
    setUpdateSavedFlash(false);
    setAiPmLoopPhase('reanalyze', projectId);

    // S17-2 — staged Thinking (~1–2s) then reflect + next Q
    window.setTimeout(() => {
      setReanalyzing(false);
      setUpdateSavedFlash(true);
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
      const plannedNext = resolveNextLoopIssue(freshUnderstanding, refreshed, {
        documentText: doc ?? undefined,
        entities,
        memory: loadConversationMemory(projectId),
        analysisResultExists: hasAnalysisResult(projectId),
        turns: refreshed.turns,
      });
      // W9 — complete when no next gap AND stage transition allows Validation
      if (
        !plannedNext &&
        canEnterValidation({
          loop: refreshed,
          memory: loadConversationMemory(projectId),
          entities,
        })
      ) {
        const complete = patchAiPmLoopState({ phase: 'complete', currentIssueId: null }, projectId);
        syncState(complete);
        onLoopComplete?.();
        window.setTimeout(() => setUpdateSavedFlash(false), 2200);
        return;
      }
      const next = patchAiPmLoopState(
        { phase: plannedNext ? 'issue' : 'complete', currentIssueId: plannedNext },
        projectId,
      );
      syncState(next);
      if (!plannedNext) onLoopComplete?.();
      window.setTimeout(() => setUpdateSavedFlash(false), 2200);
    }, THINKING_TOTAL_MS);
  }, [
    answerDraft,
    loopState.currentIssueId,
    loopState.turns.length,
    onDocumentUpdated,
    onLoopComplete,
    nextIssue,
    projectId,
    readOnly,
    syncState,
    understanding,
    entities,
  ]);

  const resolveContradiction = useCallback(
    (choice: 'keep_prior' | 'accept_new') => {
      if (!contradiction || readOnly) return;
      const { issueId, prior, next } = contradiction;
      if (choice === 'keep_prior') {
        setContradiction(null);
        setAnswerQualityHint(null);
        setAnswerDraft('');
        return;
      }
      setContradiction(null);
      setAnswerQualityHint(null);
      appendAiPmLoopTurn(
        { issueId, answer: next, appliedAt: new Date().toISOString() },
        projectId,
      );
      applyWorkspaceLoopAnswer(issueId, next, projectId, { forceAccept: true });
      onDocumentUpdated?.(issueId, next);
      setAnswerDraft('');
      setReanalyzing(true);
      setAiPmLoopPhase('reanalyze', projectId);
      window.setTimeout(() => {
        setReanalyzing(false);
        setUpdateSavedFlash(true);
        const refreshed = loadAiPmLoopState(projectId);
        const doc = loadWorkspaceDocumentText(projectId);
        const freshUnderstanding = doc?.trim()
          ? buildBusinessUnderstanding(doc)
          : understanding;
        const plannedNext = resolveNextLoopIssue(freshUnderstanding, refreshed, {
          documentText: doc ?? undefined,
          entities,
          memory: loadConversationMemory(projectId),
          analysisResultExists: hasAnalysisResult(projectId),
          turns: refreshed.turns,
        });
        const nextState = patchAiPmLoopState(
          { phase: plannedNext ? 'issue' : 'complete', currentIssueId: plannedNext },
          projectId,
        );
        syncState(nextState);
        if (!plannedNext) onLoopComplete?.();
        window.setTimeout(() => setUpdateSavedFlash(false), 2200);
      }, THINKING_TOTAL_MS);
      void prior;
    },
    [
      contradiction,
      entities,
      onDocumentUpdated,
      onLoopComplete,
      projectId,
      readOnly,
      syncState,
      understanding,
    ],
  );

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

  // S16 P0-2 — reading done, waiting for parent Shared Understanding 「맞습니까?」 gate
  if (!allowAsk && loopState.readingCompleted && loopState.turns.length === 0) {
    return null;
  }

  if (reanalyzing || loopState.phase === 'reanalyze') {
    return <WorkspaceAiPmThinkingStages className={className} />;
  }

  if (!loopState.readingCompleted && loopState.turns.length === 0) {
    if (documentTrust.status === 'unreadable') {
      return (
        <WorkspaceDocumentTrustBlock
          trust={documentTrust}
          readOnly={readOnly}
          onContinue={completeReading}
          className={className}
        />
      );
    }
    return (
      <WorkspaceAiPmReadingSequence
        diagnosis={initialDiagnosis}
        onComplete={completeReading}
        className={className}
      />
    );
  }

  const activeIssue = activeIssueId;

  if (loopState.phase === 'answer' && activeIssue) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
          className,
        )}
      >
        <WorkspaceS11Surface surface={s11Surface} />
        <textarea
          value={answerDraft}
          onChange={(event) => {
            setAnswerQualityHint(null);
            setAnswerDraft(event.target.value);
          }}
          rows={5}
          readOnly={readOnly}
          placeholder={t(`issues.${activeIssue}.placeholder`)}
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
          aria-label={s11Surface.question.text || t('submitAnswerCta')}
        />
        {answerQualityHint ? (
          <p
            data-testid="answer-quality-hint"
            className="mt-2 text-sm text-amber-800 dark:text-amber-200"
            role="status"
          >
            {t(`answerQuality.${answerQualityHint}`)}
          </p>
        ) : null}
        {contradiction ? (
          <div
            data-testid="contradiction-confirm"
            className="mt-3 space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3"
          >
            <p className="text-sm font-medium text-foreground">
              이전에 확인한 내용과 새 답변이 다릅니다. 어느 쪽이 맞습니까?
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  이전 확인
                </dt>
                <dd className="mt-1 font-medium">{contradiction.prior}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  새 답변
                </dt>
                <dd className="mt-1 font-medium">{contradiction.next}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={readOnly}
                onClick={() => resolveContradiction('keep_prior')}
              >
                이전 내용이 맞아
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={readOnly}
                onClick={() => resolveContradiction('accept_new')}
              >
                새 답변이 맞아
              </Button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl"
            disabled={readOnly || answerDraft.trim().length < 4}
            onClick={submitAnswer}
          >
            {t('submitAnswerCta')}
          </Button>
        </div>
      </section>
    );
  }

  if (!activeIssue || !sharedThinking) {
    return null;
  }

  if (loopState.phase === 'issue') {
    return (
      <section className={cn('space-y-4', className)}>
        {showReturnWelcome && runtimeJudgment?.returnWelcome ? (
          <div className="space-y-4">
            <WorkspaceAiPmReturnWelcomeBlock welcome={runtimeJudgment.returnWelcome} />
            <Button
              type="button"
              className="rounded-xl"
              disabled={readOnly}
              onClick={dismissReturnWelcome}
            >
              {t('sharedThinking.continueCta')}
            </Button>
          </div>
        ) : showRecognition ? (
          <div
            className="space-y-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7"
            data-testid="ai-pm-thinking-update"
          >
            {updateSavedFlash ? (
              <p
                data-testid="ai-understanding-updated"
                className="text-sm font-medium text-emerald-700 dark:text-emerald-300"
              >
                {t('understandingUpdatedFlash')}
              </p>
            ) : null}
            <p className="text-sm font-medium text-foreground">{t('reflectLead')}</p>
            <WorkspaceS11Surface surface={s11Surface} />
            <Button
              type="button"
              className="rounded-xl"
              disabled={readOnly}
              onClick={dismissRecognition}
            >
              {t('sharedThinking.continueCta')}
            </Button>
          </div>
        ) : (
          <>
            <section
              className={cn(
                'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
              )}
            >
              <WorkspaceS11Surface surface={s11Surface} />
              <textarea
                value={answerDraft}
                onChange={(event) => {
                  setAnswerQualityHint(null);
                  setAnswerDraft(event.target.value);
                }}
                rows={5}
                readOnly={readOnly}
                placeholder={activeIssueId ? t(`issues.${activeIssueId}.placeholder`) : undefined}
                className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
                aria-label={s11Surface.question.text || t('submitAnswerCta')}
              />
              {answerQualityHint ? (
                <p
                  data-testid="answer-quality-hint"
                  className="mt-2 text-sm text-amber-800 dark:text-amber-200"
                  role="status"
                >
                  {t(`answerQuality.${answerQualityHint}`)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={readOnly || answerDraft.trim().length < 4}
                  onClick={submitAnswer}
                >
                  {t('submitAnswerCta')}
                </Button>
              </div>
            </section>
            {loopState.turns.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                disabled={readOnly}
                onClick={pauseSession}
              >
                {t('sessionPauseCta')}
              </Button>
            ) : null}
          </>
        )}
      </section>
    );
  }

  return null;
}
