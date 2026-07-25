'use client';

import { useCallback, useEffect, useState } from 'react';

import { appToast } from '@repo/ui';

import {
  appendJourneyHistory,
  getJourneyHistory,
  restoreJourneyHistory,
  softDeleteJourneyHistory,
  type JourneyHistoryCategory,
  type JourneyHistoryEntry,
} from '../lib/journey-history-store';

export function useJourneyHistory(projectId: string) {
  const [entries, setEntries] = useState<JourneyHistoryEntry[]>([]);

  const refresh = useCallback(() => {
    setEntries(getJourneyHistory(projectId));
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const append = useCallback(
    (
      entry: Omit<JourneyHistoryEntry, 'id' | 'occurredAt' | 'deletedAt'> & {
        id?: string;
        occurredAt?: string;
      },
    ) => {
      appendJourneyHistory(projectId, entry);
      refresh();
    },
    [projectId, refresh],
  );

  const removeWithUndo = useCallback(
    (entryId: string, title: string) => {
      softDeleteJourneyHistory(projectId, entryId);
      refresh();
      appToast.undo(title, () => {
        restoreJourneyHistory(projectId, entryId);
        refresh();
      });
    },
    [projectId, refresh],
  );

  const restore = useCallback(
    (entryId: string) => {
      restoreJourneyHistory(projectId, entryId);
      refresh();
    },
    [projectId, refresh],
  );

  return { entries, append, removeWithUndo, restore, refresh };
}

export type { JourneyHistoryCategory, JourneyHistoryEntry };
