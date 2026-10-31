import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { executeQualityCompare } from '../ai-pm-quality-compare';

const enabled = process.env.AI_PM_COMPARE_LIVE === '1';

describe.skipIf(!enabled)('live quality-2 versus quality-3', () => {
  it('records two calls or NOT RUN, and does not treat a missing key as a quality pass', async () => {
    const report = await executeQualityCompare();
    const repoRoot = process.cwd().endsWith(`${join('apps', 'web')}`) ? join(process.cwd(), '..', '..') : process.cwd();
    writeFileSync(join(repoRoot, 'docs/evidence/ALABOM/AI-PM/quality-2-3-compare.json'), JSON.stringify(report, null, 2));
    expect(report.productFollowUpInvoked).toBe(false);
    expect(report.calls).toHaveLength(2);
    if (!process.env.GPT_API_KEY?.trim()) {
      expect(report.status).toBe('NOT RUN');
      expect(report.calls.every((call) => call.raw === null)).toBe(true);
      return;
    }
    expect(report.status).toBe('RECORDED');
    expect(report.calls.every((call) => call.systemPrompt.length > 0 && call.userPrompt.length > 0)).toBe(true);
  }, 200_000);
});
