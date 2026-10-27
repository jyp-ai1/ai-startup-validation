import { describe, expect, it } from 'vitest';

import {
  acceptFreeGeminiWebPaste,
  buildFreeGeminiFollowUp,
  FREE_GEMINI_WEB_PATH,
  loadFreeGeminiWebLog,
  saveFreeGeminiWebLog,
} from '../free-gemini-web';

const NOW = '2026-10-27T05:30:00.000Z';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('free Gemini web paste', () => {
  it('does not treat an empty paste as a stored original', () => {
    const result = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'r1',
        round: 1,
        business: '도시락 구독',
        content: '   ',
        now: NOW,
      },
    );
    expect(result.accepted).toBe(false);
    expect(result.record).toBeNull();
    expect(result.log.rounds).toHaveLength(0);
  });

  it('stores a user paste, reloads it, and keeps source URLs the person typed', () => {
    const storage = memory();
    const saved = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'r1',
        round: 1,
        business: '도시락 구독',
        customer: '직장인',
        problem: '점심 선택',
        content: 'FIXTURE-PASTE-NOT-A-GEMINI-ORIGINAL',
        sourceUrlText: 'https://example.com/source\n메모는 URL이 아니다',
        now: NOW,
      },
    );
    expect(saved.accepted).toBe(true);
    expect(saved.record?.apiCalled).toBe(false);
    expect(saved.record?.liveWebCapture).toBe(false);
    expect(saved.record?.webRoundtrip).toBe('NOT_RUN');
    expect(saved.record?.verifiedFact).toBe(false);
    expect(saved.record?.sourceUrls).toEqual(['https://example.com/source']);
    expect(saved.record?.sourceStatus).toBe('user_supplied');
    expect(saved.record?.prompt).toContain('도시락 구독');
    saveFreeGeminiWebLog(storage, saved.log);

    const reloaded = loadFreeGeminiWebLog(storage);
    expect(reloaded.rounds[0]?.content).toBe('FIXTURE-PASTE-NOT-A-GEMINI-ORIGINAL');
    expect(reloaded.rounds[0]?.sourceUrls).toEqual(['https://example.com/source']);
  });

  it('records absent sources when the person supplies no URL', () => {
    const saved = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'r1',
        round: 1,
        business: '도시락 구독',
        content: 'FIXTURE-PASTE-NOT-A-GEMINI-ORIGINAL',
        now: NOW,
      },
    );
    expect(saved.record?.sourceStatus).toBe('absent');
    expect(saved.record?.sourceUrls).toEqual([]);
  });

  it('builds a second prompt from the first original and stores the second paste separately', () => {
    const first = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'r1',
        round: 1,
        business: '도시락 구독',
        content: 'FIXTURE-ROUND-1',
        now: NOW,
      },
    );
    const followUp = buildFreeGeminiFollowUp({
      first: first.record!,
      feedback: '가격이 빠졌다',
    });
    expect(followUp).toContain('FIXTURE-ROUND-1');
    expect(followUp).toContain('가격이 빠졌다');
    const second = acceptFreeGeminiWebPaste(first.log, {
      executionId: 'r2',
      round: 2,
      business: '도시락 구독',
      content: 'FIXTURE-ROUND-2',
      feedback: '가격이 빠졌다',
      parentExecutionId: 'r1',
      now: '2026-10-27T05:31:00.000Z',
    });
    expect(second.accepted).toBe(true);
    expect(second.record?.content).toBe('FIXTURE-ROUND-2');
    expect(second.record?.parentExecutionId).toBe('r1');
    expect(second.record?.prompt).toContain('FIXTURE-ROUND-1');
    expect(first.log.rounds[0]?.content).toBe('FIXTURE-ROUND-1');
    expect(second.log.rounds.map((round) => round.content)).toEqual(['FIXTURE-ROUND-1', 'FIXTURE-ROUND-2']);
    const afterReload = acceptFreeGeminiWebPaste(first.log, {
      executionId: 'r2-reload',
      round: 2,
      business: '',
      content: 'FIXTURE-ROUND-2-AFTER-RELOAD',
      feedback: '가격이 빠졌다',
      parentExecutionId: 'r1',
      now: '2026-10-27T05:32:00.000Z',
    });
    expect(afterReload.accepted).toBe(true);
    expect(afterReload.record?.businessInput).toContain('도시락 구독');
  });

  it('does not make a second prompt when the first original is missing', () => {
    const result = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'r2',
        round: 2,
        business: '도시락 구독',
        content: 'FIXTURE-ROUND-2',
        feedback: '가격',
        parentExecutionId: 'missing',
        now: NOW,
      },
    );
    expect(result.accepted).toBe(false);
    expect(result.log.rounds).toHaveLength(0);
  });

  it('keeps the first paste when the same execution id is submitted again', () => {
    const first = acceptFreeGeminiWebPaste(
      { rounds: [] },
      {
        executionId: 'same',
        round: 1,
        business: '도시락 구독',
        content: 'FIXTURE-ROUND-1',
        now: NOW,
      },
    );
    const again = acceptFreeGeminiWebPaste(first.log, {
      executionId: 'same',
      round: 1,
      business: '다른 사업',
      content: 'FIXTURE-REPLACEMENT',
      now: NOW,
    });
    expect(again.accepted).toBe(false);
    expect(again.record?.content).toBe('FIXTURE-ROUND-1');
    expect(again.log.rounds).toHaveLength(1);
  });

  it('records that bookmarks and the extension do not return a Gemini web reply', () => {
    expect(FREE_GEMINI_WEB_PATH.selected).toBe('user_paste');
    expect(FREE_GEMINI_WEB_PATH.bookmarkReturnsReply).toBe(false);
    expect(FREE_GEMINI_WEB_PATH.extensionReturnsReply).toBe(false);
    expect(FREE_GEMINI_WEB_PATH.readsGeminiPage).toBe(false);
    expect(FREE_GEMINI_WEB_PATH.apiCalled).toBe(false);
    expect(FREE_GEMINI_WEB_PATH.liveWebCapture).toBe('NOT_RUN');
  });
});
