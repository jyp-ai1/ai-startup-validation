/**
 * One incremental-reflection call of the frozen product follow-up request.
 * The founder answer in the fixture is synthetic test data.
 * Production builds return immediately. The product second-review route is not called.
 * The earlier structure object stays stored under its own run id and is not read or rewritten.
 * Credentials are not written to the report or the log.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREVIEW_COMPARE_RUN_ID = 'q1-incremental-reflection-2026-10-29';
export const PREVIEW_COMPARE_PRIOR_RUN_ID = 'q1-incremental-structure-2026-10-29';
export const PREVIEW_COMPARE_BUCKET = 'ai-pm-quality-compare';
export const PREVIEW_COMPARE_OBJECT = `${PREVIEW_COMPARE_RUN_ID}.json`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, '..');
const fixturePath = join(webRoot, 'features/business-validation-journey/lib/incremental-reflection-request.json');

export function shouldRunPreviewQualityCompare(env) {
  return env.VERCEL_ENV === 'preview' && Boolean(env.VERCEL_GIT_COMMIT_REF) && env.VERCEL_GIT_COMMIT_REF !== 'main';
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
  if (!body.includes('BucketAlreadyExists')) throw new Error(`bucket_create_${response.status}`);
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
  return stored && (stored.status === 'RECORDED' || stored.status === 'failed');
}

function messageContent(request, role) {
  return request.messages.find((message) => message.role === role)?.content ?? '';
}

function jsonObject(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

async function oneCall(apiKey, promptVersion, request) {
  const prompts = {
    systemPrompt: messageContent(request, 'system'),
    userPrompt: messageContent(request, 'user'),
  };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const requestId = response.headers.get('x-request-id');
    const body = await response.text();
    if (!response.ok) {
      return {
        promptVersion,
        status: 'failed',
        completionId: null,
        requestId,
        model: request.model,
        finishReason: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        usageKnown: false,
        jsonParsed: false,
        error: safeLine(body).slice(0, 300),
        ...prompts,
        raw: null,
      };
    }
    const data = JSON.parse(body);
    const raw = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage ?? {};
    return {
      promptVersion,
      status: raw.trim() ? 'succeeded' : 'failed',
      completionId: data.id ?? null,
      requestId,
      model: data.model ?? request.model,
      finishReason: data.choices?.[0]?.finish_reason ?? null,
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      usageKnown: typeof usage.total_tokens === 'number',
      jsonParsed: jsonObject(raw),
      error: raw.trim() ? null : 'empty_response',
      ...prompts,
      raw,
    };
  } catch (error) {
    return {
      promptVersion,
      status: 'failed',
      completionId: null,
      requestId: null,
      model: request.model,
      finishReason: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      usageKnown: false,
      jsonParsed: false,
      error: safeLine(error instanceof Error ? error.message : 'model_error').slice(0, 300),
      ...prompts,
      raw: null,
    };
  }
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
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const request = fixture.requests?.[0]?.request;
  if (!request?.messages || !Array.isArray(fixture.requests)) {
    throw new Error('reflection_fixture_invalid');
  }
  const apiKey = process.env.GPT_API_KEY?.trim() || '';
  console.log(`preview-quality-compare start run=${PREVIEW_COMPARE_RUN_ID} gpt_key=${apiKey ? 'present' : 'absent'}`);
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    priorRunId: PREVIEW_COMPARE_PRIOR_RUN_ID,
    status: 'started',
    startedAt,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  });

  const calls = [];
  for (const item of fixture.requests) {
    if (!apiKey) {
      calls.push({
        promptVersion: item.promptVersion,
        status: 'not_run',
        completionId: null,
        requestId: null,
        model: null,
        finishReason: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        usageKnown: false,
        jsonParsed: null,
        error: null,
        systemPrompt: messageContent(item.request, 'system'),
        userPrompt: messageContent(item.request, 'user'),
        raw: null,
      });
      continue;
    }
    calls.push(await oneCall(apiKey, item.promptVersion, item.request));
  }

  const status = apiKey ? 'RECORDED' : 'NOT RUN';
  const maxTokens = request.maxTokens ?? null;
  await writeStored(config, {
    runId: PREVIEW_COMPARE_RUN_ID,
    priorRunId: PREVIEW_COMPARE_PRIOR_RUN_ID,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    error: apiKey ? null : 'GPT_API_KEY missing',
    productFollowUpInvoked: false,
    reflectionScored: false,
    model: request.model ?? 'gpt-4o-mini',
    temperature: request.temperature ?? 0.2,
    maxTokens,
    responseFormat: 'json_object',
    businessInput: fixture.businessInput,
    confounders: fixture.confounders,
    report: {
      status,
      reason: apiKey ? null : 'GPT_API_KEY missing',
      model: request.model ?? 'gpt-4o-mini',
      temperature: request.temperature ?? 0.2,
      maxTokens,
      responseFormat: 'json_object',
      businessInput: fixture.businessInput,
      confounders: fixture.confounders,
      productFollowUpInvoked: false,
      reflectionScored: false,
      calls,
    },
  });
  console.log(`preview-quality-compare stored status=${status}`);
}

if (invokedDirectly()) {
  main().catch((error) => {
    console.log(`preview-quality-compare failed ${safeLine(error instanceof Error ? error.message : 'error')}`);
  });
}
