import { describe, expect, it } from 'vitest';

import { runIntelligencePlatform } from './intelligence-platform';
import { buildCompanyKnowledgeGraph } from './knowledge-graph';

describe('runIntelligencePlatform', () => {
  it('returns six domain reports with mock fallback', async () => {
    const result = await runIntelligencePlatform({
      context: {
        projectId: 'proj-test',
        projectTitle: 'TestCo',
        ideaSummary: 'AI booking for freelancers',
        goalId: 'viability',
        locale: 'ko',
      },
      providerId: 'mock',
    });

    expect(result.reports).toHaveLength(6);
    expect(result.investigationCount).toBeGreaterThan(6);
    expect(result.importantCount).toBeGreaterThan(0);
  });
});

describe('buildCompanyKnowledgeGraph', () => {
  it('links founder to outcome nodes', async () => {
    const intelligence = await runIntelligencePlatform({
      context: {
        projectId: 'proj-graph',
        projectTitle: 'GraphCo',
        ideaSummary: 'B2B SaaS',
        goalId: 'viability',
      },
      providerId: 'mock',
    });

    const graph = buildCompanyKnowledgeGraph(
      {
        projectId: 'proj-graph',
        projectTitle: 'GraphCo',
        ideaSummary: 'B2B SaaS',
        goalId: 'viability',
      },
      intelligence,
    );

    expect(graph.nodes.length).toBeGreaterThan(5);
    expect(graph.edges.some((edge) => edge.relationKey === 'owns')).toBe(true);
  });
});
