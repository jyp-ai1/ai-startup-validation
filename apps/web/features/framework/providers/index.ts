import type { FrameworkProvider, FrameworkProviderId } from '../services/framework-types';
import { MockFrameworkProvider } from './mock-provider';

const providers: Record<FrameworkProviderId, FrameworkProvider> = {
  mock: new MockFrameworkProvider(),
  openai: new MockFrameworkProvider(),
  anthropic: new MockFrameworkProvider(),
  gemini: new MockFrameworkProvider(),
  ollama: new MockFrameworkProvider(),
};

export function getFrameworkProviderImpl(id: FrameworkProviderId): FrameworkProvider {
  return providers[id] ?? providers.mock;
}
