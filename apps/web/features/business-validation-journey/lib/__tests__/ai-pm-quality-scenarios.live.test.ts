import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AI_PM_FIRST_PROMPT_VERSION, buildFirstReviewRequest, parseSections } from '../ai-pm-review';
import {
  AI_PM_QUALITY_SIMULATION_VERSION,
  BREWERY_QUALITY_BODY,
  evaluateFirstAnalysis,
  executeBreweryScenarios,
  openQualitySimulationChat,
} from '../ai-pm-quality-scenarios';
import { composeReviewInput } from '../ai-pm-review-intake';

const enabled = process.env.AI_PM_QUALITY_LIVE === '1';

describe.skipIf(!enabled)('live brewery quality scenarios', () => {
  it('records one first reading and eight simulation turns', async () => {
    const chat = openQualitySimulationChat();
    expect(chat).toBeTruthy();
    if (!chat) return;
    const text = composeReviewInput({ text: BREWERY_QUALITY_BODY, purpose: 'overall' });
    const firstRequest = buildFirstReviewRequest(text);
    const firstResponse = await chat(firstRequest);
    const firstSections = parseSections(firstResponse.content, BREWERY_QUALITY_BODY);
    const firstEvaluation = evaluateFirstAnalysis(BREWERY_QUALITY_BODY, firstSections);
    const turns = await executeBreweryScenarios({
      chat,
      previousQuestion: firstSections?.nextQuestion ?? '',
      previousSummary: firstSections?.analysis?.summary ?? '',
    });
    const report = {
      source: 'model',
      firstPromptVersion: AI_PM_FIRST_PROMPT_VERSION,
      simulationVersion: AI_PM_QUALITY_SIMULATION_VERSION,
      model: firstResponse.model,
      firstCall: {
        status: firstEvaluation.status,
        failures: firstEvaluation.failures,
        raw: firstResponse.content,
      },
      turns,
      productFollowUpInvoked: false,
    };
    const repoRoot = process.cwd().endsWith(`${join('apps', 'web')}`) ? join(process.cwd(), '..', '..') : process.cwd();
    writeFileSync(join(repoRoot, 'docs/evidence/ALABOM/AI-PM/quality-scenario-live.json'), JSON.stringify(report, null, 2));
    expect(turns).toHaveLength(8);
    expect(turns.every((turn) => turn.source === 'model')).toBe(true);
  });
});
