import { expect, test } from '@playwright/test';

test.describe('Launch smoke (Sprint L2.5)', () => {
  test('landing loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('demo enter redirects to dashboard', async ({ page }) => {
    const response = await page.goto('/demo/enter');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('locale cookie switches to English', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'NEXT_LOCALE',
        value: 'en',
        domain: new URL(page.url() || 'http://localhost:3000').hostname,
        path: '/',
      },
    ]);
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/Strategy|Start free|LaunchLens/i);
  });
});
