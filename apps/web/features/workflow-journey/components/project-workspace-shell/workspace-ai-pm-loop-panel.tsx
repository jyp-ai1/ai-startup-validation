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
import { getWhyThisQuestionNow, getTopGapPriority, resolvePreservedGapAfterMeta } from '../../lib/business-understanding/resolve-missing-field-priority';
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
import { interpretAnswerSemantics } from '../../lib/business-understanding/interpret-answer-semantics';
import { reframeQuestion, buildConflictClarifyQuestion, type ReframeReason } from '../../lib/business-understanding/reframe-question';
import { resolveAskedTargetGapForAppend } from '../../lib/business-understanding/resolve-asked-target-gap';
import { countUnclosedGapAsks, MAX_SAME_GAP_ASKS_BEFORE_YIELD } from '../../lib/business-understanding/question-decision-engine';
import { enforceQuestionPurity } from '../../lib/business-understanding/question-purity';
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
  const whyThisQuestionNow = useMemo(() => {
    if (!activeIssueId) return null;
    const freshTurns = loadAiPmLoopState(projectId).turns;
    const freshMemory = buildConversationMemoryFromSources({
      projectId: projectId ?? 'default',
      documentText: documentText ?? '',
      turns: freshTurns,
      entities,
      previous: loadConversationMemory(projectId),
    });
    const base = getWhyThisQuestionNow(understanding, loopState, {
      documentText: documentText ?? undefined,
      entities,
      memory: freshMemory,
      analysisResultExists,
      turns: freshTurns,
      issueId: activeIssueId,
    });
    if (!base) return null;

    // Apply reframe override when present (same gap, or override is authoritative after why/mid/nonsense)
    let questionText = base.questionText;
    let whyNow = base.whyNow;
    let targetGap = base.targetGap;
    if (questionOverride) {
      const stickyAsks = countUnclosedGapAsks(loopState.turns, questionOverride.targetGap);
      const overrideStale =
        questionOverride.targetGap !== base.targetGap && stickyAsks >= MAX_SAME_GAP_ASKS_BEFORE_YIELD;
      if (
        !overrideStale &&
        (questionOverride.targetGap === base.targetGap ||
          questionOverride.reason === 'why_meta' ||
          questionOverride.reason === 'mid_judgment' ||
          questionOverride.reason === 'nonsense')
      ) {
        questionText = questionOverride.questionText;
        whyNow = questionOverride.whyNow;
        targetGap = questionOverride.targetGap;
      }
    } else if (countUnclosedGapAsks(loopState.turns, base.targetGap) > 0) {
      // Core Final Stabilization — never identical stock re-ask for open sticky gaps
      const reframed = reframeQuestion({
        targetGap: base.targetGap,
        living: livingState,
        reason: 'adaptive',
        previousQuestionText: base.questionText,
      });
      questionText = reframed.questionText;
      whyNow = reframed.whyNow;
    }

    const purity = enforceQuestionPurity({
      questionText,
      targetGap,
    });

    return {
      ...base,
      targetGap,
      questionText: purity.sanitizedText,
      whyNow,
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
  ]);
  const s11Surface = useMemo(() => {
    const askIssueId = loopState.currentIssueId ?? nextIssue;
    const targetGap = whyThisQuestionNow?.targetGap ?? null;
    const gapQuestionText = whyThisQuestionNow?.questionText ?? null;
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
    return surface;
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
    whyThisQuestionNow,
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

    const next = applyLoopProcessingTransition(result, projectId, canComplete);
    syncState(next);

    if (next.phase === 'complete') onLoopComplete?.();
    window.setTimeout(() => setUpdateSavedFlash(false), 2200);
  }, [entities, onLoopComplete, projectId, syncState, understanding]);

  finishProcessingRef.current = finishProcessing;

  /** Core Final — after why/mid panel close, re-judge gap + REFRAME (never identical Q). */
  const closeWhyOrMidAndRejudge = useCallback(() => {
    const reason: ReframeReason = whyPanel ? 'why_meta' : 'mid_judgment';
    const inFlightGap = whyThisQuestionNow?.targetGap ?? questionOverride?.targetGap ?? null;
    setWhyPanel(null);
    setMidJudgmentText(null);
    const gap = resolvePreservedGapAfterMeta({
      living: livingState,
      turns: loopState.turns,
      inFlightGap,
    });
    const freshTurns = loadAiPmLoopState(projectId).turns;
    const top = getTopGapPriority(understanding, loopState, {
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
    const issueForGap = top?.issueId ?? loopState.currentIssueId;
    if (issueForGap && issueForGap !== loopState.currentIssueId) {
      patchAiPmLoopState({ currentIssueId: issueForGap }, projectId);
      syncState(loadAiPmLoopState(projectId));
    }
  }, [
    analysisResultExists,
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

    const memory = loadConversationMemory(projectId);
    const existingFactsByKey: Partial<Record<ConversationFactKey, string | null>> = {};
    for (const fact of memory.facts) {
      if ((fact.lifecycle ?? 'current') === 'current') {
        existingFactsByKey[fact.key] = fact.value;
      }
    }
    const askedKey = factKeyForIssue(issueId);
    const existingFact = askedKey ? getFact(memory, askedKey)?.value ?? null : null;

    const askedTargetGap = resolveAskedTargetGapForAppend({
      issueId,
      whyTargetGap: whyThisQuestionNow?.targetGap,
      overrideTargetGap: questionOverride?.targetGap,
      questionText: whyThisQuestionNow?.questionText,
      fallbackTargetGap: getTopGapPriority(understanding, loopState, {
        documentText: documentText ?? undefined,
        entities,
        memory: conversationMemory,
        analysisResultExists,
        turns: loadAiPmLoopState(projectId).turns,
      })?.targetGap,
    });

    const semantic = interpretAnswerSemantics({
      answer: trimmed,
      askedIssueId: issueId,
      existingFact,
      existingFactsByKey,
      askedTargetGap,
    });

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
      const askedGap = askedTargetGap;
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
          appliedAt: new Date().toISOString(),
          semanticFactKey: semantic.factKey,
          semanticFactKeys: semantic.facts.map((f) => f.key),
          intent: semantic.intent,
          targetGap: conflictClarify.targetGap,
          understandingDelta: `충돌: ${semantic.factKey} — 기존 값과 새 답 중 어느 쪽이 맞는지 확인 필요 · 미확인: ${conflictClarify.targetGap}`,
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
      // Core Final W7 — nonsense / unknown / weak relevance → REFRAME on adaptive top gap
      const preserveGap =
        semantic.quality === 'PARTIAL' && whyThisQuestionNow?.targetGap
          ? whyThisQuestionNow.targetGap
          : null;
      const freshTurns = loadAiPmLoopState(projectId).turns;
      const top = getTopGapPriority(understanding, loopState, {
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
    setQuestionOverride(null);

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
    const askedGap = askedTargetGap;
    const causality = buildQuestionCausality({
      living: beforeLiving,
      targetGap: askedGap,
    });

    const projectedTurn: AiPmLoopTurn = {
      issueId: recordIssueId,
      answer: trimmed,
      appliedAt: new Date().toISOString(),
      semanticFactKey: semantic.factKey,
      semanticFactKeys: factKeys,
      intent: semantic.intent,
      whyNow: causality.whyNow,
      targetGap: askedGap,
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
      },
      projectId,
    );
    syncState(loadAiPmLoopState(projectId));
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
    onDocumentUpdated?.(recordIssueId, trimmed);

    setAnswerDraft('');
    setReturnWelcomeDismissed(true);
    setRecognitionDismissed(false);
    startProcessing();
  }, [
    answerDraft,
    analysisResultExists,
    conversationMemory,
    documentText,
    entities,
    livingState,
    loopState,
    loopState.currentIssueId,
    loopState.turns,
    onDocumentUpdated,
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
      onDocumentUpdated?.(issueId, next);
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
      syncState(next);
      onLoopStateChange?.();
    },
    [entities, onLoopStateChange, projectId, readOnly, syncState],
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
        <div
          data-testid="current-judgment-block"
          className="mt-4 rounded-xl border border-border/60 bg-background/80 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('judgmentLabel')}
          </p>
          <p
            data-testid="final-closeout-label"
            className="mt-2 text-sm font-medium leading-relaxed text-foreground"
          >
            {finalOutput.closeoutLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {finalOutput.judgmentSummary}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
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
              {section.claims?.length ? (
                <ul className="mt-2 space-y-1">
                  {section.claims.map((row) => (
                    <li
                      key={`${section.id}-${row.domain}`}
                      className="text-[11px] text-muted-foreground"
                      data-claim-status={row.status}
                    >
                      · {row.domain}: {row.value ?? '—'} ({row.status})
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.evidence.length > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {section.evidence[0]}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
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

  if (loopState.phase === 'answer' && activeIssue) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
          className,
        )}
      >
        <div
          data-testid="current-judgment-block"
          className="mb-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('judgmentLabel')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {livingState.judgmentSummary}
          </p>
          {lastTurn ? (
            <p
              data-testid="understanding-delta"
              className="mt-2 text-xs text-emerald-800 dark:text-emerald-300"
            >
              {lastTurn.understandingDelta?.trim() || '이해 상태 갱신됨'}
            </p>
          ) : null}
          {whyThisQuestionNow?.whyNow ? (
            <details className="mt-2" data-testid="why-now-details">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                왜 지금 이 질문을 하나요?
              </summary>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                {whyThisQuestionNow.whyNow}
              </p>
            </details>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {t('coverageFlash', { percent: livingState.coveragePercent })}
          </p>
          {countCriticalViabilityGaps(livingState) > 0 ? (
            <p
              data-testid="critical-gap-block-hint"
              className="mt-2 text-xs text-amber-800 dark:text-amber-200"
            >
              {explainSufficiency(livingState).explanation}
            </p>
          ) : null}
        </div>
        <WorkspaceS11Surface surface={s11Surface} />
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
          onChange={(event) => {
            setAnswerQualityHint(null);
            setAnswerDraft(event.target.value);
          }}
          rows={5}
          readOnly={readOnly}
          placeholder={
            whyThisQuestionNow?.questionText?.trim() || t(`issues.${activeIssue}.placeholder`)
          }
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
              이전에 확인한 내용과 새 답변이 다릅니다. 어느 쪽이 현재 이해(Current Understanding)인지
              확인해 주세요. 자동으로 합치지 않습니다.
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Old Fact (이전 확인)
                </dt>
                <dd className="mt-1 font-medium">{contradiction.prior}</dd>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  새 답을 채택하면 Superseded로 남습니다.
                </p>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  New Fact (새 답변)
                </dt>
                <dd className="mt-1 font-medium">{contradiction.next}</dd>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  채택 시 Current Understanding이 됩니다.
                </p>
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
                이전 내용이 맞아 (Current = Old)
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={readOnly}
                onClick={() => resolveContradiction('accept_new')}
              >
                새 답변이 맞아 (Old → Superseded)
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl"
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
            <div
              data-testid="current-judgment-block"
              className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('judgmentLabel')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {livingState.judgmentSummary}
              </p>
              {lastTurn ? (
                <p
                  data-testid="understanding-delta"
                  className="mt-2 text-xs text-emerald-800 dark:text-emerald-300"
                >
                  {lastTurn.understandingDelta?.trim() || '이해 상태 갱신됨'}
                </p>
              ) : null}
              {whyThisQuestionNow?.whyNow ? (
                <details className="mt-2" data-testid="why-now-details">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    왜 지금 이 질문을 하나요?
                  </summary>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                    {whyThisQuestionNow.whyNow}
                  </p>
                </details>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {t('coverageFlash', { percent: livingState.coveragePercent })}
              </p>
            </div>
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
              <div
                data-testid="current-judgment-block"
                className="mb-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('judgmentLabel')}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {livingState.judgmentSummary}
                </p>
                {lastTurn ? (
                  <p
                    data-testid="understanding-delta"
                    className="mt-2 text-xs text-emerald-800 dark:text-emerald-300"
                  >
                    {lastTurn.understandingDelta?.trim() || '이해 상태 갱신됨'}
                  </p>
                ) : null}
                {whyThisQuestionNow?.whyNow ? (
                  <details className="mt-2" data-testid="why-now-details">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      왜 지금 이 질문을 하나요?
                    </summary>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                      {whyThisQuestionNow.whyNow}
                    </p>
                  </details>
                ) : null}
                <p
                  data-testid="understanding-coverage-percent"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {t('coverageFlash', { percent: livingState.coveragePercent })}
                </p>
                {countCriticalViabilityGaps(livingState) > 0 ? (
                  <p
                    data-testid="critical-gap-block-hint"
                    className="mt-2 text-xs text-amber-800 dark:text-amber-200"
                  >
                    {explainSufficiency(livingState).explanation}
                  </p>
                ) : null}
              </div>
              <WorkspaceS11Surface surface={s11Surface} />
              <textarea
                value={answerDraft}
                onChange={(event) => {
                  setAnswerQualityHint(null);
                  setAnswerDraft(event.target.value);
                }}
                rows={4}
                readOnly={readOnly}
                placeholder={
                  whyThisQuestionNow?.questionText?.trim() ||
                  (activeIssueId ? t(`issues.${activeIssueId}.placeholder`) : undefined)
                }
                className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2 max-sm:min-h-[5rem]"
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
