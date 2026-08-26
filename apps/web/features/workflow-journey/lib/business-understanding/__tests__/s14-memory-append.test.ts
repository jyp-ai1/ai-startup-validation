/**
 * S14 Memory Append Acceptance — proves per-key upsert, not wipe; Facts accumulate.
 */
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { emptyConversationMemory, upsertConfirmedFact } from '../conversation-memory';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { deriveEvidenceStatusFromMemory } from '../evidence-status';

describe('S14 Memory Append contract', () => {
  it('accumulates Facts across keys; same key updates without wiping others', () => {
    let memory = emptyConversationMemory('s14-append');
    const currentTrail = () =>
      memory.facts
        .filter((f) => (f.lifecycle ?? 'current') === 'current')
        .map((f) => `${f.key}:${f.value}`)
        .sort();
    const trail: string[][] = [];

    trail.push(currentTrail());

    memory = upsertConfirmedFact(memory, 'business', '병원 AI', 'document');
    trail.push(currentTrail());

    memory = upsertConfirmedFact(memory, 'customer', '병원 원장', 'user_turn');
    trail.push(currentTrail());

    memory = upsertConfirmedFact(memory, 'problem', '재방문 관리 부담', 'user_turn');
    trail.push(currentTrail());

    // same key update — must not drop other Facts; prior becomes superseded
    memory = upsertConfirmedFact(memory, 'customer', '병원 원장(갱신)', 'user_turn');
    trail.push(currentTrail());

    expect(trail[0]).toEqual([]);
    expect(trail[1]).toEqual(['business:병원 AI']);
    expect(trail[2]).toEqual(['business:병원 AI', 'customer:병원 원장']);
    expect(trail[3]).toEqual([
      'business:병원 AI',
      'customer:병원 원장',
      'problem:재방문 관리 부담',
    ]);
    expect(trail[4]).toEqual([
      'business:병원 AI',
      'customer:병원 원장(갱신)',
      'problem:재방문 관리 부담',
    ]);
    expect(memory.facts.filter((f) => (f.lifecycle ?? 'current') === 'current')).toHaveLength(3);
    expect(memory.facts.some((f) => f.key === 'customer' && f.lifecycle === 'superseded')).toBe(true);

    const outDir = join(process.cwd(), '../../docs/evidence/S14');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, '06-memory-append.json'),
      JSON.stringify(
        {
          semantics: 'per-key upsert; other Facts preserved; prior current → superseded (v3)',
          not: 'full Memory wipe on each answer',
          trail,
        },
        null,
        2,
      ) + '\n',
    );
  });

  it('Loop turns rebuild Memory with accumulating Evidence Status', () => {
    const doc = '# 병원 AI\n고객 미정';
    const t1 = buildConversationMemoryFromSources({
      projectId: 's14',
      documentText: doc,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '병원 원장',
          appliedAt: new Date().toISOString(),
        },
      ],
    });
    const e1 = deriveEvidenceStatusFromMemory({ memory: t1 });
    expect(e1.customer).toBe('confirmed');
    expect(e1.payer).toBe('confirmed');
    expect(e1.problem).toBe('unknown');

    const t2 = buildConversationMemoryFromSources({
      projectId: 's14',
      documentText: doc,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '병원 원장',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'problem_definition',
          answer: '재방문 관리 부담',
          appliedAt: new Date().toISOString(),
        },
      ],
      previous: t1,
    });
    const e2 = deriveEvidenceStatusFromMemory({ memory: t2 });
    expect(e2.customer).toBe('confirmed');
    expect(e2.problem).toBe('confirmed');
    expect(t2.facts.filter((f) => f.key === 'customer').length).toBe(1);
    expect(t2.facts.some((f) => f.key === 'problem')).toBe(true);
  });
});
