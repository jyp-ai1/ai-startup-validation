import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  buildCpo2PassEvidencePack,
  renderCpo2PassMarkdown,
} from '../cpo-2pass-evidence';
import { GOLDEN_SCENARIOS } from '../golden-scenarios';
import { REASONING_JUDGMENT_GOLDEN_STUBS } from '../reasoning-judgment-golden';

afterAll(() => {
  if (process.env.CPO_2PASS_EVIDENCE !== '1') return;
  const pack = buildCpo2PassEvidencePack();
  const outDir = path.resolve(
    process.cwd(),
    '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'cpo-2pass-evidence-pack.json'),
    `${JSON.stringify(pack, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-ACCURACY-2PASS.md'),
    `${renderCpo2PassMarkdown(pack)}\n`,
  );
});

describe('CPO 2-pass evidence pack', () => {
  it('row count equals total golden turns', () => {
    const turnCount = GOLDEN_SCENARIOS.reduce((n, s) => n + s.turns.length, 0);
    const pack = buildCpo2PassEvidencePack();
    expect(pack.rows.length).toBe(turnCount);
    for (const row of pack.rows) {
      expect(row.cpoVerdict).toBe('PENDING_CPO_2PASS');
    }
  });

  it('reasoning/judgment golden stubs A–H defined', () => {
    expect(REASONING_JUDGMENT_GOLDEN_STUBS).toHaveLength(8);
  });
});
