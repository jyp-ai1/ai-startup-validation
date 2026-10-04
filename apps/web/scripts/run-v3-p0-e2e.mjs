#!/usr/bin/env node
/**
 * V3 P0 E2E runner.
 *
 * Playwright's webServer child hits EvalError
 * "Code generation from strings disallowed for this context" in middleware.js
 * in this environment. That is a harness race — not a product 500.
 * Start or reuse `next start` here, then skip Playwright webServer.
 */
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PREFERRED = Number(process.env.PLAYWRIGHT_E2E_PORT ?? 3199);
const HOST = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
// Next's intl/middleware proxies to localhost. Binding only 127.0.0.1
// makes that proxy ECONNRESET — a harness 500, not a product 500.
const MAX_TRIES = 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, HOST);
  });
}

async function findFreePort(start) {
  for (let offset = 0; offset < MAX_TRIES; offset += 1) {
    const port = start + offset;
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port in ${start}..${start + MAX_TRIES - 1} on ${HOST}`);
}

async function isHealthy(port) {
  try {
    const res = await fetch(`http://${HOST}:${port}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const v3Env = {
  ...process.env,
  HOSTNAME: HOST,
  NODE_OPTIONS: '--max-old-space-size=6144',
  V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_AI_PM_FOCUSED_UI: process.env.NEXT_PUBLIC_AI_PM_FOCUSED_UI ?? 'false',
  AI_PM_FOCUSED_UI: process.env.AI_PM_FOCUSED_UI ?? 'false',
  AI_PM_JUDGMENT_POLICY_V1: process.env.AI_PM_JUDGMENT_POLICY_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_POLICY_V1:
    process.env.NEXT_PUBLIC_AI_PM_JUDGMENT_POLICY_V1 ?? 'true',
  AI_PM_ANSWER_FIRST_ROUTING_V1: process.env.AI_PM_ANSWER_FIRST_ROUTING_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1:
    process.env.NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1 ?? 'true',
  AI_PM_NO_ASK_POLICY_V1: process.env.AI_PM_NO_ASK_POLICY_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_NO_ASK_POLICY_V1:
    process.env.NEXT_PUBLIC_AI_PM_NO_ASK_POLICY_V1 ?? 'true',
  AI_PM_RESEARCH_UX_V1: process.env.AI_PM_RESEARCH_UX_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_RESEARCH_UX_V1: process.env.NEXT_PUBLIC_AI_PM_RESEARCH_UX_V1 ?? 'true',
  AI_PM_ANSWER_TARGET_BINDING_V1: process.env.AI_PM_ANSWER_TARGET_BINDING_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_TARGET_BINDING_V1:
    process.env.NEXT_PUBLIC_AI_PM_ANSWER_TARGET_BINDING_V1 ?? 'true',
  AI_PM_JUDGMENT_AGGREGATION_V1: process.env.AI_PM_JUDGMENT_AGGREGATION_V1 ?? 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1:
    process.env.NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1 ?? 'true',
};

// Do not reuse :3100 — that process booted before this SHA and can stay
// "healthy" while serving a stale workspace. Prefer a current-SHA server.
const reuseCandidates = [...new Set([PREFERRED, 3201, 3198])];
let port = 0;
for (const candidate of reuseCandidates) {
  if (await isHealthy(candidate)) {
    port = candidate;
    console.log(`[v3-p0-e2e] reuse healthy next on ${HOST}:${port}`);
    break;
  }
}

let serverChild = null;
if (!port) {
  port = (await isPortFree(PREFERRED)) ? PREFERRED : await findFreePort(PREFERRED + 1);
  console.log(`[v3-p0-e2e] starting next start on ${HOST}:${port} (outside Playwright)`);
  serverChild = spawn(
    'pnpm',
    ['exec', 'next', 'start', '--port', String(port)],
    {
      cwd: webDir,
      env: { ...v3Env, PORT: String(port) },
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
    },
  );
  if (!(await waitForHealth(port))) {
    serverChild.kill('SIGTERM');
    throw new Error(
      `[v3-p0-e2e] next start on ${port} never became healthy. ` +
        'Fresh next start in this VM hits middleware EvalError; reuse the environment production server.',
    );
  }
}

console.log(`[v3-p0-e2e] PLAYWRIGHT_E2E_PORT=${port} (${HOST}) skipWebServer=1`);

const extraArgs = process.argv.slice(2);
const defaultSpec = 'e2e/v3-p0-production-readiness.spec.ts';
const hasSpecArg = extraArgs.some((a) => a.endsWith('.spec.ts'));

const args = [
  'exec',
  'playwright',
  'test',
  ...(hasSpecArg ? [] : [defaultSpec]),
  '--config=playwright.v3-p0.config.ts',
  ...extraArgs,
];

const child = spawn('pnpm', args, {
  cwd: webDir,
  env: {
    ...process.env,
    PLAYWRIGHT_E2E_HOST: HOST,
    PLAYWRIGHT_E2E_PORT: String(port),
    PLAYWRIGHT_SKIP_WEBSERVER: '1',
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

function cleanup() {
  if (serverChild && !serverChild.killed) {
    serverChild.kill('SIGTERM');
  }
}

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 1);
});
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(143);
});
