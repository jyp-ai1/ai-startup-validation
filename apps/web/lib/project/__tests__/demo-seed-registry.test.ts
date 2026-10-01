import { describe, expect, it } from 'vitest';

import {
  assertDemoSeedRegistryComplete,
  listDemoSeedRegistry,
} from '@/lib/demo/demo-seed-registry';

describe('Long Sprint D — demo seed registry', () => {
  it('lists three Sample bundles with stable project ids', () => {
    const registry = listDemoSeedRegistry();
    expect(registry).toHaveLength(3);
    expect(registry.map((r) => r.slug).sort()).toEqual(['clinicflow', 'fitbridge', 'local-sns']);
    for (const entry of registry) {
      expect(entry.projectId).toMatch(/^demo-sample-/);
      expect(entry.documentChars).toBeGreaterThan(200);
      expect(entry.qaStepCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('assertDemoSeedRegistryComplete passes', () => {
    expect(() => assertDemoSeedRegistryComplete()).not.toThrow();
  });
});
