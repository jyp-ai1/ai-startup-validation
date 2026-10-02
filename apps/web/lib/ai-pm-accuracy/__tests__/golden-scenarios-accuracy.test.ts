import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runAllGoldenScenarios, runGoldenScenario } from '../accuracy-turn-harness';
import { GOLDEN_SCENARIOS } from '../golden-scenarios';
import { BUSINESS_JUDGMENT_TAXONOMY } from '../business-judgment-taxonomy';

afterAll(() => {
  if (process.env.ACCURACY_EVIDENCE !== '1') return;
  const pkg = runAllGoldenScenarios();
  const outDir = path.resolve(
    process.cwd(),
    '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'golden-scenarios-turn-evidence.json'),
    `${JSON.stringify(pkg, null, 2)}\n`,
  );
});

describe('AI PM Accuracy Sprint 1 — Golden Scenarios', () => {
  it('taxonomy has 26 CPO knowledge items', () => {
    expect(BUSINESS_JUDGMENT_TAXONOMY).toHaveLength(26);
  });

  it.each(GOLDEN_SCENARIOS.map((s) => [s.id, s] as const))(
    '%s — turn-level accuracy',
    (id, scenario) => {
      const result = runGoldenScenario(scenario);
      if (!result.pass) {
        const details = result.turns
          .filter((t) => !t.pass)
          .map((t) => `turn ${t.turn}: ${t.failureTypes.join(', ')}`)
          .join('; ');
        expect.soft(result.pass, details).toBe(true);
      }
      expect(result.pass).toBe(true);
    },
  );

  it('bundle summary — majority pass (baseline gate)', () => {
    const pkg = runAllGoldenScenarios();
    expect(pkg.scenarioCount).toBe(8);
    expect(pkg.passCount).toBeGreaterThanOrEqual(6);
  });
});
