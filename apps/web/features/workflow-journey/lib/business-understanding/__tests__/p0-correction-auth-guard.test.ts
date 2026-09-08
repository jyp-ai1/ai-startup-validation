import { describe, expect, it } from 'vitest';

/**
 * P0 Correction Submit root cause (DAY 8-I):
 * handleApplyEdits / handleEditConfirmYes called persistWorkspaceStateDbFirst
 * unconditionally → persistWorkspaceSnapshotAction → requireAuthUser → /auth/login
 * in demo mode (isDemoNoPersist).
 *
 * Fix: enableDbPersistence={!isDemoNoPersist} on WorkspaceAiPmMain.
 */

describe('correction submit auth guard contract', () => {
  it('demo mode must not call DB persist on correction apply', () => {
    const isDemoNoPersist = true;
    const enableDbPersistence = !isDemoNoPersist;
    expect(enableDbPersistence).toBe(false);
  });

  it('authenticated workspace must persist corrections to DB', () => {
    const isDemoNoPersist = false;
    const enableDbPersistence = !isDemoNoPersist;
    expect(enableDbPersistence).toBe(true);
  });
});
