import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  clearG1InstrumentationLog,
  exportG1InstrumentationLogJson,
  logG1LoopEvent,
  readG1InstrumentationLog,
} from '../g1-loop-instrumentation';

describe('g1-loop-instrumentation', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
    vi.stubGlobal('window', {
      localStorage: {
        getItem(key: string) {
          return store[key] ?? null;
        },
        setItem(key: string, value: string) {
          store[key] = value;
        },
        removeItem(key: string) {
          delete store[key];
        },
      },
    });
    clearG1InstrumentationLog();
  });

  it('appends structured loop events to buffer', () => {
    logG1LoopEvent({
      event: 'thinking_reveal',
      workspace: 'demo',
      turn: 1,
      duration: 1820,
      issueId: 'customer_definition',
    });

    const events = readG1InstrumentationLog();
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('thinking_reveal');
    expect(events[0]?.duration).toBe(1820);
    expect(events[0]?.timestamp).toMatch(/^\d{4}-/);
  });

  it('exports JSON for G1 evidence', () => {
    logG1LoopEvent({ event: 'reading_start', workspace: 'demo' });
    logG1LoopEvent({ event: 'reading_end', workspace: 'demo', duration: 4200 });

    const json = exportG1InstrumentationLogJson();
    expect(json).toContain('reading_start');
    expect(json).toContain('reading_end');
  });
});
