/**
 * Automation platform entry for apps/web.
 * Long-running tasks must go through this platform — never execute directly in API routes.
 */
import { getAutomationPlatform } from '@repo/automation';

export const automation = getAutomationPlatform();

export { getAutomationPlatform };
