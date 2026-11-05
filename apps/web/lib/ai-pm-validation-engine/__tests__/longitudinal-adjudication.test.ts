import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildLongitudinalAdjudicationSubmission } from '../longitudinal-adjudication';

describe('Sprint 2 — longitudinal adjudication', () => {
  it('produces P0/P1 rows with defect class separation', () => {
    const sub = buildLongitudinalAdjudicationSubmission();
    expect(sub.rowCount).toBeGreaterThan(40);
    expect(sub.summary.byClass.AI_PM_DEFECT ?? 0).toBeGreaterThan(0);
    expect(sub.summary.byClass.GROUND_TRUTH_DEFECT ?? 0).toBeGreaterThan(0);
    const p0t5 = sub.rows.filter((r) => r.behavior === 'longitudinal_f11' && r.turn === 5);
    expect(p0t5.length).toBe(10);
    const p0Pass = p0t5.filter((r) => r.cpoCalibratedVerdict === 'PASS').length;
    expect(p0Pass).toBeGreaterThanOrEqual(8);
  });

  it('writes evidence when LONGITUDINAL_ADJUDICATION_EVIDENCE=1', () => {
    if (process.env.LONGITUDINAL_ADJUDICATION_EVIDENCE !== '1') return;
    const sub = buildLongitudinalAdjudicationSubmission();
    const outDir = path.join(
      process.cwd(),
      '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/EVAL',
    );
    mkdirSync(outDir, { recursive: true });
    const jsonPath = path.join(outDir, 'longitudinal-adjudication-submission.json');
    writeFileSync(jsonPath, `${JSON.stringify(sub, null, 2)}\n`);
    const mdPath = path.join(
      process.cwd(),
      '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/PHASE-1-ADJUDICATION-SUMMARY.md',
    );
    const md = `# Phase 1 Adjudication Summary (auto)

Generated: ${sub.generatedAt}

## Counts

| calibrationClass | count |
|------------------|------:|
${Object.entries(sub.summary.byClass)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n')}

## P0 Turn 5 FAIL
${sub.rows.filter((r) => r.behavior === 'longitudinal_f11' && r.turn === 5 && r.cpoCalibratedVerdict === 'FAIL').length}

## P1 Turn 3 revenue false-FACT FAIL
${sub.rows.filter((r) => r.behavior === 'longitudinal_f04_pricing' && r.turn === 3 && r.cpoCalibratedVerdict === 'FAIL').length}

## Confirmed AI PM defects (auto — CPO may override)
${sub.confirmedAiPmDefects.length} rows — see \`longitudinal-adjudication-submission.json\`.

**No structural fix authorized** until CPO confirms AI_PM_DEFECT subset.
`;
    writeFileSync(mdPath, md);
    expect(existsSync(jsonPath)).toBe(true);
  });
});
