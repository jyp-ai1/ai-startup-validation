/**
 * DAY 8-I — CPO Review Pack (conversation-pasteable format).
 * No code changes — report-only for CPO 2nd review.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationResult, Day8iConversationTurnRecord } from './day8i-conversation-harness';
import type { CpoRSelfCheck } from './day8i-cpo-r-self-check';

export type CpoReviewPackMeta = {
  commitSha: string;
  branch: string;
  executedAt: string;
  command: string;
};

function formatTurnFull(t: Day8iConversationTurnRecord): string {
  const lines: string[] = [];
  lines.push(`### Turn ${String(t.turnIndex).padStart(2, '0')} [${t.category}]`);
  lines.push('');
  lines.push('CEO Answer:');
  lines.push(t.ceoAnswer);
  lines.push('');
  lines.push('AI Question:');
  lines.push(t.question || '(none)');
  lines.push('');

  const entries = t.trace?.dimensionEntries ?? [];
  if (entries.length === 0) {
    lines.push('Interpretation: (no dimension change this turn)');
    lines.push('Evidence: —');
    lines.push('Affected Dimension: none');
    lines.push('Previous Judgment: —');
    lines.push('New Judgment: —');
    lines.push('Change Type: UNCHANGED');
    lines.push('Reason: —');
  } else {
    entries.forEach((e, i) => {
      if (i > 0) lines.push('');
      lines.push('Interpretation:');
      lines.push(e.interpretedMeaning);
      lines.push('');
      lines.push('Evidence:');
      lines.push(e.evidence);
      lines.push('');
      lines.push(`Affected Dimension: ${e.affectedDimension}`);
      lines.push('');
      lines.push('Previous Judgment:');
      lines.push(`  [${e.previousJudgment.status}] ${e.previousJudgment.summary || '(empty)'}`);
      lines.push('');
      lines.push('New Judgment:');
      lines.push(`  [${e.newJudgment.status}] ${e.newJudgment.summary || '(empty)'}`);
      lines.push('');
      lines.push(`Change Type: ${e.changeType}`);
      lines.push('');
      lines.push('Reason:');
      lines.push(e.reason);
    });
  }

  lines.push('');
  lines.push(`Next Question: ${t.nextQuestion ?? '(none)'}`);
  if (t.note) lines.push(`Note: ${t.note}`);
  lines.push('');
  return lines.join('\n');
}

function turnByIndex(result: Day8iConversationResult, n: number): Day8iConversationTurnRecord | undefined {
  return result.turns.find((t) => t.turnIndex === n);
}

function formatTurnEvidence(t: Day8iConversationTurnRecord | undefined): string {
  if (!t) return '(turn not found)';
  const lines: string[] = [];
  lines.push(`Turn ${String(t.turnIndex).padStart(2, '0')}`);
  lines.push(`CEO Answer: "${t.ceoAnswer}"`);
  lines.push(`AI Question: "${t.question}"`);
  const e = t.trace?.dimensionEntries[0];
  if (e) {
    lines.push(`Affected Dimension: ${e.affectedDimension}`);
    lines.push(`Previous Judgment: [${e.previousJudgment.status}] "${e.previousJudgment.summary || '(empty)'}"`);
    lines.push(`New Judgment: [${e.newJudgment.status}] "${e.newJudgment.summary || '(empty)'}"`);
    lines.push(`Change Type: ${e.changeType}`);
    lines.push(`Evidence: "${e.evidence}"`);
  } else {
    lines.push('Affected Dimension: none (UNCHANGED)');
    if (t.judgmentSnapshot) {
      const j = t.judgmentSnapshot;
      lines.push(
        `Current: customer="${j.dimensions.customer.summary}" problem="${j.dimensions.problem.summary}" solution="${j.dimensions.solution.summary}" change="${j.dimensions.customerChange.summary}"`,
      );
    }
  }
  return lines.join('\n');
}

/** R1–R12 with verbatim turn evidence for CPO paste review */
function formatRWithEvidence(result: Day8iConversationResult, checks: CpoRSelfCheck[]): string {
  const rTurnMap: Record<string, number[]> = {
    'CPO-R1': [1, 7],
    'CPO-R2': [2, 5],
    'CPO-R3': [3, 6],
    'CPO-R4': [4, 30],
    'CPO-R5': [5],
    'CPO-R6': [6, 16, 26],
    'CPO-R7': [7, 27],
    'CPO-R8': [8],
    'CPO-R9': [10, 19],
    'CPO-R10': [1, 30],
    'CPO-R11': [30],
    'CPO-R12': [2, 4, 6],
  };

  const rReason: Record<string, string> = {
    'CPO-R1': '고객 답변 Turn 01/07에서 customer만 갱신, solution은 unknown 유지',
    'CPO-R2': '문제 답변 Turn 02/05에서 problem dimension에 누락·관리 불편 반영',
    'CPO-R3': '해결 방법 Turn 03/06에서 solution에 SaaS·한 곳 관리 반영',
    'CPO-R4': '고객 변화 Turn 04/30에서 customerChange에 누락 감소·시간 단축 반영',
    'CPO-R5': 'Turn 05 off-slot: validationTestability 질문에 엑셀/누락 답 → problem 반영',
    'CPO-R6': 'Turn 06 multi-fact: customer/problem/solution clause 분리, 동일문장 복사 없음',
    'CPO-R7': 'Turn 07 repeat: Turn 01과 동일 고객 답변 → summary unchanged',
    'CPO-R8': 'Turn 08 correction: 반찬가게·꽃집 포함으로 customer 업데이트',
    'CPO-R9': 'Turn 10/19 unknown: "모르겠습니다" → dimension invent 없음',
    'CPO-R10': 'Turn 01 customer가 Turn 30 evolution table까지 유지',
    'CPO-R11': 'Turn 30 final oneLiner ≠ raw businessDoc echo',
    'CPO-R12': '각 turn Next Question이 gap/whyNow와 연결 (Section 2 참조)',
  };

  const lines: string[] = [];
  for (const c of checks) {
    lines.push(`---`);
    lines.push(`${c.id}`);
    lines.push(`판정: ${c.verdict}`);
    lines.push('');
    lines.push('근거:');
    const turns = rTurnMap[c.id] ?? [];
    for (const n of turns) {
      lines.push(formatTurnEvidence(turnByIndex(result, n)));
      lines.push('');
    }
    lines.push('검증 이유:');
    lines.push(rReason[c.id] ?? c.rationale);
    lines.push('');
  }
  return lines.join('\n');
}

function dimEvolutionRow(t: Day8iConversationTurnRecord): string {
  const j = t.judgmentSnapshot;
  if (!j) return `| ${String(t.turnIndex).padStart(2, '0')} | — | — | — | — |`;
  const c = (s: string, x: string) => (x.trim() ? `${s} ${x.slice(0, 36)}` : '—');
  return `| ${String(t.turnIndex).padStart(2, '0')} | ${c('🟢', j.dimensions.customer.summary)} | ${c('🟢', j.dimensions.problem.summary)} | ${c('🟡', j.dimensions.solution.summary)} | ${c('🟢', j.dimensions.customerChange.summary)} |`;
}

export function formatDay8iCpoReviewPack(
  result: Day8iConversationResult,
  meta: CpoReviewPackMeta,
): string {
  const lines: string[] = [];
  lines.push('# ALABOM — DAY 8-I CPO REVIEW PACK');
  lines.push('');
  lines.push('> CPO 2차 검토용 — 대화 본문 붙여넣기 형식. 코드 변경 없음.');
  lines.push('');
  lines.push(`Commit: \`${meta.commitSha}\` | Branch: \`${meta.branch}\` | UTC: ${meta.executedAt}`);
  lines.push(`Command: \`${meta.command}\` | Turns: ${result.totalTurns}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('# PART 1 — 30턴 전체 원문');
  lines.push('');
  for (const t of result.turns) {
    lines.push(formatTurnFull(t));
    lines.push('---');
    lines.push('');
  }

  lines.push('# PART 2 — CPO 핵심 검증 결과');
  lines.push('');
  lines.push('## 2-A Judgment Evolution (Turn 01–30)');
  lines.push('');
  lines.push('| Turn | Customer | Problem | Solution | Customer Change |');
  lines.push('|------|----------|---------|----------|-----------------|');
  for (const t of result.turns) lines.push(dimEvolutionRow(t));
  lines.push('');

  lines.push('## 2-B Dimension 오염 / 동일 문장 복사');
  lines.push('');
  if (result.separationIssues.length === 0) {
    lines.push('**검출: 없음** (semantic separation check PASS)');
  } else {
    for (const i of result.separationIssues) {
      lines.push(`- ${i.dimensionA} ↔ ${i.dimensionB}: "${i.sharedSummary}" — ${i.reason}`);
    }
  }
  lines.push('');

  lines.push('## 2-C 반복 질문 (exact match)');
  lines.push('');
  if (result.repeatedQuestions.length === 0) {
    lines.push('**Exact duplicate: 없음**');
  } else {
    for (const r of result.repeatedQuestions) {
      lines.push(`- Turn ${String(r.turn).padStart(2, '0')} repeats Turn ${String(r.priorTurn).padStart(2, '0')}: "${r.question}"`);
    }
  }
  lines.push('');

  lines.push('## 2-D Unsupported Inference');
  lines.push('');
  if (result.inferenceChecks.length === 0 && result.unsupportedInferences.length === 0) {
    lines.push('**검출: 없음**');
  } else {
    for (const c of result.inferenceChecks) {
      lines.push(`Turn ${String(c.turn).padStart(2, '0')} — **${c.verdict}**`);
      lines.push(`  CEO: ${c.ceoSaid}`);
      lines.push(`  AI: ${c.aiJudged}`);
      lines.push(`  근거 존재: ${c.hasEvidence ? '있음' : '없음'}`);
    }
    for (const u of result.unsupportedInferences) lines.push(`- ${u}`);
  }
  lines.push('');

  lines.push('## 2-E Judgment Change Turn (전체)');
  lines.push('');
  for (const ch of result.judgmentChanges) {
    lines.push(
      `Turn ${String(ch.turn).padStart(2, '0')} ${ch.dimension} [${ch.changeType ?? '?'}]: "${ch.before}" → "${ch.after}" (${ch.reason})`,
    );
  }
  lines.push('');

  lines.push('## 2-F 최종 Business Review (Turn 30)');
  lines.push('');
  if (result.finalReview && result.finalJudgmentSnapshot) {
    const r = result.finalReview;
    const j = result.finalJudgmentSnapshot;
    lines.push('**한 줄 사업 이해:**');
    lines.push(r.oneLiner);
    lines.push('');
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
      const d = j.dimensions[id];
      lines.push(`${CEO_JUDGMENT_DIMENSION_LABELS[id]}: [${d.status}] ${d.summary}`);
    }
    lines.push('');
    lines.push('**AI 판단:**');
    lines.push(r.aiJudgmentHeadline);
    lines.push(r.aiJudgmentBody);
    lines.push('');
    lines.push(`**GO/조건부/NO-GO:** ${r.verdictEmoji} ${r.verdictLabel}`);
    lines.push(r.verdictExplanation);
    lines.push('');
    lines.push('**다음 행동:**');
    lines.push(r.nextAction);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('# PART 3 — CPO-R1~R12 (원문 근거 포함)');
  lines.push('');
  lines.push(formatRWithEvidence(result, result.cpoSelfChecks));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('# END — CPO 2차 검토 입력 대기');
  lines.push('CEO TEST = HOLD | Production Gate = HOLD');

  return lines.join('\n');
}
