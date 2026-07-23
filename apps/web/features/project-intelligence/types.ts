import type { ProjectMemoryEntry, ProjectMemoryType } from '@repo/db';

export type { ProjectMemoryType, ProjectMemoryEntry };

export type ProjectIntelligence = {
  projectId: string;
  projectSummary: string;
  businessGoal: string | null;
  targetCustomer: string | null;
  businessModel: string | null;
  industry: string | null;
  stage: string;
  risk: string | null;
  opportunity: string | null;
  currentScore: number;
  updatedAt: string;
};

export type ContextScoreViewModel = {
  projectCompleteness: number;
  memory: number;
  evidence: number;
  decisionReady: number;
};

export type TimelineBucket = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export type TimelineItem = {
  id: string;
  bucket: TimelineBucket;
  memoryType: ProjectMemoryType;
  title: string;
  summary: string | null;
  occurredAt: string;
  href: string;
};

export type DailyBriefTask = {
  id: string;
  labelKey: string;
  href: string;
};

export type DailyBriefViewModel = {
  greetingKey: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
  tasks: DailyBriefTask[];
  highlights: { id: string; labelKey: string }[];
};

export type PromptContextProvider = 'mock' | 'openrouter' | 'claude';

export type PromptContextBlock = {
  section: string;
  content: string;
};

export type PromptContext = {
  projectId: string;
  provider: PromptContextProvider;
  blocks: PromptContextBlock[];
  serialized: string;
};

export type ProactiveMessage = {
  messageKey: string;
  messageParams?: Record<string, string | number>;
  actionKey?: string;
  actionHref?: string;
};

export type IntelligenceMemorySections = {
  conversations: ProjectMemoryEntry[];
  research: ProjectMemoryEntry[];
  decisions: ProjectMemoryEntry[];
  reports: ProjectMemoryEntry[];
  activities: ProjectMemoryEntry[];
};

export type IntelligenceViewModel = {
  intelligence: ProjectIntelligence;
  memories: ProjectMemoryEntry[];
  contextScore: ContextScoreViewModel;
  dailyBrief: DailyBriefViewModel;
  timeline: TimelineItem[];
  proactiveMessage: ProactiveMessage;
  memorySections: IntelligenceMemorySections;
  promptContext: PromptContext;
};

export type SaveMemoryInput = {
  projectId: string;
  memoryType: ProjectMemoryType;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
  sourceId?: string;
};
