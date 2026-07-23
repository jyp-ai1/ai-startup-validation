import type { ResearchRequest, ResearchTaskType } from './research-agent-types';

const STARTUP: ResearchTaskType[] = ['MARKET', 'COMPETITOR', 'VOC', 'TECHNOLOGY'];
const EXPANSION: ResearchTaskType[] = ['MARKET', 'COMPETITOR', 'GOVERNMENT', 'TECHNOLOGY'];
const AI: ResearchTaskType[] = ['MARKET', 'TECHNOLOGY', 'COMPETITOR', 'GOVERNMENT'];
const DEFAULT: ResearchTaskType[] = ['MARKET', 'COMPETITOR', 'GOVERNMENT', 'VOC', 'TECHNOLOGY'];

/** Plan research tasks from project context — swappable planner for multi-agent (Sprint 8.5). */
export function planResearchTasks(request: ResearchRequest): ResearchTaskType[] {
  let base: ResearchTaskType[];

  switch (request.projectType) {
    case 'STARTUP':
      base = [...STARTUP];
      break;
    case 'MARKET_EXPANSION':
      base = [...EXPANSION];
      break;
    case 'AI_INITIATIVE':
      base = [...AI];
      break;
    default:
      base = [...DEFAULT];
  }

  const industry = request.industry?.toLowerCase() ?? '';
  if (industry.includes('gov') || industry.includes('public')) {
    if (!base.includes('GOVERNMENT')) base.push('GOVERNMENT');
  }

  return [...new Set(base)];
}
