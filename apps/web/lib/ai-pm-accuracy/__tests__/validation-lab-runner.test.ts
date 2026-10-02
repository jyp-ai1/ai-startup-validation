import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runFullValidationLab, runValidationLabSession } from '../validation-lab-runner';
import { VALIDATION_LAB_PERTURBATIONS } from '../input-perturbation-types';

const evidenceRoot = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1',
);

afterAll(() => {
  if (process.env.VALIDATION_LAB_EVIDENCE !== '1') return;
  const gitSha = process.env.ACCURACY_GIT_SHA ?? null;
  const pack = runFullValidationLab({ gitSha });
  fs.mkdirSync(path.join(evidenceRoot, 'EVAL'), { recursive: true });
  fs.writeFileSync(
    path.join(evidenceRoot, 'EVAL/validation-lab-evidence.json'),
    `${JSON.stringify(pack, null, 2)}\n`,
  );
  const sample = pack.rows[0];
  fs.writeFileSync(
    path.join(evidenceRoot, 'VALIDATION-LAB-SAMPLE-ROW.md'),
    `# Validation Lab — sample row\n\n\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\`\n`,
  );
});

describe('Validation Lab (Sprint 2A)', () => {
  it('runs dynamic-Q session with full capture fields', () => {
    const rows = runValidationLabSession({ businessId: 'biz-01', perturbation: 'uncertainty' });
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0]!;
    expect(r.userInput).toBeTruthy();
    expect(r.aiVisibleResponse).toBeTruthy();
    expect(r.askedGapId).toBeTruthy();
    expect(r.cpoVerdict).toBe('PENDING_CPO_2PASS');
    expect(r.actualNextQuestionTargetGap).toBeTruthy();
  });

  it('defines 10 lab perturbations', () => {
    expect(VALIDATION_LAB_PERTURBATIONS).toHaveLength(10);
  });
});
