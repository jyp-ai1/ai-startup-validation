import type { FrameworkProvider, FrameworkProviderId } from './framework-types';
import { getFrameworkProviderImpl } from '../providers';

export function getFrameworkProvider(id: FrameworkProviderId = 'mock'): FrameworkProvider {
  return getFrameworkProviderImpl(id);
}
