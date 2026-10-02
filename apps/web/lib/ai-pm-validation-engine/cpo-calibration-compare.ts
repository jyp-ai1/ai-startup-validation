import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MiniSandboxTurnRow } from './mini-sandbox-runner';

type CalCase = {
  id: string;
  behavior: string;
  placeholder?: boolean;
  cpoUnderstanding?: string;
  cpoState?: string;
  cpoQuestion?: string;
  cpoReasoning?: string;
};

function loadCalibrationCases(): CalCase[] {
  const path = join(
    process.cwd(),
    '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/cpo-calibration-set.json',
  );
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { cases: CalCase[] };
  return raw.cases;
}

function autoVerdictForBehavior(
  rows: MiniSandboxTurnRow[],
  behavior: string,
): Record<string, string> {
  const subset = rows.filter((r) => r.behavior === behavior);
  const fail = (field: keyof MiniSandboxTurnRow['evaluation']) =>
    subset.some((r) => r.evaluation[field] === 'FAIL');
  const partial = (field: keyof MiniSandboxTurnRow['evaluation']) =>
    subset.some((r) => r.evaluation[field] === 'PARTIAL');

  return {
    understanding: fail('understanding') ? 'FAIL' : partial('understanding') ? 'PARTIAL' : 'PASS',
    state: fail('state') ? 'FAIL' : partial('state') ? 'PARTIAL' : 'PASS',
    question: fail('question') ? 'FAIL' : partial('question') ? 'PARTIAL' : 'PASS',
    reasoning: fail('reasoning') ? 'FAIL' : partial('reasoning') ? 'PARTIAL' : 'PASS',
  };
}

export type CalibrationCompareRow = {
  id: string;
  behavior: string;
  auto: Record<string, string>;
  cpo: CalCase;
  aligned: boolean;
  mismatches: string[];
};

export function compareAutoVsCpoCalibration(rows: MiniSandboxTurnRow[]): {
  cases: CalibrationCompareRow[];
  alignmentRate: number;
  placeholderSkipped: number;
} {
  const out: CalibrationCompareRow[] = [];
  let aligned = 0;
  let comparable = 0;
  let placeholderSkipped = 0;
  const cases = loadCalibrationCases();

  for (const c of cases) {
    if (c.placeholder) {
      placeholderSkipped += 1;
      continue;
    }
    const auto = autoVerdictForBehavior(rows, c.behavior);
    const mismatches: string[] = [];
    if (c.cpoUnderstanding && auto.understanding !== c.cpoUnderstanding) {
      mismatches.push(`understanding: auto=${auto.understanding} cpo=${c.cpoUnderstanding}`);
    }
    if (c.cpoState && auto.state !== c.cpoState) {
      mismatches.push(`state: auto=${auto.state} cpo=${c.cpoState}`);
    }
    if (c.cpoQuestion && auto.question !== c.cpoQuestion) {
      mismatches.push(`question: auto=${auto.question} cpo=${c.cpoQuestion}`);
    }
    if (c.cpoReasoning && auto.reasoning !== c.cpoReasoning) {
      mismatches.push(`reasoning: auto=${auto.reasoning} cpo=${c.cpoReasoning}`);
    }
    const isAligned = mismatches.length === 0;
    if (isAligned) aligned += 1;
    comparable += 1;
    out.push({
      id: c.id,
      behavior: c.behavior,
      auto,
      cpo: c,
      aligned: isAligned,
      mismatches,
    });
  }

  return {
    cases: out,
    alignmentRate: comparable ? aligned / comparable : 0,
    placeholderSkipped,
  };
}
