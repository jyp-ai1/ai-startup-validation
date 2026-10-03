/**
 * Sprint 2 — auto-adjudication for longitudinal calibration checkpoints.
 * Separates AI PM / Evaluator / GT / Harness — no product code changes.
 */

import type { CalibrationTurnReplay } from './calibration-turn-replay';
import type { LongitudinalCheckpoint, LongitudinalScenarioResult } from './longitudinal-calibration-replay';
import { buildLongitudinalCalibrationPack } from './longitudinal-calibration-replay';

export type Sprint2CalibrationClass =
  | 'AI_PM_DEFECT'
  | 'EVALUATOR_DEFECT'
  | 'GROUND_TRUTH_DEFECT'
  | 'HARNESS_DEFECT';

export type Sprint2Verdict = 'PASS' | 'PARTIAL' | 'FAIL';

export type LongitudinalAdjudicationRow = {
  id: string;
  businessId: string;
  archetype: string;
  behavior: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  turn: number;
  cpoCalibratedVerdict: Sprint2Verdict;
  calibrationClass: Sprint2CalibrationClass;
  cpoRationale: string;
  confirmedForFix: boolean;
  preservationNotes: string[];
  metrics: {
    customerPersona: string | null;
    pricingHint: string | null;
    revenueEvidenceClass: string | null;
    contradictionCount: number;
    gtCustomerExpectation: string | null;
    nextTargetGap: string | null;
  };
};

function isConflictLike(state: string | null | undefined): boolean {
  return state === 'CONFLICT' || state === 'CONTRADICTED';
}

function revenueFact(replay: CalibrationTurnReplay) {
  return replay.actualFacts.find((f) => f.key === 'revenue');
}

function adjudicateP0Turn4(replay: CalibrationTurnReplay): LongitudinalAdjudicationRow | null {
  const gt = replay.expectedState.customerPersona ?? replay.expectedGaps.customerPersona ?? null;
  const ai = replay.actualGaps.customerPersona ?? replay.actualState.customerPersona ?? null;
  const notes: string[] = [];

  if (gt === 'CONFLICT' && !/50대|IT 담당|초기 가설/.test(replay.userInput)) {
    return rowShell(replay, 4, 'P0', {
      verdict: 'PARTIAL',
      calibrationClass: 'GROUND_TRUTH_DEFECT',
      rationale:
        'Turn 4 is correction/refinement, not persona reversal — GT transition should not require CONFLICT yet.',
      confirmedForFix: false,
      notes: ['GT↔harness: correction turn vs CONFLICT expectation'],
    });
  }

  if (ai === 'CLOSED' && gt === 'OPEN') {
    notes.push('AI closed customerPersona while GT still OPEN — monitor at turn 5');
  }

  return rowShell(replay, 4, 'P0', {
    verdict: 'PASS',
    calibrationClass: 'EVALUATOR_DEFECT',
    rationale: 'Pre-contradiction turn; no F11 preservation failure at turn 4 alone.',
    confirmedForFix: false,
    notes,
  });
}

function adjudicateP0Turn5(replay: CalibrationTurnReplay): LongitudinalAdjudicationRow {
  const ai = replay.actualGaps.customerPersona ?? replay.actualState.customerPersona ?? null;
  const gt = replay.expectedState.customerPersona ?? replay.expectedGaps.customerPersona ?? null;
  const notes: string[] = [];
  const contra = Array.isArray(replay.contradictions) ? replay.contradictions.length : 0;
  const reflectsInQuestion =
    /두 가지 답|어느 쪽이 맞|A\)|B\)/.test(replay.actualNextQuestion ?? '') ||
    replay.actualNextTargetGap === 'customerPersona';

  if (isConflictLike(ai)) {
    if (contra > 0 || reflectsInQuestion) {
      return rowShell(replay, 5, 'P0', {
        verdict: 'PASS',
        calibrationClass: 'EVALUATOR_DEFECT',
        rationale:
          'Turn 5+ contradiction preserved (CONTRADICTED/CONFLICT) and reflected in gap or next question.',
        confirmedForFix: false,
        notes: [`customerPersona=${ai}`, `contradictions=${contra}`],
      });
    }
    return rowShell(replay, 5, 'P0', {
      verdict: 'PARTIAL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale: 'Gap shows conflict-like state but contradiction artifact / next question weak.',
      confirmedForFix: true,
      notes,
    });
  }

  if (ai === 'CLOSED') {
    return rowShell(replay, 5, 'P0', {
      verdict: 'FAIL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale: 'Persona reversal utterance did not produce CONTRADICTED/CONFLICT — silent overwrite risk.',
      confirmedForFix: true,
      notes: [`expected~${gt}`, `actual=${ai}`],
    });
  }

  if (gt === 'CONFLICT' && !isConflictLike(ai)) {
    return rowShell(replay, 5, 'P0', {
      verdict: 'PARTIAL',
      calibrationClass: 'GROUND_TRUTH_DEFECT',
      rationale: 'GT expects CONFLICT label; AI uses different gap vocabulary — align GT before blaming AI PM.',
      confirmedForFix: false,
      notes,
    });
  }

  return rowShell(replay, 5, 'P0', {
    verdict: 'PARTIAL',
    calibrationClass: 'AI_PM_DEFECT',
    rationale: `Unexpected customerPersona state after reversal: ${ai ?? 'null'}.`,
    confirmedForFix: true,
    notes,
  });
}

function adjudicateP0Preservation(
  prev: LongitudinalCheckpoint,
  replay: CalibrationTurnReplay,
  turn: number,
): LongitudinalAdjudicationRow {
  const prevCp = prev.customerPersona;
  const ai = replay.actualGaps.customerPersona ?? replay.actualState.customerPersona ?? null;
  const gt = replay.expectedState.customerPersona ?? replay.expectedGaps.customerPersona ?? null;

  if (isConflictLike(prevCp) && gt === 'CLOSED') {
    if (ai === 'CLOSED') {
      return rowShell(replay, turn, 'P0', {
        verdict: 'PASS',
        calibrationClass: 'GROUND_TRUTH_DEFECT',
        rationale:
          'Explicit resolution — user restated the new definition after the A/B question; GT now transitions CONFLICT → CLOSED (CPO Phase 2-A reclassification).',
        confirmedForFix: false,
        notes: [`turn${prev.turn}=${prevCp}`, `turn${turn}=${ai}`, `gt=${gt}`],
      });
    }
    if (isConflictLike(ai)) {
      return rowShell(replay, turn, 'P0', {
        verdict: 'FAIL',
        calibrationClass: 'AI_PM_DEFECT',
        rationale: 'User explicitly resolved the conflict but the AI PM kept it CONTRADICTED.',
        confirmedForFix: true,
        notes: [`turn${prev.turn}=${prevCp}`, `turn${turn}=${ai}`, `gt=${gt}`],
      });
    }
  }

  if (isConflictLike(prevCp) && ai === 'CLOSED') {
    return rowShell(replay, turn, 'P0', {
      verdict: 'FAIL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale: `Contradiction state lost between turn ${prev.turn} and ${turn} without resolution (CLOSED).`,
      confirmedForFix: true,
      notes: [`turn${prev.turn}=${prevCp}`, `turn${turn}=${ai}`],
    });
  }

  if (isConflictLike(prevCp) && isConflictLike(ai)) {
    return rowShell(replay, turn, 'P0', {
      verdict: 'PASS',
      calibrationClass: 'EVALUATOR_DEFECT',
      rationale: 'Contradiction state preserved across subsequent turns.',
      confirmedForFix: false,
      notes: [`turn${prev.turn}=${prevCp}`, `turn${turn}=${ai}`],
    });
  }

  return rowShell(replay, turn, 'P0', {
    verdict: 'PARTIAL',
    calibrationClass: 'EVALUATOR_DEFECT',
    rationale: 'Ambiguous preservation — requires CPO review of resolution path.',
    confirmedForFix: false,
    notes: [`turn${prev.turn}=${prevCp}`, `turn${turn}=${ai}`],
  });
}

function adjudicateP1Turn3(replay: CalibrationTurnReplay): LongitudinalAdjudicationRow {
  const rev = revenueFact(replay);
  const cls = rev?.evidenceClass ?? null;
  if (cls === 'FACT') {
    return rowShell(replay, 3, 'P1', {
      verdict: 'FAIL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale: 'Hedged WTP utterance classified as revenue FACT.',
      confirmedForFix: true,
      notes: [`evidenceClass=${cls}`],
    });
  }
  if (cls === 'ASSUMPTION' || cls === 'INFERENCE') {
    return rowShell(replay, 3, 'P1', {
      verdict: 'PASS',
      calibrationClass: 'EVALUATOR_DEFECT',
      rationale: 'Assumption hedge respected in evidence class.',
      confirmedForFix: false,
      notes: [`evidenceClass=${cls}`],
    });
  }
  if (!rev && /10만원|것 같|검증/.test(replay.userInput)) {
    return rowShell(replay, 3, 'P1', {
      verdict: 'PARTIAL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale:
        'Pricing hedge submitted on non-pricing ask surface — revenue fact not extracted (slot/journey, not evaluator-only).',
      confirmedForFix: true,
      notes: [`askedGap=${replay.askedGapId}`],
    });
  }
  return rowShell(replay, 3, 'P1', {
    verdict: 'PARTIAL',
    calibrationClass: 'HARNESS_DEFECT',
    rationale: 'Turn 3 scenario did not produce revenue fact — verify harness ask-gap alignment.',
    confirmedForFix: false,
    notes: [],
  });
}

function adjudicateP1Turn5(replay: CalibrationTurnReplay): LongitudinalAdjudicationRow {
  const rev = revenueFact(replay);
  const cls = rev?.evidenceClass ?? null;
  if (cls === 'FACT') {
    return rowShell(replay, 5, 'P1', {
      verdict: 'PASS',
      calibrationClass: 'EVALUATOR_DEFECT',
      rationale: 'Validation cues produced revenue FACT.',
      confirmedForFix: false,
      notes: [],
    });
  }
  return rowShell(replay, 5, 'P1', {
    verdict: 'FAIL',
    calibrationClass: 'AI_PM_DEFECT',
    rationale: `Validation utterance did not yield revenue FACT (got ${cls ?? 'none'}).`,
    confirmedForFix: true,
    notes: [],
  });
}

function adjudicateP1Turn6(
  prev: LongitudinalCheckpoint,
  replay: CalibrationTurnReplay,
): LongitudinalAdjudicationRow {
  const prevFact = prev.revenueEvidenceClass;
  const rev = revenueFact(replay);
  const cls = rev?.evidenceClass ?? null;
  const pricing = replay.actualGaps.pricingHint ?? replay.actualState.pricingHint ?? null;

  if (prevFact === 'FACT' && cls === 'FACT') {
    return rowShell(replay, 6, 'P1', {
      verdict: 'PASS',
      calibrationClass: 'EVALUATOR_DEFECT',
      rationale: 'FACT revenue preserved after follow-up unvalidated claim.',
      confirmedForFix: false,
      notes: [`pricingHint=${pricing}`],
    });
  }
  if (prevFact === 'FACT' && cls !== 'FACT') {
    return rowShell(replay, 6, 'P1', {
      verdict: 'FAIL',
      calibrationClass: 'AI_PM_DEFECT',
      rationale: 'Validated revenue FACT downgraded or lost on weak follow-up turn.',
      confirmedForFix: true,
      notes: [`was FACT → ${cls ?? 'none'}`],
    });
  }
  return rowShell(replay, 6, 'P1', {
    verdict: 'PARTIAL',
    calibrationClass: 'EVALUATOR_DEFECT',
    rationale: 'Insufficient prior FACT at turn 5 to judge longitudinal pricing drift.',
    confirmedForFix: false,
    notes: [],
  });
}

function rowShell(
  replay: CalibrationTurnReplay,
  turn: number,
  priority: 'P0' | 'P1',
  body: {
    verdict: Sprint2Verdict;
    calibrationClass: Sprint2CalibrationClass;
    rationale: string;
    confirmedForFix: boolean;
    notes: string[];
  },
): LongitudinalAdjudicationRow {
  return {
    id: `${replay.businessId}-${replay.behavior}-t${turn}`,
    businessId: replay.businessId,
    archetype: '',
    behavior: replay.behavior,
    priority,
    turn,
    cpoCalibratedVerdict: body.verdict,
    calibrationClass: body.calibrationClass,
    cpoRationale: body.rationale,
    confirmedForFix: body.confirmedForFix,
    preservationNotes: body.notes,
    metrics: {
      customerPersona: replay.actualGaps.customerPersona ?? replay.actualState.customerPersona ?? null,
      pricingHint: replay.actualGaps.pricingHint ?? replay.actualState.pricingHint ?? null,
      revenueEvidenceClass: revenueFact(replay)?.evidenceClass ?? null,
      contradictionCount: Array.isArray(replay.contradictions) ? replay.contradictions.length : 0,
      gtCustomerExpectation:
        replay.expectedState.customerPersona ?? replay.expectedGaps.customerPersona ?? null,
      nextTargetGap: replay.actualNextTargetGap,
    },
  };
}

export function adjudicateLongitudinalScenario(scenario: LongitudinalScenarioResult): LongitudinalAdjudicationRow[] {
  const rows: LongitudinalAdjudicationRow[] = [];
  const byTurn = new Map(scenario.checkpoints.map((c) => [c.turn, c]));

  if (scenario.behavior === 'longitudinal_f11') {
    const t4 = byTurn.get(4);
    if (t4) {
      const r = adjudicateP0Turn4(t4.replay);
      if (r) rows.push({ ...r, archetype: scenario.archetype });
    }
    const t5 = byTurn.get(5);
    if (t5) rows.push({ ...adjudicateP0Turn5(t5.replay), archetype: scenario.archetype });
    for (const turn of [6, 7]) {
      const cp = byTurn.get(turn);
      const prev = byTurn.get(5);
      if (cp && prev) {
        rows.push({
          ...adjudicateP0Preservation(prev, cp.replay, turn),
          archetype: scenario.archetype,
        });
      }
    }
  }

  if (scenario.behavior === 'longitudinal_f04_pricing') {
    const t3 = byTurn.get(3);
    if (t3) rows.push({ ...adjudicateP1Turn3(t3.replay), archetype: scenario.archetype });
    const t5 = byTurn.get(5);
    if (t5) rows.push({ ...adjudicateP1Turn5(t5.replay), archetype: scenario.archetype });
    const t6 = byTurn.get(6);
    if (t6 && t5) {
      rows.push({ ...adjudicateP1Turn6(t5, t6.replay), archetype: scenario.archetype });
    }
  }

  return rows;
}

export function buildLongitudinalAdjudicationSubmission() {
  const pack = buildLongitudinalCalibrationPack();
  const rows = pack.scenarios.flatMap(adjudicateLongitudinalScenario);

  const byClass = rows.reduce(
    (acc, r) => {
      acc[r.calibrationClass] = (acc[r.calibrationClass] ?? 0) + 1;
      return acc;
    },
    {} as Record<Sprint2CalibrationClass, number>,
  );

  const aiPmConfirmed = rows.filter((r) => r.confirmedForFix && r.calibrationClass === 'AI_PM_DEFECT');

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'AI_PM_ACCURACY_SPRINT_2' as const,
    phase: 'LONGITUDINAL_ADJUDICATION' as const,
    rowCount: rows.length,
    summary: {
      byClass,
      aiPmConfirmedCount: aiPmConfirmed.length,
      p0Fail: rows.filter((r) => r.priority === 'P0' && r.cpoCalibratedVerdict === 'FAIL').length,
      p1Fail: rows.filter((r) => r.priority === 'P1' && r.cpoCalibratedVerdict === 'FAIL').length,
    },
    confirmedAiPmDefects: aiPmConfirmed,
    rows,
  };
}
