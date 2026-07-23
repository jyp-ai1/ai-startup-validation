import type { ResearchProviderId } from './research-agent-types';
import { getResearchProvider } from '../providers';

export function getResearchProviderService(id: ResearchProviderId = 'mock') {
  return getResearchProvider(id);
}
