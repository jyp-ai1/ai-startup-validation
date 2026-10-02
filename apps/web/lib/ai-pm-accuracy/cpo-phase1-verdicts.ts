import fs from 'node:fs';
import path from 'node:path';

export type CpoPhase1RowVerdict = 'PASS' | 'PARTIAL' | 'FAIL';

export type CpoPhase1SignedVerdicts = {
  signedAt: string;
  signedBy: string;
  reverify: number;
  evidenceGitSha: string;
  evidenceDocCommits: string[];
  phase1Status: 'CLOSED';
  summary: { pass: number; partial: number; fail: number };
  verdictNote?: string;
  rows: Array<{
    scenario: string;
    turn: number;
    scenarioLetter: string;
    verdict: CpoPhase1RowVerdict;
  }>;
};

const VERDICT_REL = 'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/cpo-phase1-cpo-verdicts.json';

export function loadCpoPhase1SignedVerdicts(cwd = process.cwd()): CpoPhase1SignedVerdicts | null {
  const candidates = [
    path.resolve(cwd, '../../', VERDICT_REL),
    path.resolve(cwd, VERDICT_REL),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as CpoPhase1SignedVerdicts;
    } catch {
      return null;
    }
  }
  return null;
}

export function verdictKey(scenario: string, turn: number): string {
  return `${scenario}::${turn}`;
}

export function buildVerdictLookup(
  signed: CpoPhase1SignedVerdicts | null,
): Map<string, CpoPhase1RowVerdict> {
  const map = new Map<string, CpoPhase1RowVerdict>();
  if (!signed) return map;
  for (const row of signed.rows) {
    map.set(verdictKey(row.scenario, row.turn), row.verdict);
  }
  return map;
}
