/**
 * PR8.5-INFRA-UNBLOCK — verifies webServer port + baseURL alignment only.
 */
import { expect, test } from '@playwright/test';

test.describe('PR8.5 — V3 P0 infra smoke', () => {
  test('health endpoint responds on configured baseURL', async ({ page, baseURL }) => {
    const response = await page.goto('/health');
    expect(response?.ok()).toBe(true);
    const body = await response!.json();
    expect(body.data?.status).toBe('ok');
    expect(baseURL).toMatch(/127\.0\.0\.1:\d+/);
    expect(baseURL).not.toMatch(/:3000$/);
  });
});
