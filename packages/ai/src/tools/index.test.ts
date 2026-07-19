import { describe, it, expect } from 'vitest';

import { ToolRegistry, ToolExecutor } from '../index';

describe('ToolRegistry & ToolExecutor', () => {
  it('registers and executes tools', async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'get_weather',
      description: 'Get weather for a city',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
      handler: (args) => ({ city: args.city, temp: 22 }),
    });

    const executor = new ToolExecutor(registry);
    const result = await executor.execute({
      id: 'call_1',
      name: 'get_weather',
      arguments: { city: 'Seoul' },
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ city: 'Seoul', temp: 22 });
  });

  it('returns error for unknown tool', async () => {
    const registry = new ToolRegistry();
    const executor = new ToolExecutor(registry);
    const result = await executor.execute({
      id: 'call_2',
      name: 'unknown',
      arguments: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
