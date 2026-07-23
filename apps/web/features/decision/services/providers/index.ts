import type { DecisionProvider, DecisionProviderId } from '../decision-types';
import { MockDecisionProvider } from './mock-decision-provider';

/** Future LLM providers — implement DecisionProvider and register here. */
export class OpenAIDecisionProvider implements DecisionProvider {
  readonly id = 'openai' as const;

  async generate(): Promise<never> {
    throw new Error('OpenAI Decision Provider not connected. Use mock provider for Sprint 8.0.');
  }
}

export class AnthropicDecisionProvider implements DecisionProvider {
  readonly id = 'anthropic' as const;

  async generate(): Promise<never> {
    throw new Error('Anthropic Decision Provider not connected. Use mock provider for Sprint 8.0.');
  }
}

export class GeminiDecisionProvider implements DecisionProvider {
  readonly id = 'gemini' as const;

  async generate(): Promise<never> {
    throw new Error('Gemini Decision Provider not connected. Use mock provider for Sprint 8.0.');
  }
}

export class OllamaDecisionProvider implements DecisionProvider {
  readonly id = 'ollama' as const;

  async generate(): Promise<never> {
    throw new Error('Ollama Decision Provider not connected. Use mock provider for Sprint 8.0.');
  }
}

const mockProvider = new MockDecisionProvider();

export function getDecisionProvider(id: DecisionProviderId = 'mock'): DecisionProvider {
  switch (id) {
    case 'openai':
      return new OpenAIDecisionProvider();
    case 'anthropic':
      return new AnthropicDecisionProvider();
    case 'gemini':
      return new GeminiDecisionProvider();
    case 'ollama':
      return new OllamaDecisionProvider();
    case 'mock':
    default:
      return mockProvider;
  }
}

export { MockDecisionProvider };
