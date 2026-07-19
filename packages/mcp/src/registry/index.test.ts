import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { ToolRegistry } from './index';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  const sampleTool = {
    id: 'test.echo',
    name: 'Echo',
    version: '1.0.0',
    category: 'test',
    description: 'Echo input',
    permissions: ['test.run'],
    inputSchema: z.object({ message: z.string() }),
    outputSchema: z.object({ message: z.string() }),
    timeout: 5000,
    retryable: false,
    cacheable: false,
    tags: ['test'],
    capabilities: ['echo'],
    handler: async (input: unknown) => input,
  };

  it('registers and retrieves tools', () => {
    registry.register(sampleTool);
    expect(registry.get('test.echo').name).toBe('Echo');
  });

  it('searches tools by query', () => {
    registry.register(sampleTool);
    expect(registry.search('echo')).toHaveLength(1);
  });

  it('lists tools by category and tag', () => {
    registry.register(sampleTool);
    expect(registry.listByCategory('test')).toHaveLength(1);
    expect(registry.listByTag('test')).toHaveLength(1);
  });

  it('generates markdown documentation', () => {
    registry.register(sampleTool);
    const md = registry.toMarkdown();
    expect(md).toContain('test.echo');
    expect(md).toContain('Echo');
  });
});
