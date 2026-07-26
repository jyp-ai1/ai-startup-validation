import type { AgentProjectContext, AgentProviderId, ResearchSource } from '../../types';

export type IntelligenceDomain =
  | 'competitor'
  | 'market'
  | 'pricing'
  | 'government'
  | 'customer'
  | 'investment';

export const INTELLIGENCE_DOMAINS: IntelligenceDomain[] = [
  'competitor',
  'market',
  'pricing',
  'government',
  'customer',
  'investment',
];

export type IntelligenceReport = {
  domain: IntelligenceDomain;
  title: string;
  summary: string;
  confidence: number;
  signals: string[];
  sources: ResearchSource[];
  fetchedAt: string;
  providerId: AgentProviderId;
  fromRealRun: boolean;
};

export type IntelligencePlatformResult = {
  runId: string;
  projectId: string;
  reports: IntelligenceReport[];
  investigationCount: number;
  importantCount: number;
  completedAt: string;
  providerId: AgentProviderId;
};

export type KnowledgeGraphNodeType =
  | 'founder'
  | 'project'
  | 'customer'
  | 'competitor'
  | 'evidence'
  | 'decision'
  | 'memory'
  | 'action'
  | 'outcome';

export type KnowledgeGraphNode = {
  id: string;
  type: KnowledgeGraphNodeType;
  label: string;
};

export type KnowledgeGraphEdge = {
  id: string;
  from: string;
  to: string;
  relationKey: string;
};

export type CompanyKnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  connectionInsights: string[];
};

export type IntelligencePlatformInput = {
  context: AgentProjectContext;
  providerId?: AgentProviderId;
};
