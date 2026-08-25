/**
 * Probe: can .qa-chrome-profile open Production as Auth?
 * Prints URL/title only — never cookies.
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const userDataDir = path.resolve('.qa-chrome-profile');
const out = {
  profileExists: fs.existsSync(userDataDir),
  url: null,
  title: null,
  onLogin: null,
  error: null,
};

try {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://ai-startup-validation-tau.vercel.app/ko/workspace', {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  });
  await page.waitForTimeout(3_000);
  out.url = page.url();
  out.title = await page.title();
  out.onLogin = /\/auth\/login/i.test(out.url);
  await context.close();
} catch (e) {
  out.error = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify(out, null, 2));
