import { chromium } from '@playwright/test';

const base =
  process.env.PLAYWRIGHT_BASE_URL ||
  'https://ai-startup-validation-qhm5yfd4y-jyp-ai1s-projects.vercel.app';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/ko/workspace?demo=guided&fresh=1&forceReviewError=1`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(3000);
const body = await page.locator('body').innerText();
const html = await page.content();
const hasError = await page.getByTestId('review-start-error').count();
const hasRetry = await page.getByTestId('review-start-retry').count();
const url = page.url();
console.log(
  JSON.stringify(
    {
      url,
      hasError,
      hasRetry,
      bodySnippet: body.slice(0, 800),
      hasForceInHtml: html.includes('forceReviewError'),
      hasRetryInHtml: html.includes('review-start-retry'),
    },
    null,
    2,
  ),
);
await browser.close();
