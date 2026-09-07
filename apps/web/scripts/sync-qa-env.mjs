#!/usr/bin/env node
/**
 * Sync QA Supabase env from process environment into apps/web/.env.local.
 * Never prints secret values. Used when Cursor environment secrets are injected.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(WEB_ROOT, '.env.local');

const KEYS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'QA_EMAIL',
];

function parseEnvFile(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

const existing = parseEnvFile(ENV_PATH);
let updated = 0;

for (const key of KEYS) {
  const fromEnv = process.env[key]?.trim();
  if (fromEnv && fromEnv.length > 0) {
    existing.set(key, fromEnv);
    updated += 1;
  }
}

const lines = [];
for (const [key, value] of existing.entries()) {
  lines.push(`${key}=${value}`);
}

writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, 'utf8');

const hasServiceRole = existing.has('SUPABASE_SERVICE_ROLE_KEY');
console.log(
  JSON.stringify({
    envPath: ENV_PATH,
    keysSyncedFromProcessEnv: updated,
    hasServiceRoleKey: hasServiceRole,
    readyForBrowserJourney: hasServiceRole,
  }),
);

process.exit(hasServiceRole ? 0 : 1);
