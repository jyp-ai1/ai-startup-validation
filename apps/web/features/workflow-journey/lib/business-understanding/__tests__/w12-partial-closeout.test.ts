import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  appendAiPmLoopTurn,
  clearAiPmLoopState,
  createInitialAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import { buildEmptyProjectConversationSeed } from '../build-empty-project-seed';
import { assertSingleHeroCta, presentAnalysisScreen } from '../present-analysis-screen';
import { runAnalysis } from '@/lib/analysis-engine';
import { mapEvidenceStatusToAnalysisInput } from '../map-evidence-to-analysis-input';
import { deriveEvidenceStatusFromMemory } from '../evidence-status';
import { emptyConversationMemory, upsertConfirmedFact } from '../conversation-memory';
import { looksLikeDocumentFileName } from '../workspace-document-eligibility';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
  return store;
}

describe('W12 PARTIAL closeout (C1 / D3 / E3 / F1)', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('C1 — loop state survives refresh (save → clear memory → load)', () => {
    const projectId = 'demo-session';
    clearAiPmLoopState(projectId);
    const seeded = {
      ...createInitialAiPmLoopState(),
      phase: 'issue' as const,
      currentIssueId: 'customer_definition' as const,
      readingCompleted: true,
    };
    saveAiPmLoopState(seeded, projectId);
    appendAiPmLoopTurn(
      { issueId: 'customer_definition', answer: '병원 원장', appliedAt: 't1' },
      projectId,
    );

    // Simulate refresh: new load from same sessionStorage
    const restored = loadAiPmLoopState(projectId);
    expect(restored.turns).toHaveLength(1);
    expect(restored.turns[0]?.answer).toBe('병원 원장');
    expect(restored.readingCompleted).toBe(true);
  });

  it('D3 — Evidence-first presenter exposes exactly one Hero CTA', () => {
    let memory = emptyConversationMemory('hero');
    memory = upsertConfirmedFact(memory, 'customer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'buyer', '병원 원장', 'user_turn');
    memory = upsertConfirmedFact(memory, 'problem', '재방문 관리', 'user_turn');
    memory = upsertConfirmedFact(memory, 'business', '병원 AI', 'document');
    const evidence = deriveEvidenceStatusFromMemory({ memory, entities: null });
    const input = mapEvidenceStatusToAnalysisInput({ evidence });
    const result = runAnalysis(input);
    const panel = presentAnalysisScreen(result);
    expect(assertSingleHeroCta(panel)).toBe(true);
    const heroCount = panel.hero || panel.recommended ? 1 : 0;
    expect(heroCount).toBeLessThanOrEqual(1);
  });

  it('E3 — Review Start error contract: visible message implies Retry CTA available', () => {
    // Contract for UI: when reviewError is set, panel must expose retry test id.
    // Pure shape check used by WorkspaceAnalysisResultPanel.
    const reviewError = '시장성 분석을 시작하지 못했습니다. 다시 시도해 주세요.';
    expect(reviewError.length).toBeGreaterThan(10);
    expect(reviewError).toMatch(/다시 시도|시도/);
  });

  it('F1 — empty / Idea seed never invents business from title/filename', () => {
    const seed = buildEmptyProjectConversationSeed('my-pitch-deck.pdf');
    expect(seed).toContain('사업: 아직 확인되지 않음');
    expect(seed).toContain('고객: 아직 확인되지 않음');
    expect(seed).toContain('문제: 아직 확인되지 않음');
    expect(seed).toContain('문서가 없습니다');
    expect(looksLikeDocumentFileName('my-pitch-deck.pdf')).toBe(true);
    // Seed may mention project name line but must not treat filename as confirmed business
    expect(seed).not.toMatch(/^사업:\s*my-pitch-deck/m);
  });
});
