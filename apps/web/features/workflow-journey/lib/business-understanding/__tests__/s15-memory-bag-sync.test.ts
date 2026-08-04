import { describe, expect, it, beforeEach } from 'vitest';

import { applyWorkspaceLoopAnswer } from '../workspace-state-update';
import {
  appendAiPmLoopTurn,
  clearAiPmLoopState,
  loadAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import {
  clearConversationMemory,
  loadConversationMemory,
} from '../conversation-memory-store';
import { saveWorkspaceDocumentText } from '../../workspace-ai-pm-messages';

function installSessionStorageMock() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { sessionStorage },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    configurable: true,
  });
}

describe('S15 Memory bag sync after loop answer', () => {
  const projectId = 's15-mem-sync';

  beforeEach(() => {
    installSessionStorageMock();
    clearAiPmLoopState(projectId);
    clearConversationMemory(projectId);
    saveWorkspaceDocumentText(
      '사업계획서 요약\n서비스명: 병원 AI\n형태: B2B SaaS\n대상: 병원',
      projectId,
    );
  });

  it('persists problem Fact when turn is appended before Memory rebuild', () => {
    appendAiPmLoopTurn(
      {
        issueId: 'problem_definition',
        answer: '재방문 관리 비용이 큽니다',
        appliedAt: new Date().toISOString(),
      },
      projectId,
    );
    applyWorkspaceLoopAnswer('problem_definition', '재방문 관리 비용이 큽니다', projectId);

    const mem = loadConversationMemory(projectId);
    expect(mem.facts.some((f) => f.key === 'problem')).toBe(true);
    expect(loadAiPmLoopState(projectId).turns).toHaveLength(1);
  });
});
