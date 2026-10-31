import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AI_PM_FIRST_PROMPT_VERSION, buildFirstReviewRequest } from '../ai-pm-review';
import {
  AI_PM_QUALITY_SIMULATION_VERSION,
  BASELINE_PROMPT_VERSION,
  BREWERY_QUALITY_BODY,
  QUALITY_CRITERIA_VERSION,
  executeQualityMatrix,
  openQualitySimulationChat,
} from '../ai-pm-quality-scenarios';

const enabled = process.env.AI_PM_QUALITY_LIVE === '1';

describe.skipIf(!enabled)('live brewery quality matrix', () => {
  it('records baseline S1, quality-2 S1, and S2–S8, or NOT RUN when the key is missing', async () => {
    const repoRoot = process.cwd().endsWith(`${join('apps', 'web')}`) ? join(process.cwd(), '..', '..') : process.cwd();
    const output = join(repoRoot, 'docs/evidence/ALABOM/AI-PM/quality-scenario-live.json');
    const chat = openQualitySimulationChat();
    if (!chat) {
      writeFileSync(
        output,
        JSON.stringify(
          {
            status: 'NOT RUN',
            reason: 'GPT_API_KEY missing',
            criteriaVersion: QUALITY_CRITERIA_VERSION,
            productFollowUpInvoked: false,
            runs: [],
          },
          null,
          2,
        ),
      );
      expect(chat).toBeUndefined();
      return;
    }
    const runs = await executeQualityMatrix({
      chat,
      source: 'model',
      businessText: BREWERY_QUALITY_BODY,
      currentFirstRequest: buildFirstReviewRequest(BREWERY_QUALITY_BODY),
    });
    writeFileSync(
      output,
      JSON.stringify(
        {
          status: 'RECORDED',
          source: 'model',
          criteriaVersion: QUALITY_CRITERIA_VERSION,
          baselinePromptVersion: BASELINE_PROMPT_VERSION,
          currentPromptVersion: AI_PM_FIRST_PROMPT_VERSION,
          simulationVersion: AI_PM_QUALITY_SIMULATION_VERSION,
          input: 'brewery body only',
          productFollowUpInvoked: false,
          runs,
        },
        null,
        2,
      ),
    );
    expect(runs).toHaveLength(9);
    expect(runs.every((run) => run.source === 'model')).toBe(true);
    expect(runs[0]?.promptVersion).toBe(BASELINE_PROMPT_VERSION);
    expect(runs[1]?.promptVersion).toBe(AI_PM_FIRST_PROMPT_VERSION);
  });
});
