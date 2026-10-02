import type { AnswerBehaviorId, BusinessScenarioContract } from './contracts';
import type { MiniSandboxTurnRow } from './mini-sandbox-runner';

export type CoverageMatrix = {
  businessArchetypes: string[];
  behaviors: AnswerBehaviorId[];
  failureTypesObserved: string[];
  cells: Record<string, Record<string, { turns: number; failures: number }>>;
};

export function buildCoverageMatrix(
  businesses: BusinessScenarioContract[],
  rows: MiniSandboxTurnRow[],
): CoverageMatrix {
  const cells: CoverageMatrix['cells'] = {};
  const failureTypes = new Set<string>();

  for (const b of businesses) {
    cells[b.id] = {};
    for (const row of rows.filter((r) => r.businessId === b.id)) {
      const beh = row.behavior;
      if (!cells[b.id]![beh]) cells[b.id]![beh] = { turns: 0, failures: 0 };
      cells[b.id]![beh]!.turns += 1;
      const failed =
        row.evaluation.understanding === 'FAIL' ||
        row.evaluation.state === 'FAIL' ||
        row.evaluation.question === 'FAIL';
      if (failed) cells[b.id]![beh]!.failures += 1;
      for (const f of row.evaluation.failureType) failureTypes.add(f);
    }
  }

  return {
    businessArchetypes: businesses.map((b) => b.archetype),
    behaviors: [...new Set(rows.map((r) => r.behavior))],
    failureTypesObserved: [...failureTypes].sort(),
    cells,
  };
}
