import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateUserAnswer } from '../deterministic-user-agent';
import { MINI_SANDBOX_BEHAVIORS, MINI_SANDBOX_BUSINESSES } from '../mini-sandbox-businesses';
import { runMiniSandboxPoc } from '../mini-sandbox-runner';
import { canTransition } from '../state-transition-rules';

describe('validation engine — mini sandbox POC', () => {
  it('matrix is 10 × 3 × 5 = 150 turns', () => {
    const pack = runMiniSandboxPoc();
    expect(MINI_SANDBOX_BUSINESSES).toHaveLength(10);
    expect(MINI_SANDBOX_BEHAVIORS).toHaveLength(3);
    expect(pack.matrix.totalTurns).toBe(150);
    expect(pack.rows).toHaveLength(150);
  });

  it('user agent is deterministic for contradiction', () => {
    const biz = MINI_SANDBOX_BUSINESSES[0]!;
    const a = generateUserAnswer({
      business: biz,
      behavior: 'contradiction',
      turn: 4,
      askedGapId: 'customerPersona',
    });
    const b = generateUserAnswer({
      business: biz,
      behavior: 'contradiction',
      turn: 4,
      askedGapId: 'customerPersona',
    });
    expect(a).toBe(b);
    expect(a).toMatch(/50대/);
  });

  it('state transition rules allow correction path', () => {
    expect(canTransition('CLOSED', 'CONFLICT')).toBe(true);
    expect(canTransition('CONFLICT', 'PARTIAL')).toBe(true);
  });

  it('engine completes all sessions without throw', () => {
    const pack = runMiniSandboxPoc();
    expect(pack.engineHealth.sessionsCompleted).toBe(30);
    expect(pack.designConstraints).toContain('deterministic_user_agent');

    if (process.env.MINI_SANDBOX_EVIDENCE === '1') {
      const outDir = join(
        process.cwd(),
        '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
      );
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, 'mini-sandbox-evidence.json'),
        JSON.stringify(pack, null, 2),
      );
    }
  });
});
