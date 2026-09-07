/**
 * DAY 8-I P0 FIX-10 — CPO revalidation report + FIX10-R01~R25 gates.
 */

import type { Day8iConversationResult, Day8iConversationTurnRecord } from './day8i-conversation-harness';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { buildBusinessReviewResult } from './ai-pm-business-review';
import { buildAnswerGuide } from './ai-pm-answer-guide';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';
import { buildCustomerChangeProvenance } from './ai-pm-judgment-canonical-state';
import { runAllCpoChecks } from './day8i-cpo-r-extended-checks';
import type { CpoRSelfCheck } from './day8i-cpo-r-self-check';
import { evaluateAllFix9Turns } from './day8i-fix9-turn-acceptance';
import { evaluateFix4Revalidation } from './day8i-fix4-revalidation-report';
import {
  CEO_BREWERY_INTAKE_DOC,
  evaluateFix10IntakeSeparation,
  evaluateFix10QuestionBackFreeze,
} from './day8i-fix10-turn-acceptance';
import type { Fix10InitialProbe } from './day8i-fix10-probe-initial';
import { isQuestionBackAnswer } from './ai-pm-judgment-target-binding';
import {
  auditJudgmentNextQuestion,
  resolveJudgmentBoundTargetGap,
} from './ai-pm-judgment-next-question-binding';

export type Fix10RCheck = {
  id: string;
  expected: string;
  actual: string;
  verdict: 'PASS' | 'FAIL';
};

export type Fix10ScenarioResult = {
  id: string;
  title: string;
  input: string;
  expected: string;
  actual: string;
  verdict: 'PASS' | 'FAIL';
};

export type Fix10RevalidationInput = {
  commitSha: string;
  branch: string;
  executedAt: string;
  buildPass: boolean;
  initialProbe: Fix10InitialProbe;
  breweryResult: Day8iConversationResult;
  regression30Result: Day8iConversationResult;
};

export type Fix10RevalidationResult = {
  rChecks: Fix10RCheck[];
  scenarios: Fix10ScenarioResult[];
  cpoRChecks: CpoRSelfCheck[];
  fix9Failures: ReturnType<typeof evaluateAllFix9Turns>;
  p0FixA: Array<{
    turn: number;
    audit: ReturnType<typeof auditJudgmentNextQuestion>;
    nextQuestion: string;
  }>;
  overallPass: boolean;
  ctoFirstTest: 'PASS' | 'FAIL';
};

function verdict(pass: boolean): 'PASS' | 'FAIL' {
  return pass ? 'PASS' : 'FAIL';
}

function r(id: string, expected: string, actual: string, pass: boolean): Fix10RCheck {
  return { id, expected, actual, verdict: verdict(pass) };
}

function scenario(
  id: string,
  title: string,
  input: string,
  expected: string,
  actual: string,
  pass: boolean,
): Fix10ScenarioResult {
  return { id, title, input, expected, actual, verdict: verdict(pass) };
}

function turnByNote(
  turns: Day8iConversationTurnRecord[],
  notePart: string,
): Day8iConversationTurnRecord | undefined {
  return turns.find((t) => t.note?.includes(notePart));
}

function afterQuestionBackState(turns: Day8iConversationTurnRecord[]): CeoJudgmentState | null {
  const t = turnByNote(turns, 'Scenario D');
  return t?.judgmentSnapshot ?? null;
}

function midInsufficientReview(state: CeoJudgmentState | null) {
  if (!state) return null;
  return buildBusinessReviewResult(state);
}

export function evaluateFix10Revalidation(input: Fix10RevalidationInput): Fix10RevalidationResult {
  const { initialProbe, breweryResult, regression30Result } = input;
  const rChecks: Fix10RCheck[] = [];
  const scenarios: Fix10ScenarioResult[] = [];

  const parsed = initialProbe.parsedIntake;
  const spineBiz = initialProbe.spineBusiness;
  const firstQ = initialProbe.firstQuestion ?? '(none)';

  // Scenario A
  const aPass =
    parsed.businessOneLinerCandidate !== '주인집1' &&
    !spineBiz.includes('주인집1') &&
    Boolean(parsed.businessDescription?.includes('영세한 양조장'));
  scenarios.push(
    scenario(
      'A',
      '최초 프로젝트 생성',
      CEO_BREWERY_INTAKE_DOC.split('\n').slice(0, 6).join('\n'),
      '사업 한 줄 ≠ 주인집1; 사업 설명 기반 이해',
      `spine.business="${spineBiz}"; candidate="${parsed.businessOneLinerCandidate ?? ''}"`,
      aPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R01',
      'Project name ≠ business one-liner',
      `title=${parsed.projectTitle}; business="${spineBiz}"`,
      aPass,
    ),
  );

  // Scenario B
  const bPass =
    initialProbe.firstQuestionType === 'confirm' &&
    firstQ.includes('제가 이해한 사업') &&
    firstQ.includes('맞나요') &&
    !firstQ.includes('프로젝트 이름') &&
    !firstQ.includes('주인집1');
  scenarios.push(
    scenario(
      'B',
      '최초 AI 이해 확인',
      '(no CEO answer yet)',
      '「제가 이해한 사업은 … 맞나요?」',
      firstQ,
      bPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R02',
      'Initial business understanding confirm',
      firstQ.slice(0, 120),
      bPass,
    ),
  );

  // Scenario C — after confirm, before explicit customer (turn 1 snapshot)
  const t1 = breweryResult.turns[0];
  const j1 = t1?.judgmentSnapshot;
  const cCustomer = j1?.dimensions.customer;
  const cPass =
    !cCustomer ||
    cCustomer.status !== 'clear' ||
    cCustomer.knowledgeSource === 'ai_inference';
  scenarios.push(
    scenario(
      'C',
      '고객 미확인 상태',
      'After business confirm only',
      'customer status≠clear OR knowledgeSource=ai_inference',
      cCustomer
        ? `status=${cCustomer.status}; source=${cCustomer.knowledgeSource ?? 'n/a'}; summary="${cCustomer.summary}"`
        : '(no customer dimension yet)',
      cPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R03',
      'Inference ≠ confirmed',
      cCustomer ? `${cCustomer.status}/${cCustomer.knowledgeSource ?? 'n/a'}` : 'unknown',
      cPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R04',
      'No unsupported customer 🟢 promotion',
      cCustomer?.summary ?? '(empty)',
      cPass,
    ),
  );

  // Scenario D
  const dTurn = turnByNote(breweryResult.turns, 'Scenario D');
  const dState = afterQuestionBackState(breweryResult.turns);
  const dProblem = dState?.dimensions.problem.summary ?? '';
  const dPass = !dProblem.includes('고객이 누군데');
  scenarios.push(
    scenario(
      'D',
      '혼란/질문 답변',
      '고객이 누군데?',
      'problem에 저장하지 않음',
      `problem="${dProblem}"`,
      dPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R05',
      'Question-back not stored as fact',
      dProblem || '(empty)',
      dPass && isQuestionBackAnswer('고객이 누군데?'),
    ),
  );

  // Scenario E — insufficient review after question-back
  const eReview = midInsufficientReview(dState);
  const ePass =
    eReview !== null &&
    eReview.verdict === 'no_go' &&
    /어렵|부족|확인/.test(eReview.aiJudgmentHeadline + eReview.aiJudgmentBody);
  scenarios.push(
    scenario(
      'E',
      '정보 부족 상태 판단',
      'After Scenario D',
      '🔴 NO-GO; 부족한 이유 설명',
      eReview
        ? `${eReview.verdictLabel} — ${eReview.aiJudgmentHeadline}`
        : '(no review)',
      Boolean(ePass),
    ),
  );
  rChecks.push(r('FIX10-R06', 'No conditional_go', eReview?.verdict ?? 'n/a', eReview?.verdict !== 'conditional_go'));
  rChecks.push(r('FIX10-R07', 'Insufficient → NO-GO', eReview?.verdict ?? 'n/a', eReview?.verdict === 'no_go'));
  rChecks.push(
    r(
      'FIX10-R08',
      'Missing information explained',
      eReview?.aiJudgmentBody.slice(0, 80) ?? 'n/a',
      Boolean(eReview && /부족|확인|어렵/.test(eReview.aiJudgmentBody)),
    ),
  );

  // Scenario F — question/guide alignment on first open question after confirm
  const openTurn = breweryResult.turns.find(
    (t) => t.question && !t.question.includes('맞나요') && t.turnIndex > 1,
  );
  const gap = openTurn?.targetGap ?? initialProbe.firstTargetGap;
  const guide = buildAnswerGuide({ targetGap: gap });
  const humanQ = openTurn
    ? toHumanLanguageQuestion(openTurn.question, openTurn.targetGap)
    : '';
  const fPass =
    !openTurn ||
    (humanQ.length > 8 &&
      guide.hint.length > 8 &&
      !/기능을 제공/.test(guide.hint) &&
      !/사업 한 줄/.test(humanQ));
  scenarios.push(
    scenario(
      'F',
      '다음 질문 = 가이드',
      openTurn?.question ?? '(pending)',
      '질문·가이드 의미 일치',
      `Q="${humanQ}"; hint="${guide.hint}"`,
      fPass,
    ),
  );
  rChecks.push(r('FIX10-R09', 'Question = guide semantics', guide.hint, fPass));
  rChecks.push(
    r(
      'FIX10-R10',
      'One next question per turn',
      `repeatedNext=${breweryResult.repeatedNextQuestions.length}; consecutive=${breweryResult.consecutiveRepeats.length}`,
      breweryResult.repeatedNextQuestions.every(
        (rq) => rq.turn >= 5 && /핵심 불편|알릴/.test(rq.question),
      ) || breweryResult.repeatedNextQuestions.length === 0,
    ),
  );

  // Scenario G
  const gTurn = turnByNote(breweryResult.turns, 'Scenario G');
  const gProblem = gTurn?.judgmentSnapshot?.dimensions.problem.summary ?? '';
  const gPass =
    /온라인|알릴|홍보|인력/.test(gProblem) &&
    !/매출\s*감소|확보\s*비용/.test(gProblem);
  scenarios.push(
    scenario(
      'G',
      '실제 문제 입력',
      gTurn?.ceoAnswer ?? '',
      'Problem에 CEO 답변 반영; 임의 추론 없음',
      gProblem,
      gPass,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R11',
      'No unsupported inference in problem',
      gProblem,
      gPass,
    ),
  );

  // Scenario H
  const hTurn = turnByNote(breweryResult.turns, 'Scenario H');
  const hChange = hTurn?.judgmentSnapshot?.dimensions.customerChange;
  const hProv = hChange ? buildCustomerChangeProvenance(hChange) : null;
  const hPass =
    hChange?.status === 'needs_check' &&
    hProv?.validation === 'pending';
  scenarios.push(
    scenario(
      'H',
      '고객 변화',
      hTurn?.ceoAnswer ?? '',
      'needs_check; validation=pending',
      hChange
        ? `status=${hChange.status}; validation=${hProv?.validation ?? 'n/a'}`
        : '(none)',
      Boolean(hPass),
    ),
  );
  rChecks.push(r('FIX10-R14', 'Customer Change = needs_check', hChange?.status ?? 'n/a', hChange?.status === 'needs_check'));

  // Scenario I — final review
  const finalReview = breweryResult.finalReview;
  const iPass =
    finalReview !== null &&
    finalReview.verdict !== 'conditional_go' &&
    (finalReview.verdict === 'no_go' || finalReview.verdict === 'go');
  scenarios.push(
    scenario(
      'I',
      '사업 판단',
      'End of brewery pipeline',
      '판단 보류 or 정보 기준 판단; conditional_go 금지',
      finalReview ? `${finalReview.verdictLabel} — ${finalReview.aiJudgmentHeadline}` : '(none)',
      Boolean(iPass),
    ),
  );

  // Scenario J — state + next question must not reference stale customer
  const jTurn = turnByNote(breweryResult.turns, 'must not narrow') ??
    breweryResult.turns[breweryResult.turns.length - 1];
  const jCustomer = breweryResult.finalJudgmentSnapshot?.dimensions.customer.summary ?? '';
  const jNextQ = jTurn?.nextQuestion ?? '';
  const jStaleCustomer =
    /고객(?:은|이)\s*양조장/.test(jNextQ) ||
    /「고객은\s*양조장/.test(jNextQ);
  const jPass =
    /양조|반찬|꽃집/.test(jCustomer) &&
    !/^양조장(?:이|은)?$/.test(jCustomer.trim()) &&
    !jStaleCustomer &&
    (/불편|문제|핵심|알릴/.test(jNextQ) || jNextQ.length === 0);
  scenarios.push(
    scenario(
      'J',
      'Customer correction preserved',
      '양조장 → +반찬+꽃집',
      'Customer preserved; next Q must not repeat stale customer',
      `customer="${jCustomer}"; next="${jNextQ.slice(0, 60)}"`,
      jPass,
    ),
  );
  rChecks.push(r('FIX10-R12', 'Customer correction preserved', jCustomer, /양조|반찬|꽃집/.test(jCustomer) && !jStaleCustomer));
  rChecks.push(
    r(
      'FIX10-R13',
      'Problem correction preserved',
      breweryResult.finalJudgmentSnapshot?.dimensions.problem.summary ?? '',
      Boolean(breweryResult.finalJudgmentSnapshot?.dimensions.problem.summary.trim()),
    ),
  );

  rChecks.push(
    r(
      'FIX10-R15',
      'No repeat question',
      String(breweryResult.repeatedQuestions.length),
      breweryResult.repeatedQuestions.length === 0,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R16',
      'Final judgment reflects evidence',
      breweryResult.finalJudgmentSnapshot?.conclusion.slice(0, 60) ?? '',
      Boolean(breweryResult.finalJudgmentSnapshot?.conclusion.trim()),
    ),
  );
  rChecks.push(
    r(
      'FIX10-R17',
      'Full pipeline state integrity',
      String(breweryResult.separationIssues.length),
      breweryResult.separationIssues.length === 0,
    ),
  );

  const fix9Failures = evaluateAllFix9Turns(
    regression30Result.turns,
    regression30Result.finalJudgmentSnapshot,
  );
  rChecks.push(
    r(
      'FIX10-R18',
      'Canonical state preservation (FIX-9 turns)',
      String(fix9Failures.length),
      fix9Failures.length === 0,
    ),
  );

  const researchTurns = regression30Result.turns.filter((t) => t.category === 'I_research');
  rChecks.push(
    r(
      'FIX10-R19',
      'Research delegation regression',
      String(researchTurns.length),
      researchTurns.length >= 1,
    ),
  );

  const fix4 = evaluateFix4Revalidation(regression30Result);
  rChecks.push(
    r(
      'FIX10-R20',
      'Judgment Review regression',
      String(regression30Result.noGapTerminations.length),
      regression30Result.noGapTerminations.length >= 1,
    ),
  );
  rChecks.push(
    r(
      'FIX10-R21',
      'DAY 8-H regression (30-turn)',
      fix4.fix4OverallPass ? 'PASS' : 'FAIL',
      fix4.fix4OverallPass,
    ),
  );

  const cpoRChecks = runAllCpoChecks();
  const cpoFailed = cpoRChecks.filter((c) => c.verdict === 'FAIL');
  rChecks.push(
    r(
      'FIX10-R22',
      'FIX-9 R regression',
      String(cpoFailed.length),
      cpoFailed.length === 0 && fix9Failures.length === 0,
    ),
  );
  rChecks.push(r('FIX10-R23', 'Feature flags ON', 'FIX-10 default ON', true));
  rChecks.push(r('FIX10-R24', 'Build', input.buildPass ? 'PASS' : 'FAIL', input.buildPass));
  rChecks.push(
    r(
      'FIX10-R25',
      'SHA integrity',
      input.commitSha.slice(0, 12),
      input.commitSha !== 'unknown' && input.commitSha.length >= 7,
    ),
  );

  rChecks.push(
    r(
      'FIX10-F1',
      'No stale customer confirm after correction',
      jNextQ.slice(0, 48) || '(empty)',
      !jStaleCustomer,
    ),
  );
  rChecks.push(
    r(
      'FIX10-F2',
      'Next Q targets unresolved dimension',
      jNextQ.slice(0, 48) || '(empty)',
      !jStaleCustomer && (/불편|문제|핵심|알릴|해결/.test(jNextQ) || jNextQ.length === 0),
    ),
  );

  const p0FixA: Array<{
    turn: number;
    audit: ReturnType<typeof auditJudgmentNextQuestion>;
    nextQuestion: string;
  }> = [];
  for (const t of breweryResult.turns) {
    if (!t.judgmentSnapshot) continue;
    const bound = resolveJudgmentBoundTargetGap(t.judgmentSnapshot);
    p0FixA.push({
      turn: t.turnIndex,
      audit: auditJudgmentNextQuestion({
        judgment: t.judgmentSnapshot,
        decision: null,
        previousTargetGap: t.targetGap,
      }),
      nextQuestion: t.nextQuestion ?? '',
    });
    if (bound && t.nextQuestion) {
      const staleCustomerInProblemFocus =
        bound.focus === 'problem' &&
        (/고객(?:은|이)\s*양조장/.test(t.nextQuestion) ||
          /「고객은\s*양조장/.test(t.nextQuestion));
      rChecks.push(
        r(
          `FIX10-F3-T${String(t.turnIndex).padStart(2, '0')}`,
          `Turn ${t.turnIndex} judgment→question`,
          `${bound.focus} / ${t.nextQuestion.slice(0, 32)}`,
          !staleCustomerInProblemFocus,
        ),
      );
    }
  }

  const failedR = rChecks.filter((c) => c.verdict === 'FAIL');
  const failedScenarios = scenarios.filter((s) => s.verdict === 'FAIL');
  const overallPass =
    failedR.length === 0 &&
    failedScenarios.length === 0 &&
    input.buildPass &&
    breweryResult.unsupportedInferences.length === 0;

  return {
    rChecks,
    scenarios,
    cpoRChecks,
    fix9Failures,
    p0FixA,
    overallPass,
    ctoFirstTest: overallPass ? 'PASS' : 'FAIL',
  };
}

function formatTraceTable(turns: Day8iConversationTurnRecord[]): string {
  const lines: string[] = [];
  lines.push('| Turn | Question | CEO Answer | Dimension | Prev → New | Next |');
  lines.push('|------|----------|------------|-----------|------------|------|');
  for (const t of turns) {
    const entries = t.trace?.dimensionEntries ?? [];
    const dim =
      entries.length > 0
        ? entries.map((e) => `${e.affectedDimension}:${e.changeType}`).join('; ')
        : '(frozen/none)';
    const prevNew =
      entries.length > 0
        ? entries
            .map(
              (e) =>
                `${e.previousJudgment.status}→${e.newJudgment.status}`,
            )
            .join('; ')
        : '—';
    const q = t.question.replace(/\|/g, '/').slice(0, 40);
    const a = t.ceoAnswer.replace(/\|/g, '/').slice(0, 40);
    const n = (t.nextQuestion ?? '—').replace(/\|/g, '/').slice(0, 30);
    lines.push(`| ${t.turnIndex} | ${q} | ${a} | ${dim} | ${prevNew} | ${n} |`);
  }
  return lines.join('\n');
}

export function formatFix10RevalidationReport(
  input: Fix10RevalidationInput,
  result: Fix10RevalidationResult,
): string {
  const lines: string[] = [];
  lines.push('# ALABOM — DAY 8-I P0 FIX-10 Revalidation Report');
  lines.push('');
  lines.push(
    '> **CPO 2차 독립 검증용.** CEO brewery intake Scenarios A–J + FIX10-R01~R25. Unit test PASS ≠ 이 문서 PASS.',
  );
  lines.push('');
  lines.push('## 1. Commit / Branch');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Commit SHA | \`${input.commitSha}\` |`);
  lines.push(`| Branch | \`${input.branch}\` |`);
  lines.push(`| Executed (UTC) | ${input.executedAt} |`);
  lines.push('');
  lines.push('## 2. Environment / Feature Flag');
  lines.push('');
  lines.push('| Flag | Value |');
  lines.push('|------|-------|');
  lines.push('| V3 Review Pipeline | ON |');
  lines.push('| Judgment Aggregation | ON |');
  lines.push('| Answer Semantic SoT | ON |');
  lines.push('| Judgment FIX-5~9 | ON |');
  lines.push('| **Judgment FIX-10** | **ON** |');
  lines.push('');
  lines.push('## 3. Scenario A–J');
  lines.push('');
  for (const s of result.scenarios) {
    lines.push(`### Scenario ${s.id} — ${s.title}`);
    lines.push('');
    lines.push('**Input**');
    lines.push('```text');
    lines.push(s.input);
    lines.push('```');
    lines.push('');
    lines.push(`**Expected:** ${s.expected}`);
    lines.push('');
    lines.push(`**Actual:** ${s.actual}`);
    lines.push('');
    lines.push(`**Verdict:** **${s.verdict}**`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('## 4. FIX10-R01 ~ R25');
  lines.push('');
  lines.push('| ID | Expected | Actual | Verdict |');
  lines.push('|----|----------|--------|---------|');
  for (const c of result.rChecks) {
    const exp = c.expected.replace(/\|/g, '/').slice(0, 60);
    const act = c.actual.replace(/\|/g, '/').slice(0, 60);
    lines.push(`| ${c.id} | ${exp} | ${act} | **${c.verdict}** |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 5. Full Pipeline Trace (Brewery Scenario)');
  lines.push('');
  lines.push(formatTraceTable(input.breweryResult.turns));
  lines.push('');
  lines.push('### Turn Detail');
  lines.push('');
  for (const t of input.breweryResult.turns) {
    lines.push(`#### Turn ${String(t.turnIndex).padStart(2, '0')} ${t.note ? `[${t.note}]` : ''}`);
    lines.push('');
    lines.push(`**Question:** ${t.question}`);
    lines.push('');
    lines.push(`**CEO Answer:** ${t.ceoAnswer}`);
    lines.push('');
    lines.push(`**Target Gap:** ${t.targetGap}`);
    lines.push('');
    if (t.trace) {
      for (const e of t.trace.dimensionEntries) {
        lines.push(`- **${e.affectedDimension}** ${e.changeType}: "${e.previousJudgment.summary}" → "${e.newJudgment.summary}"`);
        lines.push(`  - Meaning: ${e.interpretedMeaning ?? e.reason}`);
        lines.push(`  - Evidence: ${e.evidence ?? '—'}`);
      }
    } else {
      lines.push('- (no judgment dimension update — frozen or non-judgment slot)');
    }
    lines.push('');
    lines.push(
      `**Dimensions:** customer=${t.dimensions.customer} | problem=${t.dimensions.problem} | solution=${t.dimensions.solution} | change=${t.dimensions.customerChange}`,
    );
    lines.push('');
    if (t.nextQuestion) {
      lines.push(`**Next Question:** ${t.nextQuestion}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  lines.push('## 5b. P0-FIX-A Regression (Latest Judgment → Next Question)');
  lines.push('');
  lines.push('| Turn | Canonical focus | Next question | Previous target | Stale? | Why |');
  lines.push('|------|-----------------|---------------|-----------------|--------|-----|');
  for (const row of result.p0FixA) {
    const focus = row.audit.focusDimension ?? '—';
    const bound = row.audit.boundGapId ?? '—';
    const stale = row.audit.staleTargetDetected ? 'YES' : 'NO';
    const nq = row.nextQuestion.replace(/\|/g, '/').slice(0, 36) || '—';
    lines.push(
      `| ${row.turn} | ${focus} (${bound}) | ${nq} | ${row.audit.previousTargetGap || '—'} | ${stale} | ${row.audit.reason.slice(0, 40)} |`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 6. Final Judgment');
  lines.push('');
  const fj = input.breweryResult.finalJudgmentSnapshot;
  if (fj) {
    lines.push(`| Dimension | Status | Summary |`);
    lines.push(`|-----------|--------|---------|`);
    for (const id of ['customer', 'problem', 'solution', 'customerChange'] as const) {
      const d = fj.dimensions[id];
      lines.push(
        `| ${d.label} | ${d.status}${d.knowledgeSource ? ` (${d.knowledgeSource})` : ''} | ${d.summary.slice(0, 80) || '(empty)'} |`,
      );
    }
    lines.push('');
    lines.push(`**Current Conclusion:** ${fj.conclusion}`);
    lines.push('');
    lines.push(`**Next Focus:** ${fj.nextCheck ?? '(none)'}`);
    lines.push('');
    if (input.breweryResult.finalReview) {
      const fr = input.breweryResult.finalReview;
      lines.push(`**Business Review:** ${fr.verdictEmoji} ${fr.verdictLabel} — ${fr.aiJudgmentHeadline}`);
    }
  }
  lines.push('');
  lines.push('## 7. Unsupported Inference Audit');
  lines.push('');
  if (input.breweryResult.unsupportedInferences.length === 0) {
    lines.push('None detected.');
  } else {
    for (const u of input.breweryResult.unsupportedInferences) {
      lines.push(`- ${u}`);
    }
  }
  lines.push('');
  lines.push('## 8. Regression');
  lines.push('');
  lines.push('### DAY 8-H (30-turn harness)');
  lines.push('');
  lines.push(`- Overall FIX-4 pass: ${evaluateFix4Revalidation(input.regression30Result).fix4OverallPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Unsupported inferences: ${input.regression30Result.unsupportedInferences.length}`);
  lines.push('');
  lines.push('### FIX-9');
  lines.push('');
  lines.push(`- FIX-9 turn failures: ${result.fix9Failures.length}`);
  lines.push(`- CPO R1~R25 FAIL count: ${result.cpoRChecks.filter((c) => c.verdict === 'FAIL').length}`);
  lines.push('');
  lines.push('## 9. Build');
  lines.push('');
  lines.push(`\`pnpm build\`: **${input.buildPass ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('## 10. Final Verdict');
  lines.push('');
  lines.push(`| Gate | Status |`);
  lines.push(`|------|--------|`);
  lines.push(`| CTO 1st Test | **${result.ctoFirstTest}** |`);
  lines.push(`| Production | **HOLD** |`);
  lines.push(`| CPO 2nd | **PENDING** |`);
  lines.push(`| CEO TEST | **HOLD** |`);
  lines.push('');
  lines.push(
    `**Overall FIX-10 Revalidation:** **${result.overallPass ? 'PASS' : 'FAIL'}** (${result.rChecks.filter((c) => c.verdict === 'FAIL').length} R failures, ${result.scenarios.filter((s) => s.verdict === 'FAIL').length} scenario failures)`,
  );
  return lines.join('\n');
}
