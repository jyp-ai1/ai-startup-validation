import type {
  FrameworkAnalysisInput,
  FrameworkAnalysisResult,
  FrameworkId,
  FrameworkProviderId,
} from './framework-types';
import { getFrameworkProvider } from './framework-provider';
import { selectFrameworks } from './framework-selector';

export class FrameworkEngine {
  private readonly providerId: FrameworkProviderId;

  constructor(providerId: FrameworkProviderId = 'mock') {
    this.providerId = providerId;
  }

  async analyze(input: FrameworkAnalysisInput): Promise<FrameworkAnalysisResult> {
    const start = Date.now();
    const selectedIds = selectFrameworks(input);
    const provider = getFrameworkProvider(this.providerId);

    const frameworks = await Promise.all(
      selectedIds.map((id) => provider.analyze(id, input)),
    );

    const aggregateScore =
      frameworks.length > 0
        ? Math.round(frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length)
        : 0;

    const aggregateImpact = frameworks.reduce((sum, f) => sum + f.decisionImpact, 0);

    return {
      frameworks,
      aggregateScore,
      aggregateImpact,
      executionDurationMs: Date.now() - start,
      providerId: this.providerId,
      selectedIds,
    };
  }
}

export const frameworkEngine = new FrameworkEngine('mock');

export type { FrameworkAnalysisInput, FrameworkAnalysisResult, FrameworkResult, FrameworkId } from './framework-types';
