'use client';

import { useCallback, useRef, useState } from 'react';

/** Prevents double-submit on forms and CTAs (Epic 1.6). */
export function useSubmitLock(cooldownMs = 800) {
  const [locked, setLocked] = useState(false);
  const untilRef = useRef(0);

  const lock = useCallback(() => {
    setLocked(true);
    untilRef.current = Date.now() + cooldownMs;
    window.setTimeout(() => {
      if (Date.now() >= untilRef.current) {
        setLocked(false);
      }
    }, cooldownMs);
  }, [cooldownMs]);

  const runLocked = useCallback(
    (fn: () => void) => {
      if (locked || Date.now() < untilRef.current) return;
      lock();
      fn();
    },
    [lock, locked],
  );

  const resetLock = useCallback(() => {
    setLocked(false);
    untilRef.current = 0;
  }, []);

  return { locked, lock, runLocked, resetLock };
}
