import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@repo/db', () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/db/platform', () => ({
  getStartupProjectRepository: vi.fn(),
}));

import { isSupabaseConfigured } from '@repo/db';
import { getStartupProjectRepository } from '@/lib/db/platform';
import { listDemoProjects } from '@/features/projects/services/project-service';

describe('listDemoProjects — demo workspace resilience', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty when Supabase fetch fails (no throw to workspace page)', async () => {
    const findAll = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.mocked(getStartupProjectRepository).mockReturnValue({ findAll } as never);

    await expect(listDemoProjects()).resolves.toEqual([]);
    expect(findAll).toHaveBeenCalledTimes(2);
  });

  it('returns empty when Supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValueOnce(false);
    await expect(listDemoProjects()).resolves.toEqual([]);
  });
});
