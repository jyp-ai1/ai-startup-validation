'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { applyWorkspaceLoopAnswer } from '../../lib/business-understanding/workspace-state-update';
import { buildAiPmRuntimeJudgment } from '../../lib/business-understanding/build-workspace-ai-pm-state';
import {
  appendAiPmLoopTurn,
  getResolvedIssueIds,
  isAiPmLoopComplete,
  loadAiPmLoopState,
  patchAiPmLoopState,
  setAiPmLoopPhase,
  supersedeTurnAndInvalidateDownstream,
} from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
  type AiPmLoopTurn,
} from '../../lib/business-understanding/workspace-ai-pm-loop-types';
import { resolveNextLoopIssue } from '../../lib/business-understanding/resolve-ai-pm-priority-issue';
import { resolveNextQuestionDecision } from '../../lib/business-understanding/resolve-next-question-decision';
import { isNextQuestionDecision } from '../../lib/business-understanding/decide-next-question-from-review';
import { getWhyThisQuestionNow, resolvePreservedGapAfterMeta, resolveWrongSlotQuestionOverride } from '../../lib/business-understanding/resolve-missing-field-priority';
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
import {
  loadConversationMemory,
  saveConversationMemory,
} from '../../lib/business-understanding/conversation-memory-store';
import { buildConversationMemoryFromSources } from '../../lib/business-understanding/build-conversation-memory';
import { factKeyForIssue } from '../../lib/business-understanding/build-conversation-memory';
import {
  clearFactsByKeys,
  getFact,
  type ConversationFactKey,
} from '../../lib/business-understanding/conversation-memory';
import { hasAnalysisResult } from '../../lib/business-understanding/analysis-result-store';
import { presentThinking } from '../../lib/business-understanding/build-thinking-presenter';
import { presentS11Surface } from '../../lib/business-understanding/build-s11-surface-presenter';
import { buildConversationUnderstandingRows } from '../../lib/business-understanding/build-conversation-understanding-summary';
import { THINKING_STAGES, type ThinkingStageId } from '../../lib/business-understanding/thinking-stages';
import {
  applyLoopProcessingTransition,
  runLoopAnswerProcessing,
} from '../../lib/business-understanding/process-loop-answer';
import {
  buildLivingUnderstandingState,
  factsToClearAfterEdit,
} from '../../lib/business-understanding/living-understanding-state';
import {
  buildQuestionCausality,
  buildUnderstandingDelta,
  countCriticalViabilityGaps,
  criticalGapsBlockAnalysis,
  explainSufficiency,
  formatUnderstandingDeltaSummary,
} from '../../lib/business-understanding/question-causality';
import { buildConversationalFinalOutput } from '../../lib/business-understanding/build-conversational-final-output';
import {
  type AnswerQuality,
} from '../../lib/business-understanding/understanding-contract';
import { hasDiffRelevanceEvidence } from '../../lib/business-understanding/understanding-contract';
import {
  hasPersonaSegmentCue,
  isRelevanceDominantOnPersonaAsk,
} from '../../lib/business-understanding/persona-answer-cues';
import { isOnSlotCompetitorAnswer } from '../../lib/business-understanding/competitor-answer-cues';
import { isOnSlotPayerAnswer } from '../../lib/business-understanding/payer-answer-cues';
import {
  interpretAnswerSemantics,
  type SemanticInterpretation,
} from '../../lib/business-understanding/interpret-answer-semantics';
import { buildAnswerReview } from '../../lib/business-understanding/build-answer-review';
import { buildCeoSixSurfaces } from '../../lib/business-understanding/build-ceo-six-surfaces';
import { hydrateAiPmLoopState } from '../../lib/business-understanding/hydrate-ai-pm-loop-state';
import {
  resolveRemountAskSurface,
} from '../../lib/business-understanding/resolve-remount-ask-surface';
import { isV3ReviewPipelineActive } from '../../lib/business-understanding/v3-review-pipeline';
import {
  resolveV3FallbackTargetGap,
  resolveV3PanelDecision,
  shouldBindDisplayFromPersistedDecision,
} from '../../lib/business-understanding/v3-legacy-bypass-guards';
import type { AnswerReview } from '@repo/types/domain/answer-review';
import { reframeQuestion, buildConflictClarifyQuestion, type ReframeReason } from '../../lib/business-understanding/reframe-question';
import { resolveAskedTargetGapForAppend } from '../../lib/business-understanding/resolve-asked-target-gap';
import { inferTargetGapFromQuestionText, resolveGapQuestionBinding } from '../../lib/business-understanding/gap-question-map';
import { resolveNuclearWrongSlotAtSubmit, resolveWrongSlotReaskPendingAtSubmit, hasPendingWrongSlotReask, getLastWrongSlotReaskPendingGap } from '../../lib/business-understanding/wrong-slot-priority';
import { countUnclosedGapAsks, MAX_SAME_GAP_ASKS_BEFORE_YIELD } from '../../lib/business-understanding/question-decision-engine';
import { enforceQuestionPurity } from '../../lib/business-understanding/question-purity';
import {
  captureLockedAskSurface,
  isQuestionTransitionLockActive,
  resolveDisplayQuestionWithLock,
  shouldRejectStaleAskSurfaceUpdate,
  type LockedAskSurface,
} from '../../lib/business-understanding/question-transition-lock';
import { canEnterValidation } from '../../lib/business-understanding/stage-transition';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDocumentTrustBlock } from './workspace-document-trust-block';
import { WorkspaceAiPmReturnWelcomeBlock } from './workspace-ai-pm-return-welcome-block';
import { WorkspaceAiPmReadingSequence } from './workspace-ai-pm-reading-sequence';
import { WorkspaceAiPmThinkingStages } from './workspace-ai-pm-thinking-stages';
import { WorkspaceAiPmConversationDetail } from './workspace-ai-pm-conversation-detail';
import { WorkspaceS11Surface } from './workspace-s11-surface';
import { WorkspaceCeoSixSurfaces } from './workspace-ceo-six-surfaces';
import type { WorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';

function ConversationWhyNowBlock({
  whyNow,
}: {
  whyNow: string;
}) {
  return (
    <details className="mt-4 rounded-xl border border-border/50 bg-muted/10 px-4 py-3" data-testid="why-now-details">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        ▸ 왜 지금 이 질문인가요?
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{whyNow}</p>
    </details>
  );
}

function ConversationSecondaryBlocks({
  s11Surface,
  livingState,
  lastTurn,
  whyNow,
  displayQuestionText,
}: {
  s11Surface: ReturnType<typeof presentS11Surface>;
  livingState: ReturnType<typeof buildLivingUnderstandingState>;
  lastTurn: AiPmLoopTurn | null;
  whyNow: string | null | undefined;
  displayQuestionText: string;
}) {
  const understandingRows = useMemo(
    () => buildConversationUnderstandingRows(livingState),
    [livingState],
  );

  return (
    <>
      {whyNow ? <ConversationWhyNowBlock whyNow={whyNow} /> : null}
      <WorkspaceS11Surface
        surface={s11Surface}
        sections="understanding"
        questionTextOverride={displayQuestionText}
        understandingRows={understandingRows}
        className="mt-4"
      />
      <WorkspaceAiPmConversationDetail
        livingState={livingState}
        lastTurn={lastTurn}
        className="mt-4"
      />
    </>
  );
}

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
  /** FIX 1 CASE A — re-sync when DB hydrator applies a new snapshot */
  workspaceSnapshotUpdatedAt?: string | null;
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
  workspaceSnapshotUpdatedAt = null,
  className,
}: WorkspaceAiPmLoopPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');
  const [loopState, setLoopState] = useState(() => loadAiPmLoopState(projectId));
  const [answerDraft, setAnswerDraft] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [processingStageIds, setProcessingStageIds] = useState<ThinkingStageId[]>([
    'confirmAnswer',
  ]);
  const [answerQualityHint, setAnswerQualityHint] = useState<AnswerQuality | null>(null);
  const [contradiction, setContradiction] = useState<{
    issueId: AiPmLoopIssueId;
    factKey: ConversationFactKey;
    prior: string;
    next: string;
  } | null>(null);
  const [whyPanel, setWhyPanel] = useState<{
    explanation: string;
    evidence: string[];
    returnToLoopCta: string;
  } | null>(null);
  const [midJudgmentText, setMidJudgmentText] = useState<string | null>(null);
  const [editPriorOpen, setEditPriorOpen] = useState(false);
  /** Core Final — reframed question after nonsense / why / mid (W7/W8) */
  const [questionOverride, setQuestionOverride] = useState<{
    targetGap: string;
    questionText: string;
    whyNow: string;
    reason: ReframeReason;
  } | null>(null);

  const [updateSavedFlash, setUpdateSavedFlash] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [returnWelcomeDismissed, setReturnWelcomeDismissed] = useState(false);
  const [recognitionDismissed, setRecognitionDismissed] = useState(true);
  const confirmParkNotifiedRef = useRef(false);
  const processingTimerRef = useRef<number | null>(null);
  const finishProcessingRef = useRef<() => void>(() => {});
  const processingFinishedRef = useRef(false);
  /** Loop 9c — last rendered ask surface (survives brief whyThisQuestionNow null during phase flip) */
  const lastAskSurfaceRef = useRef<{ targetGap: string | null; questionText: string | null }>({
    targetGap: null,
    questionText: null,
  });
  /** Loop 9g — submit-time wrong_slot pin survives finishProcessing before turns SoT catches up */
  const wrongSlotSubmitPinRef = useRef<ReturnType<typeof resolveWrongSlotQuestionOverride>>(null);
  /** FIX 2 — pin ask surface during USER_TYPING / submit / processing until next commit */
  const lockedAskSurfaceRef = useRef<LockedAskSurface | null>(null);
  const [lockedAskSurface, setLockedAskSurface] = useState<LockedAskSurface | null>(() => {
    const stored = loadAiPmLoopState(projectId).lockedAskSurface ?? null;
    lockedAskSurfaceRef.current = stored;
    return stored;
  });
  const [answerInputFocused, setAnswerInputFocused] = useState(false);

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

  const livingState = useMemo(
    () =>
      buildLivingUnderstandingState({
        documentText: documentText ?? '',
        understanding,
        entities,
        turns: loopState.turns,
        memory: conversationMemory,
        resolvedIssueIds: getResolvedIssueIds(loopState),
      }),
    [conversationMemory, documentText, entities, loopState, understanding],
  );

  const pendingWrongSlotReask = useMemo(
    () => hasPendingWrongSlotReask(loopState.turns),
    [loopState.turns],
  );

  const turnsWrongSlotOverride = useMemo(
    () =>
      resolveWrongSlotQuestionOverride(loopState.turns) ??
      wrongSlotSubmitPinRef.current,
    [loopState.turns],
  );

  const displayPhase =
    pendingWrongSlotReask && loopState.phase === 'issue' ? 'answer' : loopState.phase;

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

  const questionLockActive = useMemo(
    () =>
      isQuestionTransitionLockActive({
        lock: lockedAskSurface,
        phase: loopState.phase,
        reanalyzing,
      }),
    [lockedAskSurface, loopState.phase, reanalyzing],
  );

  const whyThisQuestionNow = useMemo(() => {
    if (questionLockActive && lockedAskSurface) {
      return lockedAskSurface;
    }
    if (!activeIssueId) return null;

    const freshLoop = loadAiPmLoopState(projectId);

    // PR7 B1 — V3 ON: bind display from persisted lastDecision, never live rank
    if (shouldBindDisplayFromPersistedDecision(freshLoop)) {
      const persisted = resolveRemountAskSurface(freshLoop);
      if (persisted) {
        return {
          issueId: persisted.issueId,
          targetGap: persisted.targetGap,
          questionText: persisted.questionText,
          whyNow: persisted.whyNow,
          rationale: persisted.rationale,
          score: 0,
          missingField: 'business' as const,
        };
      }
    }

    const freshTurns = freshLoop.turns;
    const freshMemory = buildConversationMemoryFromSources({
      projectId: projectId ?? 'default',
      documentText: documentText ?? '',
      turns: freshTurns,
      entities,
      previous: loadConversationMemory(projectId),
    });

    // Loop 9d — decideNextQuestion is display SoT (wrong_slot anchor before ranked)
    const turnsOverride =
      resolveWrongSlotQuestionOverride(freshTurns) ?? wrongSlotSubmitPinRef.current;
    if (turnsOverride) {
      const purity = enforceQuestionPurity({
        questionText: turnsOverride.questionText,
        targetGap: turnsOverride.targetGap,
      });
      return {
        issueId: turnsOverride.issueId,
        targetGap: turnsOverride.targetGap,
        questionText: purity.sanitizedText,
        whyNow: turnsOverride.whyNow ?? turnsOverride.rationale,
        rationale: turnsOverride.rationale,
        score: turnsOverride.score,
        missingField: 'business' as const,
      };
    }

    const decision = resolveNextQuestionDecision({
      living: livingState,
      turns: freshTurns,
      memory: freshMemory,
      gapState: freshLoop.gapState,
      previousQuestionText: questionOverride?.questionText ?? null,
      projectId,
      persistLastDecision: false,
    });
    if (!decision) return null;

    let questionText = decision.questionText;
    let whyNow = decision.whyNow;
    let targetGap = decision.targetGap;

    if (questionOverride) {
      const stickyAsks = countUnclosedGapAsks(freshTurns, questionOverride.targetGap);
      const overrideStale =
        questionOverride.reason !== 'wrong_slot' &&
        questionOverride.targetGap !== targetGap &&
        stickyAsks >= MAX_SAME_GAP_ASKS_BEFORE_YIELD;
      const wrongSlotReAsk = questionOverride.reason === 'wrong_slot';
      if (
        !overrideStale &&
        (questionOverride.targetGap === targetGap ||
          questionOverride.reason === 'why_meta' ||
          questionOverride.reason === 'mid_judgment' ||
          questionOverride.reason === 'nonsense' ||
          questionOverride.reason === 'unknown_signal' ||
          questionOverride.reason === 'adaptive' ||
          wrongSlotReAsk)
      ) {
        questionText = questionOverride.questionText;
        whyNow = questionOverride.whyNow;
        targetGap = questionOverride.targetGap;
      }
    }

    const purity = enforceQuestionPurity({
      questionText,
      targetGap,
    });

    return {
      issueId: decision.issueId,
      targetGap,
      questionText: purity.sanitizedText,
      whyNow,
      rationale: isNextQuestionDecision(decision)
        ? decision.actionRationale
        : decision.rationale,
      score: decision.score,
      missingField: 'business' as const,
    };
  }, [
    activeIssueId,
    understanding,
    loopState,
    documentText,
    entities,
    conversationMemory,
    analysisResultExists,
    questionOverride,
    livingState,
    lockedAskSurface,
    questionLockActive,
  ]);
  const s11Surface = useMemo(() => {
    const askIssueId = loopState.currentIssueId ?? nextIssue;
    const turnsPin = turnsWrongSlotOverride;
    const targetGap =
      turnsPin?.targetGap ?? whyThisQuestionNow?.targetGap ?? null;
    const gapQuestionText =
      turnsPin?.questionText ?? whyThisQuestionNow?.questionText ?? null;
    const showUpdate =
      displayPhase === 'issue' &&
      lastTurn != null &&
      !recognitionDismissed &&
      lastTurn.issueId !== askIssueId &&
      !pendingWrongSlotReask;

    const thinking = presentThinking({
      memory: conversationMemory,
      documentText: documentText ?? '',
      entities,
      nextIssueId: askIssueId,
      targetGap,
    });

    // Founder never picks a path — only answers. S11: Engine → Presenter Contract only.
    let surface = showUpdate
      ? presentS11Surface(thinking, {
          mode: 'update',
          answeredIssueId: lastTurn.issueId,
          nextIssueId: askIssueId,
          documentText: documentText ?? '',
          targetGap,
          gapQuestionText,
        })
      : presentS11Surface(thinking, {
          mode: 'ask',
          showDocumentLead: loopState.turns.length === 0,
          documentText: documentText ?? '',
          targetGap,
          gapQuestionText,
        });

    // CPO AC-1 — prefer Living/conflict whyNow over generic unlock purpose
    const whyNow = whyThisQuestionNow?.whyNow ?? whyThisQuestionNow?.rationale;
    if (whyNow && surface.question.text.trim()) {
      surface = {
        ...surface,
        question: {
          ...surface.question,
          purpose: whyNow,
          text: gapQuestionText?.trim() || surface.question.text,
        },
      };
    } else if (gapQuestionText?.trim()) {
      surface = {
        ...surface,
        question: { ...surface.question, text: gapQuestionText.trim() },
      };
    }
    if ((displayPhase === 'answer' || questionOverride?.reason === 'wrong_slot' || pendingWrongSlotReask) && (targetGap || gapQuestionText)) {
      lastAskSurfaceRef.current = {
        targetGap,
        questionText: gapQuestionText ?? surface.question.text ?? null,
      };
    }
    return surface;
  }, [
    conversationMemory,
    documentText,
    entities,
    loopState.currentIssueId,
    displayPhase,
    loopState.turns.length,
    nextIssue,
    lastTurn,
    recognitionDismissed,
    whyThisQuestionNow,
    questionOverride,
    pendingWrongSlotReask,
    turnsWrongSlotOverride,
  ]);

  const displayQuestionText = useMemo(() => {
    const fromEngine =
      whyThisQuestionNow?.questionText?.trim() ||
      turnsWrongSlotOverride?.questionText?.trim() ||
      '';
    const fromSurface = s11Surface.question.text.trim();
    const fromRef = lastAskSurfaceRef.current.questionText?.trim() ?? '';
    const issueFallback =
      activeIssueId != null ? t(`issues.${activeIssueId}.question`) : '';
    const targetGap =
      lockedAskSurface?.targetGap ??
      questionOverride?.targetGap ??
      whyThisQuestionNow?.targetGap ??
      turnsWrongSlotOverride?.targetGap ??
      lastAskSurfaceRef.current.targetGap ??
      null;
    return resolveDisplayQuestionWithLock({
      lock: lockedAskSurface,
      lockActive: questionLockActive,
      fromOverride: questionOverride?.questionText?.trim(),
      fromEngine,
      fromSurface,
      fromRef,
      issueFallback,
      targetGap,
      fallbackIssueId: activeIssueId,
    });
  }, [
    activeIssueId,
    lockedAskSurface,
    questionLockActive,
    questionOverride?.questionText,
    questionOverride?.targetGap,
    s11Surface.question.text,
    t,
    turnsWrongSlotOverride?.questionText,
    turnsWrongSlotOverride?.targetGap,
    whyThisQuestionNow?.questionText,
    whyThisQuestionNow?.targetGap,
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

  const ceoSixSurfaces = useMemo(() => {
    if (!isV3ReviewPipelineActive()) return null;
    const loop = loadAiPmLoopState(projectId);
    const turn = loop.turns.at(-1) ?? null;
    if (!turn?.review && !loop.lastDecision) return null;
    return buildCeoSixSurfaces({
      lastTurn: turn,
      gapState: loop.gapState,
      lastDecision: loop.lastDecision,
      lockedAskSurface: loop.lockedAskSurface,
      loop,
    });
  }, [loopState.turns.length, loopState.gapState, loopState.lastDecision, projectId]);

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

  const clearQuestionLock = useCallback(() => {
    lockedAskSurfaceRef.current = null;
    setLockedAskSurface(null);
    setAnswerInputFocused(false);
    patchAiPmLoopState({ lockedAskSurface: null }, projectId);
  }, [projectId]);

  const commitQuestionLock = useCallback(
    (surface: LockedAskSurface | null) => {
      lockedAskSurfaceRef.current = surface;
      setLockedAskSurface(surface);
      patchAiPmLoopState({ lockedAskSurface: surface }, projectId);
      if (surface) {
        lastAskSurfaceRef.current = {
          targetGap: surface.targetGap,
          questionText: surface.questionText,
        };
      }
    },
    [projectId],
  );

  const activateQuestionLock = useCallback(() => {
    const issueId = loopState.currentIssueId ?? nextIssue;
    if (!issueId) return;
    const captured = captureLockedAskSurface({
      issueId: whyThisQuestionNow?.issueId ?? issueId,
      targetGap:
        lockedAskSurfaceRef.current?.targetGap ??
        whyThisQuestionNow?.targetGap ??
        lastAskSurfaceRef.current.targetGap ??
        questionOverride?.targetGap,
      questionText:
        lockedAskSurfaceRef.current?.questionText ??
        whyThisQuestionNow?.questionText ??
        lastAskSurfaceRef.current.questionText ??
        questionOverride?.questionText,
      whyNow:
        lockedAskSurfaceRef.current?.whyNow ??
        whyThisQuestionNow?.whyNow ??
        questionOverride?.whyNow,
      rationale:
        lockedAskSurfaceRef.current?.rationale ??
        whyThisQuestionNow?.rationale,
      score: lockedAskSurfaceRef.current?.score ?? whyThisQuestionNow?.score,
      missingField: lockedAskSurfaceRef.current?.missingField ?? whyThisQuestionNow?.missingField,
      fallbackIssueId: issueId,
    });
    if (!captured) return;
    commitQuestionLock(captured);
  }, [
    commitQuestionLock,
    loopState.currentIssueId,
    nextIssue,
    questionOverride?.targetGap,
    questionOverride?.questionText,
    questionOverride?.whyNow,
    whyThisQuestionNow,
  ]);

  /** FIX 1 CASE A — re-read sessionStorage after DB hydrator, revalidate, or project switch */
  useLayoutEffect(() => {
    const stored = loadAiPmLoopState(projectId);
    const hydrated = isV3ReviewPipelineActive()
      ? hydrateAiPmLoopState({ merged: stored, client: stored, db: stored })
      : stored;
    if (hydrated !== stored) {
      patchAiPmLoopState(hydrated, projectId);
    }
    syncState(hydrated);
    const storedLock = hydrated.lockedAskSurface ?? null;
    lockedAskSurfaceRef.current = storedLock;
    setLockedAskSurface(storedLock);
    setRecognitionDismissed(true);
  }, [projectId, workspaceSnapshotUpdatedAt, syncState]);

  useEffect(() => {
    const storedLock = loadAiPmLoopState(projectId).lockedAskSurface ?? null;
    lockedAskSurfaceRef.current = storedLock;
    setLockedAskSurface(storedLock);
  }, [projectId]);

  const finishProcessing = useCallback(() => {
    if (processingFinishedRef.current) return;
    processingFinishedRef.current = true;
    if (processingTimerRef.current != null) {
      window.clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setReanalyzing(false);
    setUpdateSavedFlash(true);
    const refreshed = loadAiPmLoopState(projectId);
    const doc = loadWorkspaceDocumentText(projectId) ?? '';
    const freshUnderstanding = doc.trim() ? buildBusinessUnderstanding(doc) : understanding;

    if (!freshUnderstanding) {
      syncState(refreshed);
      onDocumentUpdated?.(refreshed.currentIssueId ?? 'problem_definition', '');
      window.setTimeout(() => setUpdateSavedFlash(false), 2200);
      return;
    }

    const result = runLoopAnswerProcessing({
      projectId,
      documentText: doc,
      understanding: freshUnderstanding,
      entities,
    });

    const contradictionGaps = result.living.claims.filter((c) => c.status === 'contradiction').length;
    // Core v5 — critical viability gaps (customer/problem/payer/competition/diff) block complete
    const criticalViability = countCriticalViabilityGaps(result.living);

    const canComplete =
      !result.nextIssueId &&
      criticalViability === 0 &&
      contradictionGaps === 0 &&
      !criticalGapsBlockAnalysis(result.living) &&
      canEnterValidation({
        loop: refreshed,
        memory: result.memory,
        entities,
        understandingCoveragePercent: result.living.coveragePercent,
        criticalGapCount: contradictionGaps + criticalViability,
      });

    const wrongSlotBefore =
      resolveWrongSlotQuestionOverride(refreshed.turns) ?? wrongSlotSubmitPinRef.current;
    const next = wrongSlotBefore
      ? patchAiPmLoopState(
          {
            phase: 'answer',
            currentIssueId: wrongSlotBefore.issueId,
          },
          projectId,
        )
      : applyLoopProcessingTransition(result, projectId, canComplete);
    const wrongSlotAfter =
      resolveWrongSlotQuestionOverride(next.turns) ?? wrongSlotBefore;
    if (wrongSlotAfter) {
      setQuestionOverride({
        targetGap: wrongSlotAfter.targetGap,
        questionText: wrongSlotAfter.questionText,
        whyNow: wrongSlotAfter.whyNow ?? wrongSlotAfter.rationale,
        reason: 'wrong_slot',
      });
      // Loop 9e — skip ranked issue phase; display wrong-slot re-ask immediately
      syncState(
        patchAiPmLoopState(
          {
            phase: 'answer',
            currentIssueId: wrongSlotAfter.issueId,
          },
          projectId,
        ),
      );
      const purity = enforceQuestionPurity({
        questionText: wrongSlotAfter.questionText,
        targetGap: wrongSlotAfter.targetGap,
      });
      commitQuestionLock(
        captureLockedAskSurface({
          issueId: wrongSlotAfter.issueId,
          targetGap: wrongSlotAfter.targetGap,
          questionText: purity.sanitizedText,
          whyNow: wrongSlotAfter.whyNow ?? wrongSlotAfter.rationale,
          rationale: wrongSlotAfter.rationale,
          score: wrongSlotAfter.score,
          missingField: wrongSlotAfter.missingField,
          fallbackIssueId: wrongSlotAfter.issueId,
        }),
      );
    } else {
      wrongSlotSubmitPinRef.current = null;
      // TTAEJYO CASE A — skip recognition interstitial; open answer surface immediately
      const opened =
        next.phase === 'issue' && next.currentIssueId
          ? patchAiPmLoopState({ phase: 'answer' }, projectId)
          : next;
      setRecognitionDismissed(true);
      syncState(opened);
      const openedState = loadAiPmLoopState(projectId);
      const freshMemory = buildConversationMemoryFromSources({
        projectId: projectId ?? 'default',
        documentText: doc,
        turns: openedState.turns,
        entities,
        previous: loadConversationMemory(projectId),
      });
      const decision = resolveNextQuestionDecision({
        living: result.living,
        turns: openedState.turns,
        memory: freshMemory,
        gapState: openedState.gapState,
        projectId,
      });
      if (decision) {
        const purity = enforceQuestionPurity({
          questionText: decision.questionText,
          targetGap: decision.targetGap,
        });
        const whyNow = decision.whyNow;
        commitQuestionLock(
          captureLockedAskSurface({
            issueId: decision.issueId,
            targetGap: decision.targetGap,
            questionText: purity.sanitizedText,
            whyNow,
            rationale: isNextQuestionDecision(decision)
              ? decision.actionRationale
              : decision.rationale,
            score: decision.score,
            fallbackIssueId: decision.issueId,
          }),
        );
      }
    }

    if (next.phase === 'complete') onLoopComplete?.();
    onDocumentUpdated?.(
      loadAiPmLoopState(projectId).currentIssueId ?? 'problem_definition',
      '',
    );
    window.setTimeout(() => setUpdateSavedFlash(false), 2200);
  }, [commitQuestionLock, entities, onDocumentUpdated, onLoopComplete, projectId, syncState, understanding]);

  finishProcessingRef.current = finishProcessing;

  /** Core Final — after why/mid panel close, re-judge via V3 review→decide (PR7 B7). */
  const closeWhyOrMidAndRejudge = useCallback(() => {
    const reason: ReframeReason = whyPanel ? 'why_meta' : 'mid_judgment';
    setWhyPanel(null);
    setMidJudgmentText(null);

    const freshLoop = loadAiPmLoopState(projectId);
    const freshTurns = freshLoop.turns;

    if (isV3ReviewPipelineActive()) {
      const decision = resolveV3PanelDecision({
        living: livingState,
        turns: freshTurns,
        memory: conversationMemory,
        gapState: freshLoop.gapState,
        previousQuestionText: whyThisQuestionNow?.questionText ?? null,
      });
      if (decision) {
        const purity = enforceQuestionPurity({
          questionText: decision.questionText,
          targetGap: decision.targetGap,
        });
        setQuestionOverride({
          targetGap: decision.targetGap,
          questionText: purity.sanitizedText,
          whyNow: decision.whyNow,
          reason,
        });
        commitQuestionLock(
          captureLockedAskSurface({
            issueId: decision.issueId,
            targetGap: decision.targetGap,
            questionText: purity.sanitizedText,
            whyNow: decision.whyNow,
            rationale: decision.actionRationale,
            fallbackIssueId: decision.issueId,
          }),
        );
        if (decision.issueId !== loopState.currentIssueId) {
          patchAiPmLoopState({ currentIssueId: decision.issueId }, projectId);
          syncState(loadAiPmLoopState(projectId));
        }
      }
      return;
    }

    const inFlightGap = whyThisQuestionNow?.targetGap ?? questionOverride?.targetGap ?? null;
    const gap = resolvePreservedGapAfterMeta({
      living: livingState,
      turns: loopState.turns,
      inFlightGap,
    });
    const top = getWhyThisQuestionNow(understanding, loopState, {
      documentText: documentText ?? undefined,
      entities,
      memory: conversationMemory,
      analysisResultExists,
      turns: freshTurns,
    });
    const prevQ = whyThisQuestionNow?.questionText ?? top?.questionText ?? null;
    const reframed = reframeQuestion({
      targetGap: gap,
      living: livingState,
      reason,
      previousQuestionText: prevQ,
    });
    setQuestionOverride({
      targetGap: reframed.targetGap,
      questionText: reframed.questionText,
      whyNow: reframed.whyNow,
      reason,
    });
    commitQuestionLock(
      captureLockedAskSurface({
        issueId: top?.issueId ?? loopState.currentIssueId ?? 'problem_definition',
        targetGap: reframed.targetGap,
        questionText: reframed.questionText,
        whyNow: reframed.whyNow,
        rationale: reframed.whyNow,
        fallbackIssueId: top?.issueId ?? loopState.currentIssueId ?? 'problem_definition',
      }),
    );
    const issueForGap = top?.issueId ?? loopState.currentIssueId;
    if (issueForGap && issueForGap !== loopState.currentIssueId) {
      patchAiPmLoopState({ currentIssueId: issueForGap }, projectId);
      syncState(loadAiPmLoopState(projectId));
    }
  }, [
    analysisResultExists,
    commitQuestionLock,
    conversationMemory,
    documentText,
    entities,
    livingState,
    loopState,
    projectId,
    questionOverride?.targetGap,
    syncState,
    understanding,
    whyPanel,
    whyThisQuestionNow,
  ]);

  const startProcessing = useCallback(() => {
    processingFinishedRef.current = false;
    setReanalyzing(true);
    setUpdateSavedFlash(false);
    setAiPmLoopPhase('reanalyze', projectId);

    const doc = loadWorkspaceDocumentText(projectId) ?? '';
    const freshUnderstanding = doc.trim() ? buildBusinessUnderstanding(doc) : understanding;
    if (freshUnderstanding) {
      const result = runLoopAnswerProcessing({
        projectId,
        documentText: doc,
        understanding: freshUnderstanding,
        entities,
      });
      setProcessingStageIds(result.completedStages);
    } else {
      setProcessingStageIds(THINKING_STAGES.map((s) => s.id));
    }

    syncState(loadAiPmLoopState(projectId));
  }, [entities, projectId, syncState, understanding]);

  // Recover durable `reanalyze` left by remount — run real pipeline, UI completes via stages.
  useEffect(() => {
    if (loopState.phase !== 'reanalyze') return;
    if (reanalyzing) return;
    processingFinishedRef.current = false;
    setReanalyzing(true);
    const doc = loadWorkspaceDocumentText(projectId) ?? '';
    const freshUnderstanding = doc.trim() ? buildBusinessUnderstanding(doc) : understanding;
    if (freshUnderstanding) {
      const result = runLoopAnswerProcessing({
        projectId,
        documentText: doc,
        understanding: freshUnderstanding,
        entities,
      });
      setProcessingStageIds(result.completedStages);
    } else {
      setProcessingStageIds(THINKING_STAGES.map((s) => s.id));
    }
  }, [entities, loopState.phase, projectId, reanalyzing, understanding]);

  useEffect(() => {
    return () => {
      if (processingTimerRef.current != null) {
        window.clearTimeout(processingTimerRef.current);
      }
    };
  }, []);

  // Loop 9c — turns-derived wrong_slot SoT across render cycles until on-slot answer
  useEffect(() => {
    if (loopState.phase === 'reanalyze') return;
    const turns = loadAiPmLoopState(projectId).turns;
    const wrongSlot = resolveWrongSlotQuestionOverride(turns);
    if (
      wrongSlot &&
      lockedAskSurfaceRef.current &&
      isQuestionTransitionLockActive({
        lock: lockedAskSurfaceRef.current,
        phase: loopState.phase,
        reanalyzing,
      }) &&
      shouldRejectStaleAskSurfaceUpdate({
        committedLock: lockedAskSurfaceRef.current,
        incoming: wrongSlot,
      })
    ) {
      return;
    }
    if (!wrongSlot) {
      setQuestionOverride((prev) => (prev?.reason === 'wrong_slot' ? null : prev));
      return;
    }
    setQuestionOverride((prev) => {
      const next = {
        targetGap: wrongSlot.targetGap,
        questionText: wrongSlot.questionText,
        whyNow: wrongSlot.whyNow ?? wrongSlot.rationale,
        reason: 'wrong_slot' as const,
      };
      if (
        prev?.reason === 'wrong_slot' &&
        prev.targetGap === next.targetGap &&
        prev.questionText === next.questionText
      ) {
        return prev;
      }
      return next;
    });
    const current = loadAiPmLoopState(projectId);
    if (wrongSlot.issueId !== current.currentIssueId || current.phase === 'issue') {
      syncState(
        patchAiPmLoopState(
          {
            phase: 'answer',
            currentIssueId: wrongSlot.issueId,
          },
          projectId,
        ),
      );
    }
  }, [loopState.phase, loopState.turns.length, projectId, reanalyzing, syncState]);

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
    if (!issueId || trimmed.length < 2 || readOnly) return;

    activateQuestionLock();

    const memory = loadConversationMemory(projectId);
    const existingFactsByKey: Partial<Record<ConversationFactKey, string | null>> = {};
    for (const fact of memory.facts) {
      if ((fact.lifecycle ?? 'current') === 'current') {
        existingFactsByKey[fact.key] = fact.value;
      }
    }
    const askedKey = factKeyForIssue(issueId);
    const existingFact = askedKey ? getFact(memory, askedKey)?.value ?? null : null;

    const refText = lastAskSurfaceRef.current.questionText;
    const refGap =
      inferTargetGapFromQuestionText(refText) ?? lastAskSurfaceRef.current.targetGap;
    const liveGap =
      whyThisQuestionNow?.targetGap ??
      inferTargetGapFromQuestionText(whyThisQuestionNow?.questionText);
    const liveText = whyThisQuestionNow?.questionText ?? questionOverride?.questionText ?? null;
    // Loop 9h-c — stale ref from prior wrong_slot must not poison solution (or other) append
    const displayedQuestionText =
      liveGap && refGap && liveGap !== refGap
        ? liveText ?? refText
        : refText ?? liveText;
    const displayedGap =
      inferTargetGapFromQuestionText(displayedQuestionText) ??
      lastAskSurfaceRef.current.targetGap ??
      whyThisQuestionNow?.targetGap ??
      null;
    // Loop 9c — wrong_slot override is authoritative for append; else match displayed gap only
    // Loop 9h-c — never apply wrong_slot override when visible Q is a different gap (poisons solution ask)
    const activeOverrideGap =
      questionOverride?.reason === 'wrong_slot' &&
      displayedGap &&
      questionOverride.targetGap === displayedGap
        ? questionOverride.targetGap
        : questionOverride?.targetGap && questionOverride.targetGap === displayedGap
          ? questionOverride.targetGap
          : null;
    const freshLoopForGap = loadAiPmLoopState(projectId);
    const askedTargetGap = resolveAskedTargetGapForAppend({
      issueId,
      whyTargetGap: displayedGap,
      overrideTargetGap: activeOverrideGap,
      questionText: displayedQuestionText,
      lastDecisionTargetGap: resolveV3FallbackTargetGap(freshLoopForGap),
      fallbackTargetGap: isV3ReviewPipelineActive()
        ? null
        : getWhyThisQuestionNow(understanding, loopState, {
            documentText: documentText ?? undefined,
            entities,
            memory: conversationMemory,
            analysisResultExists,
            turns: freshLoopForGap.turns,
          })?.targetGap,
    });
    const visibleGap =
      inferTargetGapFromQuestionText(displayedQuestionText) ?? displayedGap;
    // V3-TD-01 — 선언 타입만 명시한다(런타임 동작 변경 없음).
    // inferTargetGapFromQuestionText()와 buildAnswerReview() 모두 gap 식별자를
    // string|null로 돌려주는데, 이 지역변수는 초기값만 보고 string으로 추론돼
    // V3 분기의 대입(string|null)에서 어긋났다. gap 식별자는 ConversationFactKey가
    // 아니라 별도 도메인이므로(solution/customerPersona 등 포함) 좁히지 않고
    // 실제 도메인 그대로 string|null로 선언한다.
    let resolvedAskedGap: string | null = visibleGap ?? askedTargetGap;
    let v3Review: AnswerReview | undefined;

    // V3-TD-01 — 어노테이션이 없으면 TS가 V3 분기(SemanticInterpretation)와 legacy
    // 분기의 인라인 객체 리터럴을 union으로 추론해, factKey/resolvedIssueId가 string
    // 으로 넓어진다. 정본 타입을 명시해 리터럴에 contextual typing이 걸리게 한다.
    let semantic: SemanticInterpretation;
    let nuclearWrongSlot: ReturnType<typeof resolveNuclearWrongSlotAtSubmit> = null;

    if (isV3ReviewPipelineActive()) {
      const projectedTurnId = new Date().toISOString();
      const v3Result = buildAnswerReview({
        turnId: projectedTurnId,
        askedGapId: resolvedAskedGap ?? visibleGap ?? askedTargetGap ?? 'payer',
        askedQuestionText: displayedQuestionText ?? '',
        askedIssueId: issueId,
        userAnswer: trimmed,
        existingFact,
        existingFactsByKey,
        displayedQuestionText: displayedQuestionText ?? '',
      });
      semantic = v3Result.semantic;
      resolvedAskedGap = v3Result.resolvedAskedGap;
      nuclearWrongSlot = v3Result.nuclearWrongSlot;
      v3Review = v3Result.review;
    } else {
      semantic = interpretAnswerSemantics({
        answer: trimmed,
        askedIssueId: issueId,
        existingFact,
        existingFactsByKey,
        askedTargetGap: visibleGap ?? resolvedAskedGap,
      });

      // Loop 9e — display SoT canonicalizes facts when interpret used poisoned askedGap (@ cbce256 live)
      const displayedGapForCanonical =
        inferTargetGapFromQuestionText(displayedQuestionText) ?? visibleGap;

      // Loop 9h-c — solution Q text wins over poisoned askedTargetGap / issue template
      if (
        displayedGapForCanonical === 'solution' &&
        semantic.mergeable
      ) {
        resolvedAskedGap = 'solution';
        if (!semantic.facts.some((f) => f.key === 'business')) {
          semantic = {
            ...semantic,
            factKey: 'business',
            resolvedIssueId: 'problem_definition',
            facts: [{ key: 'business', issueId: 'problem_definition' }],
          };
        }
      } else if (displayedGapForCanonical === 'payer' && semantic.mergeable) {
        if (semantic.factKey !== 'buyer' && isOnSlotPayerAnswer(trimmed)) {
          semantic = {
            ...semantic,
            factKey: 'buyer',
            resolvedIssueId: 'bm_design',
            facts: [{ key: 'buyer', issueId: 'bm_design' }],
          };
        }
      } else if (displayedGapForCanonical === 'alternativesCompetitors' && semantic.mergeable) {
        if (semantic.factKey !== 'competitor' && isOnSlotCompetitorAnswer(trimmed)) {
          semantic = {
            ...semantic,
            factKey: 'competitor',
            resolvedIssueId: 'competitor_analysis',
            facts: [{ key: 'competitor', issueId: 'competitor_analysis' }],
          };
        }
      } else if (displayedGapForCanonical === 'customerPersona' && semantic.mergeable) {
        if (isRelevanceDominantOnPersonaAsk(trimmed)) {
          semantic = {
            ...semantic,
            factKey: 'diffRelevance',
            resolvedIssueId: 'competitor_analysis',
            facts: [{ key: 'diffRelevance', issueId: 'competitor_analysis' }],
          };
          resolvedAskedGap = 'customerPersona';
        } else if (
          hasPersonaSegmentCue(trimmed) &&
          semantic.factKey !== 'customer'
        ) {
          semantic = {
            ...semantic,
            factKey: 'customer',
            resolvedIssueId: 'customer_definition',
            facts: [{ key: 'customer', issueId: 'customer_definition' }],
          };
        }
      } else if (displayedGapForCanonical === 'problemJtbd' && semantic.mergeable) {
        const personaSegmentCue = hasPersonaSegmentCue(trimmed);
        const problemCue =
          /(불편|pain|문제|해결|jtbd|획일|동선\s*낭비|맞춤\s*일정|패키지)/i.test(trimmed);
        if (personaSegmentCue && !problemCue) {
          semantic = {
            ...semantic,
            factKey: 'customer',
            resolvedIssueId: 'customer_definition',
            facts: [{ key: 'customer', issueId: 'customer_definition' }],
          };
          resolvedAskedGap = 'problemJtbd';
        }
      }

      // Loop 9c — never persist validationTestability when visible ask was persona + diffRelevance
      if (
        semantic.factKey === 'diffRelevance' &&
        semantic.mergeable &&
        inferTargetGapFromQuestionText(displayedQuestionText) === 'customerPersona'
      ) {
        resolvedAskedGap = 'customerPersona';
      }
      if (
        semantic.factKey === 'customer' &&
        semantic.mergeable &&
        inferTargetGapFromQuestionText(displayedQuestionText) === 'problemJtbd'
      ) {
        resolvedAskedGap = 'problemJtbd';
      }

      // Loop 9f — nuclear wrong-slot: display persona + BANK.diffRelevance (or problem + persona)
      nuclearWrongSlot = resolveNuclearWrongSlotAtSubmit({
        questionText: displayedQuestionText,
        answer: trimmed,
      });
      if (nuclearWrongSlot) {
        resolvedAskedGap = nuclearWrongSlot.askedGap;
        if (nuclearWrongSlot.closedFactKey === 'diffRelevance') {
          semantic = {
            ...semantic,
            factKey: 'diffRelevance',
            resolvedIssueId: 'competitor_analysis',
            facts: [{ key: 'diffRelevance', issueId: 'competitor_analysis' }],
          };
        } else if (nuclearWrongSlot.closedFactKey === 'customer') {
          semantic = {
            ...semantic,
            factKey: 'customer',
            resolvedIssueId: 'customer_definition',
            facts: [{ key: 'customer', issueId: 'customer_definition' }],
          };
        }
      }
    }

    const persistedQuestionText =
      displayedQuestionText?.trim() ||
      (resolvedAskedGap
        ? resolveGapQuestionBinding(resolvedAskedGap).questionText
        : undefined);

    // Why / mid-judgment — display only, never append Fact turn; reframe on return (W8)
    if (semantic.intent === 'why_meta' || semantic.intent === 'mid_judgment') {
      const preview = applyWorkspaceLoopAnswer(issueId, trimmed, projectId, { semantic });
      setAnswerQualityHint(null);
      setContradiction(null);
      if (semantic.intent === 'why_meta' && preview.whyFollowUp) {
        setWhyPanel(preview.whyFollowUp);
        setMidJudgmentText(null);
      } else {
        setMidJudgmentText(preview.midJudgmentText ?? semantic.rationale);
        setWhyPanel(null);
      }
      setAnswerDraft('');
      return;
    }

    if (semantic.quality === 'CONTRADICTORY' && semantic.factKey && existingFactsByKey[semantic.factKey]) {
      setAnswerQualityHint('CONTRADICTORY');
      const prior = existingFactsByKey[semantic.factKey]!;
      setContradiction({
        issueId: semantic.resolvedIssueId ?? issueId,
        factKey: semantic.factKey,
        prior,
        next: trimmed,
      });
      // V3-TD-01 — targetGap 소비처는 optional(string | undefined) 계약이다.
    // gap이 없을 때 null을 넘기던 것을 계약에 맞춰 undefined로 정규화한다
    // (이 코드베이스에서 gap 부재는 null/undefined 구분 없이 동일하게 다뤄진다).
    const askedGap = resolvedAskedGap ?? undefined;
      const conflictAppliedAt = new Date().toISOString();
      const conflictReview: AnswerReview | undefined = v3Review
        ? {
            ...v3Review,
            turnId: conflictAppliedAt,
            sourceTurnId: conflictAppliedAt,
          }
        : undefined;

      // PR7 B5 — V3 ON: clarify via review→decide, not panel buildConflictClarifyQuestion
      if (isV3ReviewPipelineActive() && conflictReview) {
        appendAiPmLoopTurn(
          {
            issueId,
            answer: trimmed,
            appliedAt: conflictAppliedAt,
            semanticFactKey: semantic.factKey,
            semanticFactKeys: semantic.facts.map((f) => f.key),
            intent: semantic.intent,
            targetGap: askedGap,
            understandingDelta: `충돌: ${semantic.factKey} — 기존 값과 새 답 중 어느 쪽이 맞는지 확인 필요`,
            review: conflictReview,
          },
          projectId,
        );
        applyWorkspaceLoopAnswer(issueId, trimmed, projectId, { semantic });
        const conflictLoop = loadAiPmLoopState(projectId);
        const decision = resolveV3PanelDecision({
          living: livingState,
          turns: conflictLoop.turns,
          memory: conversationMemory,
          gapState: conflictLoop.gapState,
          previousQuestionText: displayedQuestionText,
        });
        if (decision) {
          const purity = enforceQuestionPurity({
            questionText: decision.questionText,
            targetGap: decision.targetGap,
          });
          setQuestionOverride({
            targetGap: decision.targetGap,
            questionText: purity.sanitizedText,
            whyNow: decision.whyNow,
            reason: 'adaptive',
          });
          commitQuestionLock(
            captureLockedAskSurface({
              issueId: decision.issueId,
              targetGap: decision.targetGap,
              questionText: purity.sanitizedText,
              whyNow: decision.whyNow,
              rationale: decision.actionRationale,
              fallbackIssueId: decision.issueId,
            }),
          );
        }
        patchAiPmLoopState({ phase: 'answer', currentIssueId: issueId }, projectId);
        syncState(loadAiPmLoopState(projectId));
        setAnswerDraft('');
        return;
      }

      const conflictClarify = buildConflictClarifyQuestion({
        factKey: semantic.factKey,
        targetGap: askedGap,
        priorValue: prior,
        newValue: trimmed,
        living: livingState,
      });
      setQuestionOverride({
        targetGap: conflictClarify.targetGap,
        questionText: conflictClarify.questionText,
        whyNow: conflictClarify.whyNow,
        reason: 'adaptive',
      });
      // Persist conflict delta so mergeable-looking turns never show empty understandingDelta
      appendAiPmLoopTurn(
        {
          issueId,
          answer: trimmed,
          appliedAt: conflictAppliedAt,
          semanticFactKey: semantic.factKey,
          semanticFactKeys: semantic.facts.map((f) => f.key),
          intent: semantic.intent,
          targetGap: conflictClarify.targetGap,
          understandingDelta: `충돌: ${semantic.factKey} — 기존 값과 새 답 중 어느 쪽이 맞는지 확인 필요 · 미확인: ${conflictClarify.targetGap}`,
          ...(conflictReview ? { review: conflictReview } : {}),
        },
        projectId,
      );
      applyWorkspaceLoopAnswer(issueId, trimmed, projectId, { semantic });
      // Keep loop open for conflict resolution — never soft-complete
      patchAiPmLoopState(
        {
          phase: 'answer',
          currentIssueId: issueId,
        },
        projectId,
      );
      syncState(loadAiPmLoopState(projectId));
      setAnswerDraft('');
      return;
    }

    if (!semantic.mergeable) {
      // PR7 B4 — V3 ON: probe via review→decide, not panel getWhyThisQuestionNow + reframeQuestion
      if (isV3ReviewPipelineActive() && v3Review) {
        const probeAppliedAt = new Date().toISOString();
        const probeReview: AnswerReview = {
          ...v3Review,
          turnId: probeAppliedAt,
          sourceTurnId: probeAppliedAt,
        };
        appendAiPmLoopTurn(
          {
            issueId,
            answer: trimmed,
            appliedAt: probeAppliedAt,
            intent: semantic.intent,
            targetGap: resolvedAskedGap ?? undefined,
            understandingDelta: semantic.rationale,
            review: probeReview,
          },
          projectId,
        );
        const probeLoop = loadAiPmLoopState(projectId);
        const decision = resolveV3PanelDecision({
          living: livingState,
          turns: probeLoop.turns,
          memory: conversationMemory,
          gapState: probeLoop.gapState,
          previousQuestionText: displayedQuestionText,
        });
        if (decision) {
          const purity = enforceQuestionPurity({
            questionText: decision.questionText,
            targetGap: decision.targetGap,
          });
          const reason: ReframeReason =
            semantic.intent === 'nonsense'
              ? 'nonsense'
              : semantic.quality === 'PARTIAL'
                ? 'adaptive'
                : 'unknown_signal';
          setQuestionOverride({
            targetGap: decision.targetGap,
            questionText: purity.sanitizedText,
            whyNow: decision.whyNow,
            reason,
          });
          commitQuestionLock(
            captureLockedAskSurface({
              issueId: decision.issueId,
              targetGap: decision.targetGap,
              questionText: purity.sanitizedText,
              whyNow: decision.whyNow,
              rationale: decision.actionRationale,
              fallbackIssueId: decision.issueId,
            }),
          );
          if (decision.issueId !== loopState.currentIssueId) {
            patchAiPmLoopState({ currentIssueId: decision.issueId }, projectId);
            syncState(loadAiPmLoopState(projectId));
          }
        }
        setAnswerQualityHint(semantic.quality);
        setContradiction(null);
        setAnswerDraft('');
        return;
      }

      // Core Final W7 — nonsense / unknown / weak relevance → REFRAME on adaptive top gap
      const preserveGap =
        semantic.quality === 'PARTIAL' && whyThisQuestionNow?.targetGap
          ? whyThisQuestionNow.targetGap
          : null;
      const freshTurns = loadAiPmLoopState(projectId).turns;
      const top = getWhyThisQuestionNow(understanding, loopState, {
        documentText: documentText ?? undefined,
        entities,
        memory: conversationMemory,
        analysisResultExists,
        turns: freshTurns,
      });
      const gap =
        preserveGap ??
        top?.targetGap ??
        whyThisQuestionNow?.targetGap ??
        'problemJtbd';
      const reason: ReframeReason =
        semantic.intent === 'nonsense'
          ? 'nonsense'
          : semantic.quality === 'PARTIAL'
            ? 'adaptive'
            : 'unknown_signal';
      const reframed = reframeQuestion({
        targetGap: gap,
        living: livingState,
        reason,
        previousQuestionText: whyThisQuestionNow?.questionText ?? top?.questionText,
      });
      setQuestionOverride({
        targetGap: reframed.targetGap,
        questionText: reframed.questionText,
        whyNow: reframed.whyNow,
        reason,
      });
      commitQuestionLock(
        captureLockedAskSurface({
          issueId: top?.issueId ?? loopState.currentIssueId ?? issueId,
          targetGap: reframed.targetGap,
          questionText: reframed.questionText,
          whyNow: reframed.whyNow,
          rationale: reframed.whyNow,
          fallbackIssueId: top?.issueId ?? loopState.currentIssueId ?? issueId,
        }),
      );
      if (top?.issueId && top.issueId !== loopState.currentIssueId) {
        patchAiPmLoopState({ currentIssueId: top.issueId }, projectId);
        syncState(loadAiPmLoopState(projectId));
      }
      setAnswerQualityHint(semantic.quality);
      setContradiction(null);
      setAnswerDraft('');
      return;
    }

    setAnswerQualityHint(null);
    setContradiction(null);
    setWhyPanel(null);
    setMidJudgmentText(null);

    logG1LoopEvent({
      event: 'answer_submit',
      workspace: g1WorkspaceLabel(projectId),
      turn: loopState.turns.length + 1,
      issueId: semantic.resolvedIssueId ?? issueId,
      phase: 'answer',
    });

    const recordIssueId = issueId; // asked issue — resolve bookkeeping (not semantic dump)
    const factKeys =
      semantic.facts.length > 0
        ? semantic.facts.map((f) => f.key)
        : semantic.factKey
          ? [semantic.factKey]
          : [];

    const doc = loadWorkspaceDocumentText(projectId) ?? documentText ?? '';
    const beforeLiving = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      entities,
      turns: loopState.turns,
      memory,
      resolvedIssueIds: getResolvedIssueIds(loopState),
    });
    // V3-TD-01 — targetGap 소비처는 optional(string | undefined) 계약이다.
    // gap이 없을 때 null을 넘기던 것을 계약에 맞춰 undefined로 정규화한다
    // (이 코드베이스에서 gap 부재는 null/undefined 구분 없이 동일하게 다뤄진다).
    const askedGap = resolvedAskedGap ?? undefined;
    const causality = buildQuestionCausality({
      living: beforeLiving,
      // V3-TD-01 — buildQuestionCausality는 targetGap을 string으로 요구하지만
      // 내부적으로는 resolveGapQuestionBinding(string|null|undefined)에 그대로
      // 넘긴다(안전 처리됨). 파라미터를 넓히면 EXPECTED_INFO 인덱싱 등에서 연쇄
      // 수정이 생기므로, 여기서는 런타임 값을 바꾸지 않고 기존 동작을 그대로
      // 유지한다. gap이 비어 있을 수 있다는 점은 타입 이전부터 있던 사항이다.
      targetGap: askedGap as string,
    });

    const priorPendingGap = getLastWrongSlotReaskPendingGap(loopState.turns);
    const wrongSlotReaskPending =
      resolveWrongSlotReaskPendingAtSubmit({
        questionText: displayedQuestionText,
        answer: trimmed,
        priorPendingGap,
      }) ?? undefined;

    const projectedTurn: AiPmLoopTurn = {
      issueId: recordIssueId,
      answer: trimmed,
      appliedAt: new Date().toISOString(),
      semanticFactKey: semantic.factKey,
      semanticFactKeys: factKeys,
      intent: semantic.intent,
      whyNow: causality.whyNow,
      targetGap: askedGap,
      askedQuestionText: persistedQuestionText,
      wrongSlotReaskPending,
      causality,
      sourceEvidence: causality.sourceEvidence,
      previousUnderstanding: causality.previousUnderstanding,
      unresolvedGap: causality.unresolvedGap,
      expectedInformation: causality.expectedInformation,
    };
    const projectedTurns = [...loopState.turns, projectedTurn];
    const afterMemory = buildConversationMemoryFromSources({
      projectId: projectId ?? 'default',
      documentText: doc,
      turns: projectedTurns,
      entities,
      previous: memory,
    });
    const afterLiving = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      entities,
      turns: projectedTurns,
      memory: afterMemory,
      resolvedIssueIds: getResolvedIssueIds(loopState),
    });
    const delta = buildUnderstandingDelta({
      before: beforeLiving,
      after: afterLiving,
      factKeys,
    });
    const understandingDelta = formatUnderstandingDeltaSummary(delta);

    appendAiPmLoopTurn(
      {
        ...projectedTurn,
        understandingDelta,
        ...(v3Review
          ? {
              review: {
                ...v3Review,
                turnId: projectedTurn.appliedAt,
                sourceTurnId: projectedTurn.appliedAt,
              },
            }
          : {}),
      },
      projectId,
    );
    syncState(loadAiPmLoopState(projectId));
    let wrongSlotNext = resolveWrongSlotQuestionOverride(projectedTurns);
    if (!wrongSlotNext && wrongSlotReaskPending) {
      const binding = resolveGapQuestionBinding(wrongSlotReaskPending);
      wrongSlotNext = {
        targetGap: wrongSlotReaskPending,
        issueId: binding.issueId,
        questionText: binding.questionText,
        whyNow: binding.whyNow,
        rationale: binding.whyNow,
        score: wrongSlotReaskPending === 'customerPersona' ? 56_000 : 56_000,
        missingField: 'business' as const,
      };
    }
    if (!wrongSlotNext && nuclearWrongSlot) {
      const binding = resolveGapQuestionBinding(nuclearWrongSlot.askedGap);
      wrongSlotNext = {
        targetGap: nuclearWrongSlot.askedGap,
        issueId: binding.issueId,
        questionText: binding.questionText,
        whyNow: binding.whyNow,
        rationale: binding.whyNow,
        score: 56_000,
        missingField: 'business' as const,
      };
    }
    if (wrongSlotNext) {
      wrongSlotSubmitPinRef.current = wrongSlotNext;
      const override = {
        targetGap: wrongSlotNext.targetGap,
        questionText: wrongSlotNext.questionText,
        whyNow: wrongSlotNext.whyNow ?? wrongSlotNext.rationale,
        reason: 'wrong_slot' as const,
      };
      // Loop 9g — synchronous pin before reanalyze so first paint never shows ranked issue Q
      flushSync(() => {
        setQuestionOverride(override);
        setRecognitionDismissed(true);
        const pinned = patchAiPmLoopState(
          {
            phase: 'answer',
            currentIssueId: wrongSlotNext.issueId,
          },
          projectId,
        );
        syncState(pinned);
      });
      lastAskSurfaceRef.current = {
        targetGap: override.targetGap,
        questionText: override.questionText,
      };
    } else {
      wrongSlotSubmitPinRef.current = null;
      // Loop 9h-c — clear stale wrong_slot override when re-ask pending resolved
      setQuestionOverride((prev) => (prev?.reason === 'wrong_slot' ? null : prev));
    }
    const result = applyWorkspaceLoopAnswer(issueId, trimmed, projectId, {
      semantic,
      askedTargetGap: askedGap,
    });
    if (!result.applied) {
      const rolled = loadAiPmLoopState(projectId);
      patchAiPmLoopState(
        {
          turns: rolled.turns.slice(0, -1),
          phase: 'answer',
          currentIssueId: issueId,
        },
        projectId,
      );
      syncState(loadAiPmLoopState(projectId));
      setAnswerQualityHint(result.quality);
      return;
    }

    setAnswerDraft('');
    setReturnWelcomeDismissed(true);
    setRecognitionDismissed(false);
    startProcessing();
  }, [
    activateQuestionLock,
    answerDraft,
    analysisResultExists,
    commitQuestionLock,
    conversationMemory,
    documentText,
    entities,
    livingState,
    loopState,
    loopState.currentIssueId,
    loopState.turns,
    nextIssue,
    projectId,
    questionOverride,
    readOnly,
    startProcessing,
    syncState,
    understanding,
    whyThisQuestionNow,
  ]);

  const resolveContradiction = useCallback(
    (choice: 'keep_prior' | 'accept_new') => {
      if (!contradiction || readOnly) return;
      const { issueId, prior, next, factKey } = contradiction;
      if (choice === 'keep_prior') {
        setContradiction(null);
        setAnswerQualityHint(null);
        setAnswerDraft('');
        return;
      }
      setContradiction(null);
      setAnswerQualityHint(null);
      appendAiPmLoopTurn(
        {
          issueId,
          answer: next,
          appliedAt: new Date().toISOString(),
          semanticFactKey: factKey,
          intent: 'correction',
          targetGap: resolveAskedTargetGapForAppend({
            issueId,
            whyTargetGap: whyThisQuestionNow?.targetGap,
            overrideTargetGap: questionOverride?.targetGap,
            questionText: whyThisQuestionNow?.questionText,
          }),
        },
        projectId,
      );
      applyWorkspaceLoopAnswer(issueId, next, projectId, {
        forceAccept: true,
        semantic: {
          intent: 'correction',
          factKey,
          resolvedIssueId: issueId,
          facts: [{ key: factKey, issueId }],
          value: next,
          mergeable: true,
          displayOnly: false,
          rationale: 'founder accepted new after conflict',
          quality: 'VALID',
        },
      });
      setAnswerDraft('');
      startProcessing();
      void prior;
    },
    [contradiction, onDocumentUpdated, projectId, questionOverride, readOnly, startProcessing, whyThisQuestionNow],
  );

  const beginEditPriorAnswer = useCallback(
    (editedIssueId: AiPmLoopIssueId) => {
      if (readOnly) return;
      const next = supersedeTurnAndInvalidateDownstream(
        editedIssueId,
        AI_PM_LOOP_ISSUE_ORDER,
        projectId,
      );
      const keys = factsToClearAfterEdit(editedIssueId) as ConversationFactKey[];
      const mem = loadConversationMemory(projectId);
      saveConversationMemory(clearFactsByKeys(mem, keys), projectId);
      // Rebuild memory from remaining non-superseded turns
      const rebuilt = buildConversationMemoryFromSources({
        projectId: projectId ?? 'default',
        documentText: loadWorkspaceDocumentText(projectId) ?? '',
        turns: next.turns,
        entities,
        previous: loadConversationMemory(projectId),
      });
      saveConversationMemory(rebuilt, projectId);
      setEditPriorOpen(false);
      setAnswerDraft('');
      setWhyPanel(null);
      setMidJudgmentText(null);
      setQuestionOverride(null);
      clearQuestionLock();
      syncState(next);
      const doc = loadWorkspaceDocumentText(projectId) ?? '';
      const freshMemory = buildConversationMemoryFromSources({
        projectId: projectId ?? 'default',
        documentText: doc,
        turns: next.turns,
        entities,
        previous: loadConversationMemory(projectId),
      });
      const freshUnderstanding = doc.trim() ? buildBusinessUnderstanding(doc) : understanding;
      if (freshUnderstanding) {
        const living = buildLivingUnderstandingState({
          documentText: doc,
          understanding: freshUnderstanding,
          entities,
          turns: next.turns,
          memory: freshMemory,
          resolvedIssueIds: getResolvedIssueIds(next),
        });
        const decision = resolveNextQuestionDecision({
          living,
          turns: next.turns,
          memory: freshMemory,
          gapState: next.gapState,
          projectId,
        });
        if (decision) {
          const purity = enforceQuestionPurity({
            questionText: decision.questionText,
            targetGap: decision.targetGap,
          });
          const whyNow = decision.whyNow;
          commitQuestionLock(
            captureLockedAskSurface({
              issueId: decision.issueId,
              targetGap: decision.targetGap,
              questionText: purity.sanitizedText,
              whyNow,
              rationale: isNextQuestionDecision(decision)
                ? decision.actionRationale
                : decision.rationale,
              score: decision.score,
              fallbackIssueId: decision.issueId,
            }),
          );
        }
      }
      onLoopStateChange?.();
    },
    [clearQuestionLock, commitQuestionLock, entities, onLoopStateChange, projectId, readOnly, syncState, understanding],
  );

  const editableTurns = useMemo(() => {
    const seen = new Set<AiPmLoopIssueId>();
    const out: Array<{ issueId: AiPmLoopIssueId; answer: string }> = [];
    for (const turn of loopState.turns) {
      if (turn.superseded) continue;
      if (
        turn.intent === 'why_meta' ||
        turn.intent === 'mid_judgment' ||
        turn.intent === 'nonsense'
      ) {
        continue;
      }
      if (seen.has(turn.issueId)) continue;
      seen.add(turn.issueId);
      out.push({ issueId: turn.issueId, answer: turn.answer });
    }
    return out;
  }, [loopState.turns]);


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
    const finalOutput = buildConversationalFinalOutput(livingState);
    return (
      <section
        data-testid="conversational-final-output"
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
        <details className="mt-4 rounded-xl border border-border/60 bg-background/80 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            {t('detailToggle')}
          </summary>
          <div
            data-testid="current-judgment-block"
            className="mt-3 space-y-2 border-t border-border/40 pt-3"
          >
            <p
              data-testid="final-closeout-label"
              className="text-sm font-medium leading-relaxed text-foreground"
            >
              {finalOutput.closeoutLabel}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {finalOutput.judgmentSummary}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('coverageFlash', { percent: finalOutput.coveragePercent })}
            </p>
          </div>
          <ul className="mt-4 space-y-3">
            {finalOutput.sections.map((section) => (
              <li
                key={section.id}
                data-section={section.id}
                className="rounded-lg border border-border/40 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-foreground">{section.title}</p>
                <p className="mt-1 text-sm leading-snug">{section.summary}</p>
                {section.evidence.length > 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {section.evidence[0]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      </section>
    );
  }

  // S16 P0-2 — reading done, waiting for parent Shared Understanding 「맞습니까?」 gate
  if (!allowAsk && loopState.readingCompleted && loopState.turns.length === 0) {
    return null;
  }

  if (reanalyzing || loopState.phase === 'reanalyze') {
    return (
      <WorkspaceAiPmThinkingStages
        className={className}
        completedStageIds={processingStageIds}
        understandingDelta={lastTurn?.understandingDelta}
        onComplete={() => finishProcessingRef.current()}
      />
    );
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

  if (displayPhase === 'answer' && activeIssue) {
    const whyNowText =
      whyThisQuestionNow?.whyNow ?? whyThisQuestionNow?.rationale ?? s11Surface.question.purpose;

    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-4 py-4 sm:px-7 sm:py-5',
          className,
        )}
      >
        <WorkspaceS11Surface
          surface={s11Surface}
          sections="question"
          hideWhyNow
          questionTextOverride={displayQuestionText}
        />
        {whyPanel ? (
          <div
            data-testid="why-follow-up-panel"
            className="mt-4 space-y-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
          >
            <p className="text-sm font-medium text-foreground">{whyPanel.explanation}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {whyPanel.evidence.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              className="mt-2 rounded-xl"
              onClick={closeWhyOrMidAndRejudge}
            >
              {whyPanel.returnToLoopCta}
            </Button>
          </div>
        ) : null}
        {midJudgmentText ? (
          <div
            data-testid="mid-judgment-panel"
            className="mt-4 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm leading-relaxed"
          >
            {midJudgmentText}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={closeWhyOrMidAndRejudge}
              >
                이해 루프로 돌아가기
              </Button>
            </div>
          </div>
        ) : null}
        <textarea
          value={answerDraft}
          onFocus={() => {
            setAnswerInputFocused(true);
            activateQuestionLock();
          }}
          onBlur={() => setAnswerInputFocused(false)}
          onChange={(event) => {
            setAnswerQualityHint(null);
            if (event.target.value.length > 0) {
              activateQuestionLock();
            }
            setAnswerDraft(event.target.value);
          }}
          rows={4}
          readOnly={readOnly}
          placeholder={
            whyThisQuestionNow?.questionText?.trim() || t(`issues.${activeIssue}.placeholder`)
          }
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2 max-sm:min-h-[4.5rem]"
          aria-label={displayQuestionText || t('submitAnswerCta')}
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
              이전에 확인한 내용과 새 답변이 다릅니다. 어느 쪽이 맞는지 확인해 주세요.
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
                이전 내용이 맞아요
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={readOnly}
                onClick={() => resolveContradiction('accept_new')}
              >
                새 답변이 맞아요
              </Button>
            </div>
          </div>
        ) : null}
        {editPriorOpen && editableTurns.length > 0 ? (
          <div
            data-testid="edit-prior-answer-panel"
            className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background px-4 py-3"
          >
            <p className="text-sm font-medium">수정할 이전 답변을 선택하세요</p>
            <ul className="space-y-2">
              {editableTurns.map((turn) => (
                <li key={turn.issueId}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border/50 px-3 py-2 text-left text-sm hover:bg-muted/40"
                    disabled={readOnly}
                    onClick={() => beginEditPriorAnswer(turn.issueId)}
                  >
                    <span className="font-medium">{t(`issues.${turn.issueId}.riskLabel`)}</span>
                    <span className="mt-1 block text-muted-foreground line-clamp-2">
                      {turn.answer}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setEditPriorOpen(false)}
            >
              닫기
            </Button>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-gradient-to-t max-sm:from-background max-sm:via-background max-sm:to-background/80 max-sm:pt-2">
          <Button
            type="button"
            className="rounded-xl max-sm:w-full"
            data-testid="submit-answer-cta"
            disabled={readOnly || answerDraft.trim().length < 2}
            onClick={submitAnswer}
          >
            {t('submitAnswerCta')}
          </Button>
          {editableTurns.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              data-testid="edit-prior-answer-cta"
              disabled={readOnly}
              onClick={() => setEditPriorOpen((open) => !open)}
            >
              ← 이전 답변 수정
            </Button>
          ) : null}
        </div>
        <ConversationSecondaryBlocks
          s11Surface={s11Surface}
          livingState={livingState}
          lastTurn={lastTurn}
          whyNow={whyNowText}
          displayQuestionText={displayQuestionText}
        />
        {ceoSixSurfaces ? <WorkspaceCeoSixSurfaces surfaces={ceoSixSurfaces} /> : null}
      </section>
    );
  }

  if (!activeIssue || !sharedThinking) {
    return null;
  }

  if (displayPhase === 'issue') {
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
            <WorkspaceS11Surface
              surface={s11Surface}
              sections="question"
              hideWhyNow
              questionTextOverride={displayQuestionText}
            />
            <ConversationSecondaryBlocks
              s11Surface={s11Surface}
              livingState={livingState}
              lastTurn={lastTurn}
              whyNow={whyThisQuestionNow?.whyNow ?? whyThisQuestionNow?.rationale}
              displayQuestionText={displayQuestionText}
            />
            {ceoSixSurfaces ? <WorkspaceCeoSixSurfaces surfaces={ceoSixSurfaces} /> : null}
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
                'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-4 py-4 sm:px-7 sm:py-5',
              )}
            >
              <WorkspaceS11Surface
          surface={s11Surface}
          sections="question"
          hideWhyNow
          questionTextOverride={displayQuestionText}
        />
              <textarea
                value={answerDraft}
                onFocus={() => {
                  setAnswerInputFocused(true);
                  activateQuestionLock();
                }}
                onBlur={() => setAnswerInputFocused(false)}
                onChange={(event) => {
                  setAnswerQualityHint(null);
                  if (event.target.value.length > 0) {
                    activateQuestionLock();
                  }
                  setAnswerDraft(event.target.value);
                }}
                rows={4}
                readOnly={readOnly}
                placeholder={
                  whyThisQuestionNow?.questionText?.trim() ||
                  (activeIssueId ? t(`issues.${activeIssueId}.placeholder`) : undefined)
                }
                className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2 max-sm:min-h-[5rem]"
                aria-label={displayQuestionText || t('submitAnswerCta')}
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
              <div className="mt-4 flex flex-wrap gap-2 pb-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-gradient-to-t max-sm:from-background max-sm:via-background max-sm:to-background/80 max-sm:pt-2">
                <Button
                  type="button"
                  className="rounded-xl max-sm:w-full"
                  data-testid="submit-answer-cta"
                  disabled={readOnly || answerDraft.trim().length < 2}
                  onClick={submitAnswer}
                >
                  {t('submitAnswerCta')}
                </Button>
                {editableTurns.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl"
                    data-testid="edit-prior-answer-cta"
                    disabled={readOnly}
                    onClick={() => setEditPriorOpen((open) => !open)}
                  >
                    ← 이전 답변 수정
                  </Button>
                ) : null}
              </div>
              {editPriorOpen && editableTurns.length > 0 ? (
                <div
                  data-testid="edit-prior-answer-panel"
                  className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background px-4 py-3"
                >
                  <p className="text-sm font-medium">수정할 이전 답변을 선택하세요</p>
                  <ul className="space-y-2">
                    {editableTurns.map((turn) => (
                      <li key={turn.issueId}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-border/50 px-3 py-2 text-left text-sm hover:bg-muted/40"
                          disabled={readOnly}
                          onClick={() => beginEditPriorAnswer(turn.issueId)}
                        >
                          <span className="font-medium">{t(`issues.${turn.issueId}.riskLabel`)}</span>
                          <span className="mt-1 block text-muted-foreground line-clamp-2">
                            {turn.answer}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ConversationSecondaryBlocks
                s11Surface={s11Surface}
                livingState={livingState}
                lastTurn={lastTurn}
                whyNow={whyThisQuestionNow?.whyNow ?? whyThisQuestionNow?.rationale}
                displayQuestionText={displayQuestionText}
              />
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
