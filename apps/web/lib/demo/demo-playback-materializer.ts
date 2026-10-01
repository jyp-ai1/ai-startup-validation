import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import { resolveGapQuestionBinding } from '@/features/workflow-journey/lib/business-understanding/gap-question-map';
import {
  appendLoopTurnWithReview,
  runLoopAnswerProcessing,
} from '@/features/workflow-journey/lib/business-understanding/process-loop-answer';
import { isNextQuestionDecision } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { resolveNextQuestionDecision } from '@/features/workflow-journey/lib/business-understanding/resolve-next-question-decision';
import { commitFirstAskAfterUnderstandingConfirm } from '@/features/workflow-journey/lib/business-understanding/understanding-confirm-ask-transition';
import { captureLockedAskSurface } from '@/features/workflow-journey/lib/business-understanding/question-transition-lock';
import { syncJudgmentAfterAnswer } from '@/features/workflow-journey/lib/business-understanding/ai-pm-judgment-loop-sync';
import { openBusinessReview } from '@/features/workflow-journey/lib/business-understanding/ai-pm-judgment-loop-sync';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';
import {
  saveUnderstandingPhase,
  type UnderstandingPhase,
} from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import {
  inferDomainFromPaste,
  saveWorkspaceDocumentText,
} from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

import type { DemoScenarioFrame, DemoSeedBundle } from './demo-scenario-types';
import { demoSeedQaSteps } from './demo-seed-qa';

const FRAMES_CACHE_KEY = 'launchlens.demo.playback.frames.v1';

function framesCacheKey(projectId: string): string {
  return `${FRAMES_CACHE_KEY}.${projectId}`;
}

function snapshotNow(projectId: string, phase: UnderstandingPhase): WorkspacePersistedSnapshot {
  const snap = buildWorkspacePersistedSnapshot(projectId);
  return { ...snap, understandingPhase: phase, updatedAt: new Date().toISOString() };
}

function toFrame(
  index: number,
  stepLabel: string,
  surface: DemoScenarioFrame['surface'],
  projectId: string,
  phase: UnderstandingPhase,
  primaryCta: DemoScenarioFrame['primaryCta'],
  presenter?: DemoScenarioFrame['presenter'],
): DemoScenarioFrame {
  return {
    index,
    stepLabel,
    surface,
    workspaceSnapshot: snapshotNow(projectId, phase),
    presenter,
    primaryCta,
  };
}

/**
 * Build ordered playback frames using the real V3 pipeline (client-only).
 */
export function materializeDemoPlaybackFrames(bundle: DemoSeedBundle, projectId: string): DemoScenarioFrame[] {
  if (typeof window === 'undefined') return [];

  const cached = sessionStorage.getItem(framesCacheKey(projectId));
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as DemoScenarioFrame[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* rebuild */
    }
  }

  const documentText = bundle.document.body;
  const qaSteps = demoSeedQaSteps(bundle.project.slug);

  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
  saveUnderstandingPhase('pending', projectId);

  const inferred = inferDomainFromPaste(documentText, projectId);
  const understanding = buildBusinessUnderstanding(documentText);

  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'read_ack',
    },
    projectId,
  );

  const frames: DemoScenarioFrame[] = [];
  frames.push(
    toFrame(0, '사업 이해', 'understanding', projectId, 'pending', 'confirm_understanding'),
  );

  saveUnderstandingPhase('accepted', projectId);
  commitFirstAskAfterUnderstandingConfirm({
    projectId,
    documentText,
    understanding,
    entities: inferred.entities,
  });

  let loop = loadAiPmLoopState(projectId);
  const firstQ = loop.lockedAskSurface?.questionText ?? loop.lastDecision?.questionText;
  frames.push(
    toFrame(1, '첫 질문', 'question', projectId, 'accepted', 'next', {
      questionText: firstQ ?? undefined,
      prefilledAnswerDisplay: qaSteps[0]?.prefilledAnswerDisplay,
    }),
  );

  let frameIndex = 2;

  for (let i = 0; i < qaSteps.length; i += 1) {
    const step = qaSteps[i]!;
    const binding = resolveGapQuestionBinding(step.targetGap);
    const askedQuestionText =
      loop.lockedAskSurface?.questionText ??
      loop.lastDecision?.questionText ??
      binding?.questionText ??
      '';

    const appliedAt = new Date(Date.now() + i * 1000).toISOString();
    appendLoopTurnWithReview(
      {
        issueId: binding?.issueId ?? 'customer_definition',
        answer: step.answer,
        appliedAt,
        askedQuestionText,
        targetGap: step.targetGap,
      },
      {
        askedGapId: step.targetGap,
        askedQuestionText,
        askedIssueId: binding?.issueId ?? 'customer_definition',
        userAnswer: step.answer,
        displayedQuestionText: askedQuestionText,
      },
      projectId,
    );

    const processed = runLoopAnswerProcessing({
      projectId,
      documentText,
      understanding,
      entities: inferred.entities,
    });
    loop = processed.loop;

    const memory = buildConversationMemoryFromSources({
      projectId,
      documentText,
      turns: loop.turns,
      entities: inferred.entities,
      previous: null,
    });
    const living = buildLivingUnderstandingState({
      documentText,
      understanding,
      entities: inferred.entities,
      turns: loop.turns,
      memory,
    });

    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
      projectId,
      persistLastDecision: true,
    });

    if (decision && isNextQuestionDecision(decision)) {
      const lock = captureLockedAskSurface({
        issueId: decision.issueId,
        targetGap: decision.targetGap,
        questionText: decision.questionText,
        whyNow: decision.whyNow,
        rationale: decision.actionRationale,
        score: decision.score,
        fallbackIssueId: decision.issueId,
      });
      patchAiPmLoopState(
        {
          lockedAskSurface: lock,
          lastDecision: decision,
          phase: 'answer',
          currentIssueId: decision.issueId,
        },
        projectId,
      );
      loop = loadAiPmLoopState(projectId);
    }

    frames.push(
      toFrame(
        frameIndex,
        `확인 ${i + 1}/${qaSteps.length}`,
        'question',
        projectId,
        'accepted',
        'next',
        {
          questionText: askedQuestionText,
          prefilledAnswerDisplay: step.prefilledAnswerDisplay,
        },
      ),
    );
    frameIndex += 1;
  }

  const finalLoop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: finalLoop.turns,
    entities: inferred.entities,
    previous: null,
  });
  const living = buildLivingUnderstandingState({
    documentText,
    understanding,
    entities: inferred.entities,
    turns: finalLoop.turns,
    memory,
  });

  syncJudgmentAfterAnswer({
    projectId,
    living,
    loop: finalLoop,
    forceJudgmentView: true,
    lastQuestionText: finalLoop.lockedAskSurface?.questionText ?? undefined,
    answer: qaSteps.at(-1)?.answer,
  });
  openBusinessReview(projectId);
  saveUnderstandingPhase('review-ready', projectId);

  frames.push(
    toFrame(frameIndex, '판단', 'judgment', projectId, 'review-ready', 'next', {
      judgmentHeadline: `${bundle.business.businessName} — AI PM 판단`,
    }),
  );
  frameIndex += 1;

  patchAiPmLoopState({ viewMode: 'review', reviewDecisionShown: true }, projectId);
  frames.push(
    toFrame(frameIndex, '최종 검토', 'final_review', projectId, 'review-ready', 'next', {
      finalReviewSummary: bundle.business.coreHypothesis,
    }),
  );

  sessionStorage.setItem(framesCacheKey(projectId), JSON.stringify(frames));
  return frames;
}
