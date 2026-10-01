import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';
import { buildWorkspacePersistedSnapshot } from '@/features/workspace/lib/sync-workspace-persistence';
import { upsertConfirmedFact } from '@/features/workflow-journey/lib/business-understanding/conversation-memory';
import {
  clearConversationMemory,
  loadConversationMemory,
  saveConversationMemory,
} from '@/features/workflow-journey/lib/business-understanding/conversation-memory-store';
import {
  loadWorkspaceDomain,
  loadWorkspaceEntities,
  saveWorkspaceDomain,
  saveWorkspaceDocumentText,
  saveWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import { parseWorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';
import type { StartupProject } from '@repo/types/validation';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

function sampleEntities(customerValue: string): LaunchLensDomainContext {
  return {
    founder: { value: 'CEO', basis: 'document' },
    business: { value: '양조 SaaS', basis: 'document', model: 'B2B', name: '양조 SaaS' },
    customer: { value: customerValue, basis: 'needs_confirmation' },
    product: { value: '주문 관리', basis: 'document' },
    market: { value: '국내 양조', basis: 'inferred' },
    competitor: { value: null, basis: 'unknown' },
  };
}

function sampleDomain(customerValue: string): WorkspaceDomainEvidence {
  return {
    founder: 'CEO',
    business: '양조 SaaS',
    customer: customerValue,
    market: '국내 양조',
    competitor: '',
  };
}

function clearProjectCache(projectId: string): void {
  sessionStorage.removeItem(`launchlens.domain.${projectId}.workspace`);
  sessionStorage.removeItem(`launchlens.entities.${projectId}.workspace`);
  sessionStorage.removeItem(`launchlens.conversationMemory.${projectId}`);
  sessionStorage.removeItem(`launchlens.document.${projectId}.raw`);
  sessionStorage.removeItem(`launchlens.workspace.${projectId}.dbUpdatedAt`);
}

describe('P0 Authenticated Persistence — domain/memory/entities snapshot', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('build → apply round-trip restores correction after simulated refresh', () => {
    const projectId = 'project-a';
    const correctedCustomer = '영세 양조장';

    saveWorkspaceDocumentText('# 양조 SaaS\n\n대상: 소규모 양조장', projectId);
    saveWorkspaceDomain(sampleDomain(correctedCustomer), projectId);
    saveWorkspaceEntities(sampleEntities(correctedCustomer), projectId);
    saveConversationMemory(
      upsertConfirmedFact(
        { version: 1, projectId, facts: [], updatedAt: new Date().toISOString() },
        'customer',
        correctedCustomer,
        'user_turn',
      ),
      projectId,
    );

    const snapshot = buildWorkspacePersistedSnapshot(projectId);
    expect(snapshot.domain?.customer).toBe(correctedCustomer);
    expect(snapshot.entities?.customer.value).toBe(correctedCustomer);
    expect(snapshot.conversationMemory?.facts.some((f) => f.value === correctedCustomer)).toBe(
      true,
    );

    clearProjectCache(projectId);

    applyWorkspaceSnapshotToCache(projectId, snapshot);

    expect(loadWorkspaceDomain(projectId)?.customer).toBe(correctedCustomer);
    expect(loadWorkspaceEntities(projectId)?.customer.value).toBe(correctedCustomer);
    expect(loadConversationMemory(projectId).facts.some((f) => f.value === correctedCustomer)).toBe(
      true,
    );
  });

  it('negative — project B does not inherit project A correction', () => {
    const projectA = 'project-a';
    const projectB = 'project-b';
    const correctedCustomer = '영세 양조장';

    saveWorkspaceDomain(sampleDomain(correctedCustomer), projectA);
    saveWorkspaceEntities(sampleEntities(correctedCustomer), projectA);
    saveConversationMemory(
      upsertConfirmedFact(
        { version: 1, projectId: projectA, facts: [], updatedAt: new Date().toISOString() },
        'customer',
        correctedCustomer,
        'user_turn',
      ),
      projectA,
    );

    const snapshotA = buildWorkspacePersistedSnapshot(projectA);
    clearProjectCache(projectA);
    applyWorkspaceSnapshotToCache(projectA, snapshotA);

    const snapshotB = buildWorkspacePersistedSnapshot(projectB);
    applyWorkspaceSnapshotToCache(projectB, snapshotB);

    expect(loadWorkspaceDomain(projectB)?.customer).not.toBe(correctedCustomer);
    expect(loadWorkspaceEntities(projectB)?.customer.value).not.toBe(correctedCustomer);
    expect(
      loadConversationMemory(projectB).facts.some((f) => f.value === correctedCustomer),
    ).toBe(false);

    expect(loadWorkspaceDomain(projectA)?.customer).toBe(correctedCustomer);
  });

  it('parseWorkspacePersistedSnapshot includes domain, entities, conversationMemory', () => {
    const project: StartupProject = {
      id: 'proj-parse',
      userId: 'user-1',
      name: 'Test',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      onboardingContext: {
        v2Workspace: {
          updatedAt: '2026-09-08T00:00:00.000Z',
          domain: sampleDomain('영세 양조장'),
          entities: sampleEntities('영세 양조장'),
          conversationMemory: {
            version: 1,
            projectId: 'proj-parse',
            facts: [
              {
                key: 'customer',
                value: '영세 양조장',
                source: 'user_turn',
                confirmedAt: '2026-09-08T00:00:00.000Z',
                lifecycle: 'current',
              },
            ],
            updatedAt: '2026-09-08T00:00:00.000Z',
          },
        },
      },
    };

    const parsed = parseWorkspacePersistedSnapshot(project);
    expect(parsed?.domain?.customer).toBe('영세 양조장');
    expect(parsed?.entities?.customer.value).toBe('영세 양조장');
    expect(parsed?.conversationMemory?.facts[0]?.value).toBe('영세 양조장');
  });

  it('clearConversationMemory isolates project scope', () => {
    const projectA = 'project-a';
    saveConversationMemory(
      upsertConfirmedFact(
        { version: 1, projectId: projectA, facts: [], updatedAt: new Date().toISOString() },
        'customer',
        '영세 양조장',
        'user_turn',
      ),
      projectA,
    );

    clearConversationMemory(projectA);
    expect(loadConversationMemory(projectA).facts).toHaveLength(0);
  });
});
