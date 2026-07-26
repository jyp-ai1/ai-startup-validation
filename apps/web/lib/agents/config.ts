/** Resolves agent provider — mock until LLM keys configured (Phase 10). */
export function resolveAgentProviderId(): 'mock' | 'openrouter' {
  if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
    return 'openrouter';
  }
  return 'mock';
}
