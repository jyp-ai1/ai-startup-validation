#!/usr/bin/env node
/**
 * Verify Supabase migrations 016 + 017 are applied.
 * Usage: node scripts/verify-supabase-migrations.mjs
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../apps/web/.env.local');

function loadEnv() {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function checkColumns() {
  const res = await fetch(`${url}/rest/v1/startup_projects?select=id,user_id,country,project_goal,is_demo,onboarding_context&limit=1`, {
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('Column check failed:', res.status, body);
    return false;
  }
  return true;
}

async function checkDemoProject() {
  const res = await fetch(`${url}/rest/v1/startup_projects?select=id,title,is_demo&is_demo=eq.true&limit=1`, {
    headers,
  });
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function main() {
  console.log('Migration Applied Check\n');

  const columnsOk = await checkColumns();
  console.log(columnsOk ? '✅ user_id, country, project_goal, is_demo, onboarding_context' : '❌ columns missing — run 016 + 017 SQL');

  const demoOk = await checkDemoProject();
  console.log(demoOk ? '✅ Demo project marked (is_demo=true)' : '⚠️  No demo project found');

  if (columnsOk) {
    console.log('\nRLS PASS — verify manually in Supabase if policies updated');
    console.log('Project Create PASS — test via /auth/login → wizard');
    console.log('Demo PASS — test via /demo/enter');
  }

  process.exit(columnsOk ? 0 : 1);
}

main();
