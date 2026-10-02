import type { BusinessScenarioMatrixRow } from '../ai-pm-accuracy/business-scenario-matrix';
import type { BusinessScenarioContract } from './contracts';

export function matrixRowToScenario(row: BusinessScenarioMatrixRow): BusinessScenarioContract {
  return {
    id: row.id,
    archetype: row.businessType,
    documentText: row.documentText,
    groundTruth: {
      customer: {
        value: row.exampleLabel,
        source: 'document',
        certainty: row.initialFields.customer === 'KNOWN' ? 'CLOSED' : 'PARTIAL',
        evidenceStrength: 3,
      },
      problem: {
        value: row.documentText.slice(0, 80),
        source: 'document',
        certainty: 'PARTIAL',
        evidenceStrength: 3,
      },
    },
    set: row.set,
  };
}
