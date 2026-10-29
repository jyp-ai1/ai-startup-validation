/**
 * One quality-2 / quality-3-draft compare on a Vercel Preview build.
 * Production builds return immediately. The product second-review route is not called.
 * The raw report is stored in a private Supabase bucket so this agent can read it
 * without printing credentials.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREVIEW_COMPARE_RUN_ID = 'q1-preview-brewery-2026-10-29';
export const PREVIEW_COMPARE_BUCKET = 'ai-pm-quality-compare';
export const PREVIEW_COMPARE_OBJECT = `${PREVIEW_COMPARE_RUN_ID}.json`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, '..');
const repoRoot = join(webRoot, '..', '..');
const evidencePath = join(repoRoot, 'docs/evidence/ALABOM/AI-PM/quality-2-3-compare.json');

export function shouldRunPreviewQualityCompare(env) {
  return env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF !== 'main';
}

export function redactComparePayload(value, secrets) {
  let text = JSON.stringify(value);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 8) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
  text = text.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]');
  return JSON.parse(text);
}

function safeLine(text) {
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}/g, '[redacted]');
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

function supabaseConfig(env) {
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key.trim()) return null;
  return { url, key };
}

async function storageFetch(config, path, init = {}) {
  const headers = {
    Authorization: `Bearer ${config.key}`,
    apikey: config.key,
    ...(init.headers ?? {}),
  };
  return fetch(`${config.url}/storage/v1${path}`, { ...init, headers });
}

async function ensureBucket(config) {
  const response = await storageFetch(config, '/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: PREVIEW_COMPARE_BUCKET, name: PREVIEW_COMPARE_BUCKET, public: false }),
  });
  if (response.ok) return;
  const body = await response.text();
  if (!body.includes('BucketAlreadyExists')) {
    throw new Error(`bucket_create_${response.status}`);
  }
}

async function readStored(config) {
  const response = await storageFetch(config, `/object/${PREVIEW_COMPARE_BUCKET}/${PREVIEW_COMPARE_OBJECT}`);
  if (!response.ok) return null;
  return response.json();
}

async function writeStored(config, payload) {
  const secrets = [config.key, process.env.GPT_API_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  const body = JSON.stringify(redactComparePayload(payload, secrets));
  const response = await storageFetch(config, `/object/${PREVIEW_COMPARE_BUCKET}/${PREVIEW_COMPARE_OBJECT}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body,
  });
  if (!response.ok) throw new Error(`object_write_${response.status}`);
}

function completed(stored) {
  return stored && ['RECORDED', 'NOT RUN', 'failed'].includes(stored.status);
}

async function main() {
  if (!shouldRunPreviewQualityCompare(process.env)) {
    console.log('preview-quality-compare skip');
    return;
  }
  const config = supabaseConfig(process.env);
  if (!config) {
    console.log('preview-quality-compare supabase=absent');
    return;
  }
  await ensureBucket(config);
  const existing = await readStored(config);
  if (completed(existing)) {
    console.log(`preview-quality-compare skip status=${existing.status}`);
    return;
  }
  if (existing?.status === 'started') {
    const ageMs = Date.now() - Date.parse(existing.startedAt ?? '');
    if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
      console.log('preview-quality-compare skip status=started');
      return;
    }
  }

  const startedAt = new Date().toISOString();
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    status: 'started',
    startedAt,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  });
  console.log(`preview-quality-compare start run=${PREVIEW_COMPARE_RUN_ID} gpt_key=${process.env.GPT_API_KEY?.trim() ? 'present' : 'absent'}`);

  rmSync(evidencePath, { force: true });
  const child = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', 'features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.live.test.ts'],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        AI_PM_COMPARE_LIVE: '1',
        AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS || '90000',
        CI: '1',
      },
      encoding: 'utf8',
      timeout: 240_000,
    },
  );
  if (child.stdout) process.stdout.write(safeLine(child.stdout));
  if (child.stderr) process.stderr.write(safeLine(child.stderr));

  let report = null;
  let error = null;
  if (child.error) error = safeLine(child.error.message);
  else if (!existsSync(evidencePath)) error = `evidence_file_missing exit=${child.status ?? 'null'}`;
  else {
    try {
      report = JSON.parse(readFileSync(evidencePath, 'utf8'));
    } catch {
      error = 'evidence_file_unreadable';
    }
  }
  if (report && report.productFollowUpInvoked !== false) error = 'product_follow_up_invoked';

  const status = error ? 'failed' : report.status;
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    error,
    productFollowUpInvoked: false,
    report,
  });
  console.log(`preview-quality-compare stored status=${status}`);
}

if (invokedDirectly()) {
  main().catch((error) => {
    console.log(`preview-quality-compare failed ${safeLine(error instanceof Error ? error.message : 'error')}`);
    process.exitCode = 0;
  });
}
