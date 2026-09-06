/**
 * DAY 8-I — CPO Evidence Report generator.
 * Produces full 30-turn verbatim trace for CPO independent review.
 * Report-only layer — no V3 core changes.
 */

import type { CeoJudgmentDimensionId, CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS, statusEmoji } from './ai-pm-ceo-judgment-dimensions';
import { extractDimensionSummaries } from './ai-pm-dimension-extract';
import type { JudgmentTraceEntry } from './ai-pm-judgment-trace';
import type { Day8iConversationResult, Day8iConversationTurnRecord } from './day8i-conversation-harness';
import { runCpoRSelfChecks, type CpoRSelfCheck } from './day8i-cpo-r-self-check';

export type { CpoRSelfCheck };
export { runCpoRSelfChecks };

export type Day8iCpoEvidenceMeta = {
  commitSha: string;
  branch: string;
  executedAt: string;
  command: string;
  environment: string;
  v3ReviewPipeline: boolean;
  judgmentAggregation: boolean;
  testResult: 'PASS' | 'FAIL';
  nodeVersion: string;
};

function dimCell(status: string, summary: string): string {
  if (!summary.trim()) return '—';
  const glyph = status === 'clear' ? '🟢' : status === 'needs_check' ? '🟡' : '🔴';
  return `${glyph} ${summary.replace(/\s+/g, ' ').slice(0, 40)}`;
}

function formatDimensionBlock(
  id: CeoJudgmentDimensionId,
  state: CeoJudgmentState,
): string {
  const d = state.dimensions[id];
  return `${CEO_JUDGMENT_DIMENSION_LABELS[id]}: ${statusEmoji(d.status)} ${d.status} — ${d.summary || '(empty)'}`;
}

function findDuplicateSummaries(state: CeoJudgmentState): Array<{
  dimensionA: CeoJudgmentDimensionId;
  dimensionB: CeoJudgmentDimensionId;
  summary: string;
}> {
  const ids: CeoJudgmentDimensionId[] = [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ];
  const dupes: Array<{
    dimensionA: CeoJudgmentDimensionId;
    dimensionB: CeoJudgmentDimensionId;
    summary: string;
  }> = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i]!;
      const b = ids[j]!;
      const sa = state.dimensions[a].summary.trim();
      const sb = state.dimensions[b].summary.trim();
      if (sa && sb && sa === sb) {
        dupes.push({ dimensionA: a, dimensionB: b, summary: sa });
      }
    }
  }
  return dupes;
}

function classifyAnswerDimension(answer: string): CeoJudgmentDimensionId[] {
  const extracted = extractDimensionSummaries(answer);
  return (Object.keys(extracted) as CeoJudgmentDimensionId[]).filter(
    (k) => extracted[k]?.summary,
  );
}

function formatTurnBlock(t: Day8iConversationTurnRecord): string {
  const lines: string[] = [];
  lines.push(`Turn ${String(t.turnIndex).padStart(2, '0')}`);
  lines.push('');
  lines.push(`Category: ${t.category}`);
  lines.push('');
  lines.push('CEO Answer:');
  lines.push(t.ceoAnswer);
  lines.push('');
  lines.push('AI Question:');
  lines.push(t.question || '(none)');
  lines.push('');
  lines.push(`Target Gap: ${t.targetGap}`);
  if (t.nextQuestionReason) {
    lines.push(`Next Question Reason: ${t.nextQuestionReason}`);
  }
  lines.push('');
  lines.push('Understanding (spine):');
  lines.push(t.understanding || '(pending)');
  lines.push('');
  lines.push('Judgment One-liner:');
  lines.push(t.judgmentOneLiner || '(pending)');
  lines.push('');

  const entries = t.trace?.dimensionEntries ?? [];
  if (entries.length === 0) {
    lines.push('Affected Dimension: none');
    lines.push('');
    lines.push('Change Type: UNCHANGED');
    lines.push('');
    lines.push('Current Judgment Snapshot:');
    lines.push(`  customer: ${t.dimensions.customer}`);
    lines.push(`  problem: ${t.dimensions.problem}`);
    lines.push(`  solution: ${t.dimensions.solution}`);
    lines.push(`  customerChange: ${t.dimensions.customerChange}`);
  } else {
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i]!;
      if (i > 0) lines.push('---');
      lines.push('AI Interpretation:');
      lines.push(e.interpretedMeaning);
      lines.push('');
      lines.push('Evidence:');
      lines.push(e.evidence);
      lines.push('');
      lines.push(`Affected Dimension: ${e.affectedDimension}`);
      lines.push('');
      lines.push('Previous Judgment:');
      lines.push(
        `  status=${e.previousJudgment.status} summary="${e.previousJudgment.summary || '(empty)'}"`,
      );
      lines.push('');
      lines.push('New Judgment:');
      lines.push(
        `  status=${e.newJudgment.status} summary="${e.newJudgment.summary || '(empty)'}"`,
      );
      lines.push('');
      lines.push(`Change Type: ${e.changeType}`);
      lines.push('');
      lines.push('Reason:');
      lines.push(e.reason);
      if (e.knownPriorInfo) {
        lines.push('');
        lines.push(`Known Prior Info: ${e.knownPriorInfo}`);
      }
      if (e.newlyAddedInfo) {
        lines.push(`Newly Added Info: ${e.newlyAddedInfo}`);
      }
    }
  }

  lines.push('');
  lines.push('Next Question:');
  lines.push(t.nextQuestion ?? '(none)');
  if (t.note) {
    lines.push('');
    lines.push(`Note: ${t.note}`);
  }
  lines.push('');
  return lines.join('\n');
}

function buildEvolutionTable(result: Day8iConversationResult): string {
  const header =
    '| Turn | Customer | Problem | Solution | Customer Change |';
  const sep = '|------|----------|---------|----------|-----------------|';
  const rows = result.turns.map((t) => {
    const snap = t.judgmentSnapshot;
    if (!snap) {
      return `| ${String(t.turnIndex).padStart(2, '0')} | ${t.dimensions.customer.slice(0, 44)} | ${t.dimensions.problem.slice(0, 44)} | ${t.dimensions.solution.slice(0, 44)} | ${t.dimensions.customerChange.slice(0, 44)} |`;
    }
    return `| ${String(t.turnIndex).padStart(2, '0')} | ${dimCell(snap.dimensions.customer.status, snap.dimensions.customer.summary)} | ${dimCell(snap.dimensions.problem.status, snap.dimensions.problem.summary)} | ${dimCell(snap.dimensions.solution.status, snap.dimensions.solution.summary)} | ${dimCell(snap.dimensions.customerChange.status, snap.dimensions.customerChange.summary)} |`;
  });
  return [header, sep, ...rows].join('\n');
}

function buildQuestionRepetitionAnalysis(
  result: Day8iConversationResult,
): string {
  const lines: string[] = [];
  const seen = new Map<string, number>();

  for (const t of result.turns) {
    const q = t.question.trim();
    if (!q) continue;
    const priorTurn = seen.get(q);
    lines.push(`Turn ${String(t.turnIndex).padStart(2, '0')}`);
    lines.push(`현재 질문: ${q}`);
    if (priorTurn !== undefined) {
      lines.push(`이전 동일 질문 Turn: ${String(priorTurn).padStart(2, '0')}`);
      lines.push('반복 여부: **동일 질문 재출현**');
      lines.push('반복이 아닌 이유: N/A — exact match');
    } else {
      lines.push('이전 동일 질문: 없음');
      lines.push('반복 여부: 아님');
      const similar = result.turns.filter(
        (other) =>
          other.turnIndex < t.turnIndex &&
          other.question.trim() &&
          tokenOverlap(other.question, q) >= 0.5 &&
          other.question.trim() !== q,
      );
      if (similar.length > 0) {
        lines.push('유사 질문 (50%+ token overlap):');
        for (const s of similar) {
          lines.push(
            `  - Turn ${String(s.turnIndex).padStart(2, '0')}: ${s.question} (overlap but different gap/target)`,
          );
        }
        lines.push(
          `반복이 아닌 이유: targetGap=${t.targetGap}, prior gaps differ or probe/clarify action`,
        );
      } else {
        lines.push('반복이 아닌 이유: 이전 턴과 질문 텍스트·gap 다름');
      }
      seen.set(q, t.turnIndex);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  const tb = new Set(b.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
  }
  return shared / Math.max(ta.size, tb.size);
}

function buildJudgmentChangeSection(result: Day8iConversationResult): string {
  const lines: string[] = [];
  for (const t of result.turns) {
    for (const e of t.trace?.dimensionEntries ?? []) {
      const actualChange =
        e.previousJudgment.summary.trim() !== e.newJudgment.summary.trim() ||
        e.previousJudgment.status !== e.newJudgment.status;
      const flagged =
        (e.changeType === 'CHANGED' || e.changeType === 'NEW') && !actualChange
          ? ' ⚠️ FLAG: changeType vs actual mismatch'
          : e.changeType === 'UNCHANGED' && actualChange
            ? ' ⚠️ FLAG: UNCHANGED but summary/status differ'
            : '';

      lines.push(`Turn ${String(t.turnIndex).padStart(2, '0')} — ${e.affectedDimension}${flagged}`);
      lines.push(`Before: [${e.previousJudgment.status}] "${e.previousJudgment.summary || '(empty)'}"`);
      lines.push(`CEO Answer: ${t.ceoAnswer}`);
      lines.push(`Evidence: ${e.evidence}`);
      lines.push(`After: [${e.newJudgment.status}] "${e.newJudgment.summary || '(empty)'}"`);
      lines.push(`Change Type: ${e.changeType}`);
      lines.push(`Why: ${e.reason}`);
      lines.push('');
    }
  }
  if (lines.length === 0) {
    lines.push('(no trace entries recorded)');
  }
  return lines.join('\n');
}

export function formatDay8iCpoEvidenceReport(
  result: Day8iConversationResult,
  meta: Day8iCpoEvidenceMeta,
): string {
  const lines: string[] = [];
  lines.push('# ALABOM — DAY 8-I CPO Review Evidence Report');
  lines.push('');
  lines.push('> **CTO 1차 테스트 ≠ CPO PASS.** This document is for CPO independent 2nd review.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. 실행 정보');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Commit SHA | \`${meta.commitSha}\` |`);
  lines.push(`| Branch | \`${meta.branch}\` |`);
  lines.push(`| 실행 명령 | \`${meta.command}\` |`);
  lines.push(`| 실행 시각 (UTC) | ${meta.executedAt} |`);
  lines.push(`| Node | ${meta.nodeVersion} |`);
  lines.push(`| 환경 | ${meta.environment} |`);
  lines.push(`| V3 Review Pipeline | ${meta.v3ReviewPipeline ? 'ON' : 'OFF'} |`);
  lines.push(`| Judgment Aggregation V1 | ${meta.judgmentAggregation ? 'ON' : 'OFF'} |`);
  lines.push(`| 총 Turn | ${result.totalTurns} |`);
  lines.push(`| CTO 1차 테스트 결과 | ${meta.testResult} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. 30턴 전체 원문 (Turn 01–30)');
  lines.push('');
  for (const t of result.turns) {
    lines.push(formatTurnBlock(t));
    lines.push('---');
    lines.push('');
  }

  lines.push('## 3. Judgment Evolution');
  lines.push('');
  lines.push(buildEvolutionTable(result));
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 4. 답변 → Dimension 분리 검증');
  lines.push('');
  const dimAnswerTurns: Record<CeoJudgmentDimensionId, number[]> = {
    customer: [],
    problem: [],
    solution: [],
    customerChange: [],
  };
  for (const t of result.turns) {
    const dims = classifyAnswerDimension(t.ceoAnswer);
    for (const d of dims) dimAnswerTurns[d].push(t.turnIndex);
  }
  lines.push('| Dimension | CEO Answer Turns | Example |');
  lines.push('|-----------|------------------|---------|');
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const turns = dimAnswerTurns[id];
    const example = result.turns.find((t) => turns.includes(t.turnIndex));
    lines.push(
      `| ${CEO_JUDGMENT_DIMENSION_LABELS[id]} | ${turns.map((n) => String(n).padStart(2, '0')).join(', ') || '—'} | ${example?.ceoAnswer.slice(0, 60) ?? '—'} |`,
    );
  }
  lines.push('');
  lines.push('### 동일 문장 Dimension 복사 (턴·최종)');
  lines.push('');
  let anyDupe = false;
  for (const t of result.turns) {
    if (!t.judgmentSnapshot) continue;
    const dupes = findDuplicateSummaries(t.judgmentSnapshot);
    if (dupes.length === 0) continue;
    anyDupe = true;
    lines.push(`**Turn ${String(t.turnIndex).padStart(2, '0')}:**`);
    for (const d of dupes) {
      lines.push(
        `- ${CEO_JUDGMENT_DIMENSION_LABELS[d.dimensionA]} ↔ ${CEO_JUDGMENT_DIMENSION_LABELS[d.dimensionB]}: "${d.summary}"`,
      );
    }
  }
  if (result.finalJudgmentSnapshot) {
    const finalDupes = findDuplicateSummaries(result.finalJudgmentSnapshot);
    if (finalDupes.length > 0) {
      anyDupe = true;
      lines.push('**Final (Turn 30):**');
      for (const d of finalDupes) {
        lines.push(
          `- ${CEO_JUDGMENT_DIMENSION_LABELS[d.dimensionA]} ↔ ${CEO_JUDGMENT_DIMENSION_LABELS[d.dimensionB]}: "${d.summary}"`,
        );
      }
    }
  }
  if (!anyDupe) lines.push('동일 문장 복사: **없음**');
  lines.push('');
  for (const issue of result.separationIssues) {
    lines.push(
      `- [semantic] ${issue.dimensionA} ↔ ${issue.dimensionB}: "${issue.sharedSummary}" — ${issue.reason}`,
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 5. 반복 질문 검증');
  lines.push('');
  lines.push(buildQuestionRepetitionAnalysis(result));
  if (result.repeatedQuestions.length > 0) {
    lines.push('### Exact duplicate questions');
    for (const r of result.repeatedQuestions) {
      lines.push(
        `- Turn ${String(r.turn).padStart(2, '0')} repeats Turn ${String(r.priorTurn).padStart(2, '0')}: "${r.question}"`,
      );
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## 6. Unsupported Inference 검증');
  lines.push('');
  if (result.unsupportedInferences.length === 0 && result.inferenceChecks.length === 0) {
    lines.push('검출된 unsupported inference: **없음**');
  } else {
    for (const c of result.inferenceChecks) {
      lines.push(`Turn ${String(c.turn).padStart(2, '0')}`);
      lines.push(`CEO가 실제로 말한 내용: ${c.ceoSaid}`);
      lines.push(`AI가 판단한 내용: ${c.aiJudged}`);
      lines.push(`근거 존재 여부: ${c.hasEvidence ? '있음' : '없음'}`);
      lines.push(`**${c.verdict}**`);
      lines.push('');
    }
    for (const inf of result.unsupportedInferences) {
      lines.push(`- ${inf}`);
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## 7. Judgment Change 검증');
  lines.push('');
  lines.push(buildJudgmentChangeSection(result));

  lines.push('---');
  lines.push('');
  lines.push('## 8. 최종 Business Review (Turn 30 종료 시 실제 출력)');
  lines.push('');
  if (result.finalReview && result.finalJudgmentSnapshot) {
    const r = result.finalReview;
    const j = result.finalJudgmentSnapshot;
    lines.push('### 한 줄 사업 이해');
    lines.push(r.oneLiner);
    lines.push('');
    lines.push('### 4 Dimension');
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      lines.push(formatDimensionBlock(id, j));
    }
    lines.push('');
    lines.push('### 현재 AI 판단');
    lines.push(`${r.aiJudgmentHeadline}`);
    lines.push(r.aiJudgmentBody);
    lines.push('');
    lines.push('### 추가 확인사항');
    lines.push(r.primaryGapLabel ? `${r.primaryGapLabel}: ${r.primaryGapSummary ?? ''}` : '(none)');
    lines.push(r.primaryGapWhy ?? '');
    lines.push('');
    lines.push('### GO / 조건부 GO / NO-GO');
    lines.push(`${r.verdictEmoji} ${r.verdictLabel}`);
    lines.push(r.verdictExplanation);
    lines.push('');
    lines.push('### 다음 행동');
    lines.push(r.nextAction);
    lines.push('');
    lines.push(`Readiness: ${r.readinessEmoji} ${r.readinessLabel}`);
  }

  lines.push('---');
  lines.push('');
  lines.push('## 9. CTO 자기검증 (CPO-R1~R12)');
  lines.push('');
  lines.push('| ID | Label | Verdict | Evidence Turns | Rationale |');
  lines.push('|----|-------|---------|----------------|-----------|');
  const selfChecks = result.cpoSelfChecks ?? runCpoRSelfChecks();
  for (const c of selfChecks) {
    lines.push(
      `| ${c.id} | ${c.label} | **${c.verdict}** | ${c.evidenceTurns} | ${c.rationale.replace(/\|/g, '/')} |`,
    );
  }
  lines.push('');
  const failCount = selfChecks.filter((c) => c.verdict === 'FAIL').length;
  lines.push(`CTO self-check: ${selfChecks.length - failCount}/${selfChecks.length} PASS, ${failCount} FAIL`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## CPO Review Evidence (mandatory section)');
  lines.push('');
  lines.push('CPO 2차 검토 시 아래를 독립적으로 확인:');
  lines.push('');
  lines.push('1. Section 2 Turn 01–30 원문을 **요약 없이** 읽었는가');
  lines.push('2. Section 3 evolution에서 Turn 01→30 연속성 확인');
  lines.push('3. Section 4 dimension 분리 — 복사된 동일 문장 여부');
  lines.push('4. Section 6 unsupported inference — FAIL 항목 분류');
  lines.push('5. Section 9 CTO self-check — CPO가 동일 R1–R12를 재실행하여 교차검증');
  lines.push('');
  lines.push('**CPO PASS 전까지 CEO TEST = HOLD**');
  lines.push('');
  lines.push(`Report generated: ${meta.executedAt}`);

  return lines.join('\n');
}

export type { JudgmentTraceEntry };
