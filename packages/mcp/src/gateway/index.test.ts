import { describe, it, expect, beforeEach } from 'vitest';

import { ToolRegistry } from '../registry';
import { MCPRuntime } from '../runtime';
import { MCPGateway } from '../gateway';
import { ToolDiscovery } from '../discovery';
import { MCPLogger } from '../logging';
import { MetricsTracker } from '../metrics';

describe('MCPGateway', () => {
  let gateway: MCPGateway;

  beforeEach(() => {
    const registry = new ToolRegistry();
    const runtime = new MCPRuntime({
      registry,
      metrics: new MetricsTracker(),
      logger: new MCPLogger(),
      registerDefaultAdapters: true,
    });
    runtime.initialize();
    gateway = new MCPGateway(runtime, new ToolDiscovery(registry));
  });

  it('lists tools through gateway', () => {
    const tools = gateway.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  it('searches and recommends tools', () => {
    const results = gateway.searchTools('playwright');
    expect(results.some((t) => t.category === 'playwright')).toBe(true);

    const recommended = gateway.recommendTools('file', 3);
    expect(recommended.length).toBeLessThanOrEqual(3);
  });

  it('generates documentation', () => {
    const docs = gateway.getToolDocumentation();
    expect(docs).toContain('# MCP Tool Registry');
  });
});
