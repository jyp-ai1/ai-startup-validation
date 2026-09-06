/**
 * DAY 8-I — Full conversation test harness.
 * Runs real Q→A→judgment pipeline (not isolated unit stubs).
 */

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import { buildBusinessUnderstanding } from './build-business-understanding';
import { buildCeoJudgmentState, buildCeoJudgmentStateWithTrace } from './ai-pm-judgment-aggregation';
import { buildBusinessReviewResult } from './ai-pm-business-review';
import { detectDimensionSeparationIssues } from './ai-pm-judgment-trace';
import type { JudgmentTurnTrace } from './ai-pm-judgment-trace';
import { formatJudgmentEvolutionTable } from './ai-pm-judgment-trace';
import { buildLivingUnderstandingState } from './living-understanding-state';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import {
  appendLoopTurnWithReview,
  runLoopAnswerProcessing,
} from './process-loop-answer';
import { resolveNextQuestionDecision } from './resolve-next-question-decision';
import { isNextQuestionDecision } from './decide-next-question-from-review';
import { syncJudgmentAfterAnswer } from './ai-pm-judgment-loop-sync';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { resolveGapQuestionBinding } from './gap-question-map';

export type Day8iScenarioCategory =
  | 'A_normal'
  | 'B_off_slot'
  | 'C_multi_fact'
  | 'D_repeat'
  | 'E_correction'
  | 'F_judgment_change'
  | 'G_unknown'
  | 'H_inference_risk'
  | 'I_research'
  | 'J_continuity';

export type Day8iScenarioStep = {
  category: Day8iScenarioCategory;
  ceoAnswer: string;
  /** Override asked gap when simulating off-slot answers */
  askedGap?: string;
  askedIssueId?: AiPmLoopIssueId;
  note?: string;
};

export type Day8iConversationTurnRecord = {
  turnIndex: number;
  category: Day8iScenarioCategory;
  question: string;
  targetGap: string;
  ceoAnswer: string;
  understanding: string;
  judgmentOneLiner: string;
  dimensions: {
    customer: string;
    problem: string;
    solution: string;
    customerChange: string;
  };
  trace: JudgmentTurnTrace | null;
  nextQuestion: string | null;
  nextQuestionReason: string | null;
  note?: string;
};

export type Day8iConversationResult = {
  businessDoc: string;
  totalTurns: number;
  turns: Day8iConversationTurnRecord[];
  finalReview: ReturnType<typeof buildBusinessReviewResult> | null;
  separationIssues: ReturnType<typeof detectDimensionSeparationIssues>;
  repeatedQuestions: Array<{ turn: number; question: string; priorTurn: number }>;
  unsupportedInferences: string[];
  judgmentChanges: Array<{
    turn: number;
    dimension: string;
    before: string;
    after: string;
    reason: string;
  }>;
};

const DEFAULT_DOC = `# 소규모 양조장 주문·배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 소규모 양조장·반찬가게 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함`;

/** 30-turn scenario covering A–J categories per DAY 8-I work order. */
export const DAY8I_30_TURN_SCENARIO: Day8iScenarioStep[] = [
  { category: 'A_normal', ceoAnswer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.' },
  { category: 'A_normal', ceoAnswer: '주문과 배송을 따로 관리해서 배송 누락이 자주 생깁니다.' },
  { category: 'A_normal', ceoAnswer: '주문과 배송을 한 곳에서 관리하는 SaaS를 만들려고 합니다.' },
  { category: 'A_normal', ceoAnswer: '배송 누락을 줄이고 주문 확인 시간을 단축할 수 있습니다.' },
  {
    category: 'B_off_slot',
    ceoAnswer: '엑셀로 주문을 관리하다 보니 배송 누락이 많습니다.',
    note: '고객 변화 질문에 문제/기존방식 답변',
  },
  {
    category: 'C_multi_fact',
    ceoAnswer:
      '소규모 양조장이 엑셀로 주문을 관리하고 배송 누락이 생겨서 주문과 배송을 한 곳에서 관리하려고 합니다.',
    note: '고객/문제/해결 한 답변',
  },
  { category: 'D_repeat', ceoAnswer: '소규모 양조장과 반찬가게 사장님이 주 고객입니다.', note: '고객 반복' },
  {
    category: 'E_correction',
    ceoAnswer: '고객은 양조장만이 아니라 반찬가게와 꽃집도 포함합니다.',
    note: '고객 수정',
  },
  { category: 'F_judgment_change', ceoAnswer: '배송 누락이 주문 건수의 10% 정도로 매우 심각합니다.' },
  { category: 'G_unknown', ceoAnswer: '정확한 시장 규모는 아직 모르겠습니다.' },
  { category: 'A_normal', ceoAnswer: '월 구독 3만원으로 소상공인이 직접 결제합니다.' },
  { category: 'I_research', ceoAnswer: '경쟁사가 누군지 모르겠습니다. 확인해주세요.' },
  { category: 'H_inference_risk', ceoAnswer: '고객은 주문 관리가 편해지면 좋겠다고만 말했습니다.' },
  { category: 'J_continuity', ceoAnswer: '양조장 사장님은 하루 20건 이상 주문을 받습니다.' },
  { category: 'A_normal', ceoAnswer: '카카오톡과 엑셀을 동시에 써서 실수가 많습니다.' },
  { category: 'C_multi_fact', ceoAnswer: '반찬가게는 배송 시간을 놓치면 재주문이 줄어드는 문제가 있습니다.' },
  { category: 'B_off_slot', ceoAnswer: '수익은 월 구독과 배송 건당 수수료입니다.', askedGap: 'validationTestability' },
  { category: 'F_judgment_change', ceoAnswer: '배송 누락을 80% 줄일 수 있다고 가설을 세웠습니다.' },
  { category: 'G_unknown', ceoAnswer: '고객 유지율은 아직 측정하지 못했습니다.' },
  { category: 'J_continuity', ceoAnswer: '처음에 말한 양조장 외에 꽃집도 같은 문제를 겪습니다.' },
  { category: 'A_normal', ceoAnswer: '모바일에서 주문 상태를 한눈에 보는 것이 핵심입니다.' },
  { category: 'E_correction', ceoAnswer: '사실 문제는 배송 누락보다 주문 확인 시간이 더 큽니다.' },
  { category: 'H_inference_risk', ceoAnswer: '고객이 원하는 건 정확히 말하지 않았습니다.' },
  { category: 'I_research', ceoAnswer: '시장 조사는 AI가 해주면 좋겠습니다.' },
  { category: 'A_normal', ceoAnswer: '직접 배송 소상공인 500곳을 1년 내 목표로 합니다.' },
  { category: 'C_multi_fact', ceoAnswer: '소상공인은 주문·배송 통합으로 실수를 줄이고 시간을 아낄 수 있습니다.' },
  { category: 'D_repeat', ceoAnswer: '주문과 배송을 한 곳에서 관리하는 SaaS입니다.', note: '해결방법 반복' },
  { category: 'F_judgment_change', ceoAnswer: 'MVP는 주문 입력과 배송 체크리스트만 제공할 계획입니다.' },
  { category: 'J_continuity', ceoAnswer: '지금까지 말한 고객·문제·해결이 맞는지 최종 확인합니다.' },
  { category: 'A_normal', ceoAnswer: '배송 누락 감소와 확인 시간 단축이 고객에게 가장 큰 변화입니다.' },
];

function questionFromDecision(
  decision: ReturnType<typeof resolveNextQuestionDecision>,
): { text: string; gap: string; reason: string | null } {
  if (!decision) return { text: '', gap: '', reason: null };
  if (isNextQuestionDecision(decision)) {
    return {
      text: decision.questionText,
      gap: decision.targetGap,
      reason: decision.whyNow ?? decision.rationale ?? null,
    };
  }
  return {
    text: decision.questionText ?? '',
    gap: decision.targetGap ?? '',
    reason: decision.whyNow ?? null,
  };
}

function dimLine(
  status: string,
  summary: string,
): string {
  if (!summary.trim()) return '🔴 (없음)';
  const glyph = status === 'clear' ? '🟢' : status === 'needs_check' ? '🟡' : '🔴';
  return `${glyph} ${summary.slice(0, 48)}`;
}

export function runDay8iConversation(input: {
  projectId?: string;
  documentText?: string;
  steps?: Day8iScenarioStep[];
}): Day8iConversationResult {
  const projectId = input.projectId ?? `day8i-${Date.now()}`;
  const documentText = input.documentText ?? DEFAULT_DOC;
  const steps = input.steps ?? DAY8I_30_TURN_SCENARIO;
  const understanding = buildBusinessUnderstanding(documentText)!;

  clearAiPmLoopState(projectId);
  saveAiPmLoopState(
    {
      version: 1,
      phase: 'answer',
      turns: [],
      currentIssueId: 'customer_definition',
      readingCompleted: true,
      dismissedReadAck: true,
      judgmentTraces: [],
    },
    projectId,
  );

  const turns: Day8iConversationTurnRecord[] = [];
  const questionHistory: Array<{ turn: number; text: string }> = [];
  const judgmentChanges: Day8iConversationResult['judgmentChanges'] = [];
  const unsupportedInferences: string[] = [];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]!;
    let loop = loadAiPmLoopState(projectId);
    const memory = buildConversationMemoryFromSources({
      projectId,
      documentText,
      turns: loop.turns,
    });
    const living = buildLivingUnderstandingState({
      documentText,
      understanding,
      turns: loop.turns,
      memory,
    });

    const decision = resolveNextQuestionDecision({
      living,
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
      projectId,
    });
    const { text: question, gap: targetGap, reason: nextReason } =
      questionFromDecision(decision);

    const binding = resolveGapQuestionBinding(targetGap || 'customerPersona');
    const askedGap = step.askedGap ?? targetGap ?? binding?.targetGap ?? 'customerPersona';
    const askedIssueId = step.askedIssueId ?? binding?.issueId ?? 'customer_definition';
    const displayQuestion = question || binding?.questionText || '질문';

    const appliedAt = new Date(Date.now() + i * 1000).toISOString();
    const turn: AiPmLoopTurn = {
      issueId: askedIssueId,
      answer: step.ceoAnswer,
      appliedAt,
      targetGap: askedGap,
      askedQuestionText: displayQuestion,
    };

    loop = appendLoopTurnWithReview(
      turn,
      {
        askedGapId: askedGap,
        askedQuestionText: displayQuestion,
        askedIssueId,
        userAnswer: step.ceoAnswer,
        displayedQuestionText: displayQuestion,
      },
      projectId,
    );

    const processed = runLoopAnswerProcessing({
      projectId,
      documentText,
      understanding,
    });

    const turnsBefore = loop.turns.slice(0, -1);
    const livingBefore =
      turnsBefore.length > 0
        ? buildLivingUnderstandingState({
            documentText,
            understanding,
            turns: turnsBefore,
            memory,
          })
        : null;
    const beforeState = livingBefore
      ? buildCeoJudgmentState({ living: livingBefore, turns: turnsBefore })
      : null;

    const sync = syncJudgmentAfterAnswer({
      projectId,
      living: processed.living,
      loop: processed.loop,
      lastQuestionText: displayQuestion,
      beforeState,
    });

    const j = sync.judgment;
    const record: Day8iConversationTurnRecord = {
      turnIndex: i + 1,
      category: step.category,
      question: displayQuestion,
      targetGap: askedGap,
      ceoAnswer: step.ceoAnswer,
      understanding: processed.living.spine.problem || processed.living.spine.customer || '',
      judgmentOneLiner: j.oneLiner,
      dimensions: {
        customer: dimLine(j.dimensions.customer.status, j.dimensions.customer.summary),
        problem: dimLine(j.dimensions.problem.status, j.dimensions.problem.summary),
        solution: dimLine(j.dimensions.solution.status, j.dimensions.solution.summary),
        customerChange: dimLine(
          j.dimensions.customerChange.status,
          j.dimensions.customerChange.summary,
        ),
      },
      trace: sync.turnTrace ?? null,
      nextQuestion: null,
      nextQuestionReason: nextReason,
      note: step.note,
    };

    if (sync.turnTrace) {
      for (const entry of sync.turnTrace.dimensionEntries) {
        judgmentChanges.push({
          turn: i + 1,
          dimension: entry.affectedDimension,
          before: entry.previousJudgment.summary,
          after: entry.newJudgment.summary,
          reason: entry.reason,
        });
      }
    }

    if (
      j.dimensions.customer.summary &&
      !step.ceoAnswer.includes('고객') &&
      !step.ceoAnswer.includes('양조') &&
      !step.ceoAnswer.includes('반찬') &&
      !step.ceoAnswer.includes('소상공인') &&
      j.dimensions.customer.status === 'clear' &&
      step.category === 'H_inference_risk'
    ) {
      unsupportedInferences.push(
        `Turn ${i + 1}: 고객 확정 "${j.dimensions.customer.summary}" — CEO 답변에 고객 단서 없음`,
      );
    }

    const nextDecision = resolveNextQuestionDecision({
      living: processed.living,
      turns: sync.loop.turns,
      memory: processed.memory,
      gapState: sync.loop.gapState,
      projectId,
    });
    record.nextQuestion = questionFromDecision(nextDecision).text || null;

    turns.push(record);
    questionHistory.push({ turn: i + 1, text: displayQuestion });
  }

  const finalLoop = loadAiPmLoopState(projectId);
  const finalMemory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: finalLoop.turns,
  });
  const finalLiving = buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: finalLoop.turns,
    memory: finalMemory,
  });
  const { state: finalJudgment } = buildCeoJudgmentStateWithTrace({
    living: finalLiving,
    turns: finalLoop.turns,
    prior: finalLoop.ceoJudgment,
  });

  const separationIssues = detectDimensionSeparationIssues(finalJudgment);
  const finalReview = buildBusinessReviewResult(finalJudgment);

  const repeatedQuestions: Day8iConversationResult['repeatedQuestions'] = [];
  for (let i = 1; i < questionHistory.length; i += 1) {
    const cur = questionHistory[i]!;
    for (let j = 0; j < i; j += 1) {
      const prev = questionHistory[j]!;
      if (cur.text.trim() && cur.text.trim() === prev.text.trim()) {
        repeatedQuestions.push({
          turn: cur.turn,
          question: cur.text,
          priorTurn: prev.turn,
        });
      }
    }
  }

  return {
    businessDoc: documentText,
    totalTurns: turns.length,
    turns,
    finalReview,
    separationIssues,
    repeatedQuestions,
    unsupportedInferences,
    judgmentChanges,
  };
}

export function formatDay8iCtoReport(result: Day8iConversationResult): string {
  const lines: string[] = [];
  lines.push('# ALABOM — DAY 8-I CTO 20~30 Turn Test Report');
  lines.push('');
  lines.push('## 1. Test Context');
  lines.push('');
  lines.push(`사업:\n${result.businessDoc.split('\n').slice(0, 4).join('\n')}`);
  lines.push('시작 조건: V3 review pipeline ON, judgment aggregation ON, fresh session');
  lines.push(`총 Turn: ${result.totalTurns}`);
  lines.push('');
  lines.push('## 2. Full Conversation Trace');
  lines.push('');
  for (const t of result.turns) {
    lines.push(`### Turn ${String(t.turnIndex).padStart(2, '0')} [${t.category}]`);
    lines.push(`CEO: ${t.ceoAnswer}`);
    lines.push(`AI Question: ${t.question}`);
    lines.push(`Understanding: ${t.understanding || '(pending)'}`);
    lines.push(`Judgment: ${t.judgmentOneLiner || '(pending)'}`);
    lines.push(
      `Dimensions: customer=${t.dimensions.customer} | problem=${t.dimensions.problem} | solution=${t.dimensions.solution} | change=${t.dimensions.customerChange}`,
    );
    if (t.trace?.dimensionEntries.length) {
      for (const e of t.trace.dimensionEntries) {
        lines.push(
          `  → ${e.affectedDimension} [${e.changeType}]: "${e.previousJudgment.summary}" → "${e.newJudgment.summary}" (${e.reason})`,
        );
      }
    }
    lines.push(`Next Question: ${t.nextQuestion ?? '(none)'}`);
    if (t.note) lines.push(`Note: ${t.note}`);
    lines.push('');
  }
  lines.push('## 3. Judgment Evolution');
  lines.push('');
  lines.push(
    formatJudgmentEvolutionTable(
      result.turns
        .filter((t) => t.trace)
        .map((t) => t.trace!),
    ),
  );
  lines.push('');
  lines.push('## 4. Answer → Evidence → Dimension');
  lines.push('');
  for (const t of result.turns) {
    if (!t.trace?.dimensionEntries.length) continue;
    lines.push(`Turn ${String(t.turnIndex).padStart(2, '0')}:`);
    for (const e of t.trace.dimensionEntries) {
      lines.push(
        `  - ${e.affectedDimension}: evidence="${e.evidence}" meaning="${e.interpretedMeaning}"`,
      );
    }
  }
  lines.push('');
  lines.push('## 5. 반복 질문');
  lines.push('');
  if (result.repeatedQuestions.length === 0) {
    lines.push('발생 여부: 없음');
  } else {
    lines.push('발생 여부: 있음');
    for (const r of result.repeatedQuestions) {
      lines.push(`- Turn ${r.turn} (prior Turn ${r.priorTurn}): "${r.question}"`);
    }
  }
  lines.push('');
  lines.push('## 6. 판단 오류 (Dimension Separation)');
  lines.push('');
  if (result.separationIssues.length === 0) {
    lines.push('문제 없음');
  } else {
    for (const issue of result.separationIssues) {
      lines.push(
        `- ${issue.dimensionA} ↔ ${issue.dimensionB}: "${issue.sharedSummary}" — ${issue.reason}`,
      );
    }
  }
  lines.push('');
  lines.push('## 7. Unsupported Inference');
  lines.push('');
  if (result.unsupportedInferences.length === 0) {
    lines.push('없음');
  } else {
    for (const inf of result.unsupportedInferences) {
      lines.push(`- ${inf}`);
    }
  }
  lines.push('');
  lines.push('## 8. Judgment Change');
  lines.push('');
  for (const ch of result.judgmentChanges.slice(-20)) {
    lines.push(
      `- Turn ${ch.turn} ${ch.dimension}: "${ch.before}" → "${ch.after}" (${ch.reason})`,
    );
  }
  lines.push('');
  lines.push('## 9. Final Business Review');
  lines.push('');
  if (result.finalReview) {
    lines.push(`Verdict: ${result.finalReview.verdictLabel}`);
    lines.push(`Conclusion: ${result.finalReview.aiJudgmentBody}`);
    lines.push(`Next action: ${result.finalReview.nextAction}`);
    lines.push('Dimensions:');
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as const) {
      const d = result.finalReview.dimensions[id];
      lines.push(`  - ${d.label}: ${d.status} — ${d.summary}`);
    }
  }
  lines.push('');
  lines.push('## 10. CTO 판정');
  lines.push('');
  const fail =
    result.separationIssues.length > 0 ||
    result.unsupportedInferences.length > 2 ||
    result.repeatedQuestions.length > 3;
  lines.push(fail ? 'FAIL' : 'PASS');
  lines.push('');
  lines.push(
    `Generated: ${new Date().toISOString()} | Turns: ${result.totalTurns} | Separation issues: ${result.separationIssues.length} | Repeated Q: ${result.repeatedQuestions.length}`,
  );
  return lines.join('\n');
}
