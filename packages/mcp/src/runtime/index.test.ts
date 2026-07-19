import { describe, it, expect, beforeEach } from 'vitest';

import { ToolRegistry } from '../registry';
import { MCPRuntime } from '../runtime';
import { MCPLogger } from '../logging';
import { MetricsTracker } from '../metrics';
import { createExecutionContext } from '../context';

describe('MCPRuntime', () => {
  let runtime: MCPRuntime;

  beforeEach(() => {
    const registry = new ToolRegistry();
    runtime = new MCPRuntime({
      registry,
      metrics: new MetricsTracker(),
      logger: new MCPLogger(),
      registerDefaultAdapters: true,
    });
    runtime.initialize();
  });

  it('initializes and registers default adapter tools', () => {
    const tools = runtime.getRegistry().list();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.id.startsWith('filesystem.'))).toBe(true);
  });

  it('executes a tool with valid permissions', async () => {
    const context = createExecutionContext({
      traceId: 'trace-1',
      requestId: 'req-1',
      permissions: ['fs.read'],
    });

    const result = await runtime.executeTool(
      'filesystem.read_file',
      {},
      context,
    );

    expect(result.success).toBe(true);
    expect(result.toolId).toBe('filesystem.read_file');
  });

  it('denies tool without permissions', async () => {
    const context = createExecutionContext({
      traceId: 'trace-2',
      requestId: 'req-2',
      permissions: [],
    });

    const result = await runtime.executeTool(
      'filesystem.write_file',
      {},
      context,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('executes sequential workflow', async () => {
    const context = createExecutionContext({
      traceId: 'trace-3',
      requestId: 'req-3',
      permissions: ['fs.read'],
    });

    const result = await runtime.executeWorkflow(
      {
        id: 'wf-1',
        name: 'Read twice',
        steps: [
          { type: 'tool', toolId: 'filesystem.read_file', input: {} },
          { type: 'tool', toolId: 'filesystem.list_directory', input: {} },
        ],
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('shuts down cleanly', () => {
    runtime.shutdown();
    expect(runtime.isInitialized()).toBe(false);
  });
});
