#!/usr/bin/env node
/**
 * PR8.5-INFRA-UNBLOCK — pick a free port, export PLAYWRIGHT_E2E_PORT, run Playwright.
 * Keeps webServer listen port and baseURL in sync (avoids 3000→3001 drift).
 */
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PREFERRED = Number(process.env.PLAYWRIGHT_E2E_PORT ?? 3199);
const HOST = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
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

const port = await findFreePort(PREFERRED);
const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log(`[v3-p0-e2e] PLAYWRIGHT_E2E_PORT=${port} (${HOST})`);

const env = {
  ...process.env,
  PLAYWRIGHT_E2E_HOST: HOST,
  PLAYWRIGHT_E2E_PORT: String(port),
};

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
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 1));
