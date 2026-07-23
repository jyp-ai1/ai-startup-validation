import type { WatchListItem, WatchNotification, WatchType } from '../types';

export type WatchSignal = {
  id: string;
  watchType: WatchType;
  label: string;
  titleKey: string;
  summaryKey: string;
  priority: WatchNotification['priority'];
  category: WatchNotification['category'];
  href?: string;
};

export type WatchProvider = {
  id: 'mock' | 'rss' | 'browser_agent' | 'mcp' | 'llm';
  fetchSignals(watchlist: WatchListItem[], projectId: string): Promise<WatchSignal[]>;
};

export class MockWatchProvider implements WatchProvider {
  readonly id = 'mock' as const;

  async fetchSignals(watchlist: WatchListItem[], projectId: string): Promise<WatchSignal[]> {
    const signals: WatchSignal[] = [];
    const now = Date.now();

    for (const item of watchlist) {
      if (item.watchType === 'MARKET') {
        signals.push({
          id: `mock-market-${item.id}`,
          watchType: 'MARKET',
          label: item.label,
          titleKey: 'signals.marketUpdate.title',
          summaryKey: 'signals.marketUpdate.summary',
          priority: 'INFO',
          category: 'MARKET',
          href: `/projects/${projectId}/market`,
        });
      }
      if (item.watchType === 'COMPETITOR') {
        signals.push({
          id: `mock-competitor-${item.id}`,
          watchType: 'COMPETITOR',
          label: item.label,
          titleKey: 'signals.competitorUpdate.title',
          summaryKey: 'signals.competitorUpdate.summary',
          priority: 'WARNING',
          category: 'COMPETITOR',
          href: `/projects/${projectId}/competitors`,
        });
      }
      if (item.watchType === 'GOVERNMENT') {
        signals.push({
          id: `mock-government-${item.id}`,
          watchType: 'GOVERNMENT',
          label: item.label,
          titleKey: 'signals.governmentUpdate.title',
          summaryKey: 'signals.governmentUpdate.summary',
          priority: 'CRITICAL',
          category: 'GOVERNMENT',
          href: `/projects/${projectId}/government`,
        });
      }
    }

    if (signals.length === 0) {
      return signals;
    }

    return signals.map((signal, index) => ({
      ...signal,
      id: `${signal.id}-${now - index * 3600_000}`,
    }));
  }
}

export function getWatchProvider(): WatchProvider {
  return new MockWatchProvider();
}
