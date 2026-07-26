import type { AgentProjectContext } from '../../types';
import type { CompanyKnowledgeGraph, IntelligencePlatformResult } from './types';

export function buildCompanyKnowledgeGraph(
  context: AgentProjectContext,
  platform: IntelligencePlatformResult,
): CompanyKnowledgeGraph {
  const projectId = context.projectId;
  const nodes = [
    { id: 'founder-1', type: 'founder' as const, label: 'Founder' },
    { id: projectId, type: 'project' as const, label: context.projectTitle },
    { id: 'customer-1', type: 'customer' as const, label: 'Target customer' },
    { id: 'competitor-1', type: 'competitor' as const, label: 'Competitor set' },
    { id: 'evidence-1', type: 'evidence' as const, label: 'Research evidence' },
    { id: 'decision-1', type: 'decision' as const, label: 'Latest decision' },
    { id: 'memory-1', type: 'memory' as const, label: 'Company memory' },
    { id: 'action-1', type: 'action' as const, label: 'Today action' },
    { id: 'outcome-1', type: 'outcome' as const, label: 'Expected outcome' },
  ];

  const edges = [
    { id: 'e1', from: 'founder-1', to: projectId, relationKey: 'owns' },
    { id: 'e2', from: projectId, to: 'customer-1', relationKey: 'serves' },
    { id: 'e3', from: projectId, to: 'competitor-1', relationKey: 'competesWith' },
    { id: 'e4', from: 'evidence-1', to: 'decision-1', relationKey: 'supports' },
    { id: 'e5', from: 'memory-1', to: 'action-1', relationKey: 'informs' },
    { id: 'e6', from: 'action-1', to: 'outcome-1', relationKey: 'targets' },
    { id: 'e7', from: 'customer-1', to: 'evidence-1', relationKey: 'voicedIn' },
    { id: 'e8', from: 'competitor-1', to: 'decision-1', relationKey: 'pressures' },
  ];

  const competitor = platform.reports.find((report) => report.domain === 'competitor');
  const customer = platform.reports.find((report) => report.domain === 'customer');

  const connectionInsights: string[] = [];
  if (competitor && customer) {
    connectionInsights.push('interviewCompetitorLink');
  }
  if (platform.importantCount >= 2) {
    connectionInsights.push('multiDomainShift');
  }

  return { nodes, edges, connectionInsights };
}
