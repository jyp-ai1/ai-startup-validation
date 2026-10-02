/**
 * Phase 2 — scan all 15 businesses × perturbation matrix for failure types.
 */

import type { AccuracyFailureType } from './failure-taxonomy';
import { BUSINESS_SCENARIO_MATRIX } from './business-scenario-matrix';
import { runScriptOnBusiness } from './multi-business-harness';
import {
  CROSS_BUSINESS_PERTURBATION_CELLS,
  type CrossBusinessMatrixCell,
} from './cross-business-perturbation-matrix';
import { sprint2CodesFromHarness, type Sprint2FailureCode } from './sprint2-failure-taxonomy';

export type CrossBusinessCellResult = {
  businessId: string;
  set: string;
  perturbation: string;
  pass: boolean;
  harnessFailureTypes: AccuracyFailureType[];
  sprint2FailureTypes: Sprint2FailureCode[];
  turn: number;
};

export type CrossBusinessFailureSearchReport = {
  generatedAt: string;
  sprint: 'GENERALIZATION_FAILURE_SEARCH';
  matrixSize: { businesses: number; perturbations: number; cells: number };
  cells: CrossBusinessCellResult[];
  bySprint2Type: Record<string, { failCount: number; businesses: string[] }>;
  byBusiness: Record<string, { failCount: number; types: Sprint2FailureCode[] }>;
  clusterHints: Array<{
    sprint2Type: string;
    businessCount: number;
    businesses: string[];
    note: string;
  }>;
};

function cellToScript(cell: CrossBusinessMatrixCell) {
  return {
    turns: [
      {
        perturbation: cell.perturbation,
        askedGapId: cell.askedGapId,
        askedQuestionText: cell.askedQuestionText,
        askedIssueId: cell.askedIssueId,
        userAnswer: cell.userAnswer,
        expect: cell.expect,
      },
    ],
  };
}

export function runCrossBusinessFailureSearch(): CrossBusinessFailureSearchReport {
  const cells: CrossBusinessCellResult[] = [];

  for (const biz of BUSINESS_SCENARIO_MATRIX) {
    for (const cell of CROSS_BUSINESS_PERTURBATION_CELLS) {
      const result = runScriptOnBusiness(biz, cellToScript(cell));
      const turn = result.turns[0]!;
      const harnessFailureTypes = turn.failureTypes ?? [];
      const sprint2FailureTypes = sprint2CodesFromHarness(harnessFailureTypes);
      cells.push({
        businessId: biz.id,
        set: biz.set,
        perturbation: cell.perturbation,
        pass: turn.pass,
        harnessFailureTypes,
        sprint2FailureTypes,
        turn: 1,
      });
    }
  }

  const bySprint2Type: CrossBusinessFailureSearchReport['bySprint2Type'] = {};
  const byBusiness: CrossBusinessFailureSearchReport['byBusiness'] = {};

  for (const c of cells) {
    if (c.pass) continue;
    if (!byBusiness[c.businessId]) {
      byBusiness[c.businessId] = { failCount: 0, types: [] };
    }
    byBusiness[c.businessId].failCount += 1;
    for (const t of c.sprint2FailureTypes) {
      if (!byBusiness[c.businessId].types.includes(t)) {
        byBusiness[c.businessId].types.push(t);
      }
      if (!bySprint2Type[t]) bySprint2Type[t] = { failCount: 0, businesses: [] };
      bySprint2Type[t].failCount += 1;
      if (!bySprint2Type[t].businesses.includes(c.businessId)) {
        bySprint2Type[t].businesses.push(c.businessId);
      }
    }
  }

  const clusterHints = Object.entries(bySprint2Type)
    .filter(([, v]) => v.businesses.length >= 3)
    .map(([sprint2Type, v]) => ({
      sprint2Type,
      businessCount: v.businesses.length,
      businesses: v.businesses,
      note: 'Candidate failure cluster — layer-only fix target (not business-specific)',
    }))
    .sort((a, b) => b.businessCount - a.businessCount);

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'GENERALIZATION_FAILURE_SEARCH',
    matrixSize: {
      businesses: BUSINESS_SCENARIO_MATRIX.length,
      perturbations: CROSS_BUSINESS_PERTURBATION_CELLS.length,
      cells: cells.length,
    },
    cells,
    bySprint2Type,
    byBusiness,
    clusterHints,
  };
}
