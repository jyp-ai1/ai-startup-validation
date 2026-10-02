import type { MiniSandboxTurnRow } from './mini-sandbox-runner';

export type FailureCluster = {
  code: string;
  count: number;
  examples: Array<{ businessId: string; behavior: string; turn: number }>;
};

export type FailureMiningReport = {
  totalTurns: number;
  failedTurns: number;
  clusters: FailureCluster[];
  byBehavior: Record<string, number>;
  byBusiness: Record<string, number>;
};

function turnFailed(row: MiniSandboxTurnRow): boolean {
  const e = row.evaluation;
  return (
    e.understanding === 'FAIL' ||
    e.state === 'FAIL' ||
    e.gap === 'FAIL' ||
    e.question === 'FAIL' ||
    e.reasoning === 'FAIL' ||
    e.judgment === 'FAIL'
  );
}

export function mineFailures(rows: MiniSandboxTurnRow[]): FailureMiningReport {
  const clusterMap = new Map<string, FailureCluster>();
  const byBehavior: Record<string, number> = {};
  const byBusiness: Record<string, number> = {};
  let failedTurns = 0;

  for (const row of rows) {
    if (!turnFailed(row)) continue;
    failedTurns += 1;
    byBehavior[row.behavior] = (byBehavior[row.behavior] ?? 0) + 1;
    byBusiness[row.businessId] = (byBusiness[row.businessId] ?? 0) + 1;

    for (const code of row.evaluation.failureType) {
      let c = clusterMap.get(code);
      if (!c) {
        c = { code, count: 0, examples: [] };
        clusterMap.set(code, c);
      }
      c.count += 1;
      if (c.examples.length < 5) {
        c.examples.push({
          businessId: row.businessId,
          behavior: row.behavior,
          turn: row.turn,
        });
      }
    }
  }

  const clusters = [...clusterMap.values()].sort((a, b) => b.count - a.count);

  return {
    totalTurns: rows.length,
    failedTurns,
    clusters,
    byBehavior,
    byBusiness,
  };
}
