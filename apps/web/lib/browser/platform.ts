/**
 * Browser platform entry for apps/web (server-only).
 * Never import Playwright directly — use @repo/browser.
 */
import { getBrowserPlatform } from '@repo/browser';

export const browser = getBrowserPlatform();

export { getBrowserPlatform };
