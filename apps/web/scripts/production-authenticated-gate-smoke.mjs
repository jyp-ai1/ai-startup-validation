/**
 * LS-1 — Production authenticated gate smoke (unauthenticated path only).
 * Full journey requires CTO Google profile (.qa-chrome-profile) via production-flow-qa.mjs.
 */
import { chromium } from '@playwright/test';

const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${PRODUCTION_URL}/workspace`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const url = page.url();
    const onAuth = /\/auth\/login/.test(url);
    if (!onAuth) {
      console.error('Expected redirect to login for unauthenticated /workspace');
      process.exit(1);
    }
    console.log(JSON.stringify({ pass: true, landed: url }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
