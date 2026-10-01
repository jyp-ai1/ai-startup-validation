import { describe, expect, it, beforeEach, vi } from 'vitest';

import { getDemoSeedBundle } from '@/lib/demo/seed';
import { demoSeedQaSteps } from '@/lib/demo/demo-seed-qa';
import { materializeDemoPlaybackFrames } from '@/lib/demo/demo-playback-materializer';

describe('Demo playback frames', () => {
  beforeEach(() => {
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
    vi.stubGlobal('sessionStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      },
    });
  });

  it('clinicflow: no consecutive duplicate question surfaces', () => {
    const bundle = getDemoSeedBundle('clinicflow');
    expect(bundle).not.toBeNull();
    const projectId = 'demo-sample-clinicflow-test';
    const frames = materializeDemoPlaybackFrames(bundle!, projectId);
    const questionFrames = frames.filter((f) => f.surface === 'question');
    const texts = questionFrames
      .map((f) => f.presenter?.questionText?.trim())
      .filter(Boolean) as string[];

    for (let i = 1; i < texts.length; i += 1) {
      expect(texts[i]).not.toBe(texts[i - 1]);
    }

    expect(questionFrames.length).toBe(demoSeedQaSteps('clinicflow').length);
  });
});
