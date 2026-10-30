/**
 * One incremental-reflection call of the frozen product follow-up request.
 * The founder answer in the fixture is synthetic test data.
 * Production builds return immediately. The product second-review route is not called.
 * The reason-quality call q1-incremental-reflection-reason-quality-2026-10-30 stays RECORDED.
 * The normalize call q1-incremental-reflection-normalize-2026-10-30 stays RECORDED.
 * The question call q1-incremental-reflection-question-2026-10-29 stays RECORDED.
 * The link call q1-incremental-reflection-link-2026-10-29 stays RECORDED.
 * The element call q1-incremental-reflection-element-2026-10-29 stays RECORDED.
 * The preserve call q1-incremental-reflection-preserve-2026-10-29 stays RECORDED.
 * Earlier reflection objects stay under their own run ids.
 * Credentials are not written to the report or the log.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREVIEW_COMPARE_RUN_ID = 'q1-incremental-reflection-review-fields-2026-10-30';
export const PREVIEW_COMPARE_PRIOR_RUN_ID = 'q1-incremental-reflection-reason-quality-2026-10-30';
export const PREVIEW_COMPARE_BUCKET = 'ai-pm-quality-compare';
export const PREVIEW_COMPARE_OBJECT = `${PREVIEW_COMPARE_RUN_ID}.json`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(scriptDir, '..');
const fixturePath = join(webRoot, 'features/business-validation-journey/lib/incremental-reflection-review-fields-request.json');

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

const REVIEW_KEYS = [
  'inputConsidered',
  'impactAssessment',
  'sufficiencyAssessment',
  'retentionDecision',
  'holdReason',
  'evidenceNeeded',
];
const REVIEW_FIELDS = ['judgment', 'hypotheses', 'nextVerification', 'nextQuestion'];

function compactText(text) {
  return String(text ?? '').replace(/\s+/g, '').trim();
}

function genericHold(text) {
  const folded = compactText(text).replace(/[.]/g, '');
  if (['바꾸지않은이유', '새정보가없어유지', '이전과동일한상태', '이전과동일', '유지'].includes(folded)) return true;
  if (/충분하지|부족|확인된사실이아니|근거가아니|주장|계약서|증빙|예약|입금|인터뷰|기록/.test(folded)) return false;
  return /방향성|추가정보|동일한상태|미확인/.test(folded);
}

/** Repair trigger. The stored score still uses incrementalReflectionErrors. This does not write review sentences. */
export function reviewFieldGaps(raw, userPrompt) {
  let parsed;
  let sent;
  try {
    parsed = JSON.parse(raw);
    sent = JSON.parse(userPrompt);
  } catch {
    return ['follow_up_output_unparsed'];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return ['follow_up_output_unparsed'];
  const supplement = typeof sent.founderSupplement === 'string' ? sent.founderSupplement : '';
  const choice = sent.founderChoice && typeof sent.founderChoice.label === 'string' ? sent.founderChoice.label : '';
  const errors = [];
  const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
  for (const field of REVIEW_FIELDS) {
    const change = changes.find((item) => item && item.field === field);
    if (!change || typeof change !== 'object') {
      errors.push(`follow_up_output_missing_change:${field}`);
      continue;
    }
    for (const key of REVIEW_KEYS) {
      if (typeof change[key] !== 'string' || !change[key].trim()) errors.push(`review_field_missing:${key}:${field}`);
    }
    const decision = typeof change.decision === 'string' ? change.decision.trim() : '';
    const retention = typeof change.retentionDecision === 'string' ? change.retentionDecision.trim() : '';
    if (retention && decision && retention !== decision) errors.push(`retention_decision_mismatch:${field}`);
    if (field !== 'judgment' && field !== 'hypotheses') continue;
    const held = decision === 'retained' || decision === 'unresolved';
    const reason = typeof change.reason === 'string' ? change.reason.trim() : '';
    if (held && reason && !/충분하지|바꾸지 않|확인된 사실이 아니|근거가 아니|부족|확정하지/.test(reason)) {
      errors.push(`reason_insufficient:${field}`);
    }
    if (held && typeof change.holdReason === 'string' && change.holdReason.trim() && genericHold(change.holdReason)) {
      errors.push(`review_hold_generic:holdReason:${field}`);
    }
    if (held && change.sufficiencyAssessment === 'sufficient') errors.push(`sufficiency_conflict:${field}`);
    const evidence = typeof change.evidenceNeeded === 'string' ? change.evidenceNeeded : '';
    if (held && evidence.trim() && !/계약서|증빙|예약|입금|확인|인터뷰|기록/.test(evidence)) {
      errors.push(`retention_evidence_missing:${field}`);
    }
    const input = typeof change.inputConsidered === 'string' ? change.inputConsidered : '';
    if (held && input.trim()) {
      const markers = ['예약 고객', '예약', '가격', '계약', '확정된 양조장', '양조장'].filter(
        (marker) => supplement.includes('없') && supplement.includes(marker),
      );
      const cites =
        (choice.length >= 4 && input.includes(choice)) ||
        (supplement.length >= 8 && input.includes(supplement.slice(0, 8))) ||
        markers.some((marker) => input.includes(marker));
      if (!cites || (markers.length > 0 && !markers.some((marker) => input.includes(marker)))) {
        errors.push(`retention_input_missing:${field}`);
      }
    }
    const assertsClaim = /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(supplement);
    const promoted = (text) =>
      assertsClaim &&
      /확정되었|확정했다|계약을 맺|계약했다|확보했다|확보되었/.test(text) &&
      !/주장|확인된 사실이 아니|증빙이 없|증빙은 없|계약서는 없|검증되지|미확인/.test(text);
    if (promoted(input) || promoted(change.impactAssessment || '') || promoted(change.holdReason || '')) {
      errors.push(`claim_promoted_to_fact:${field}`);
    }
  }
  return [...new Set(errors)];
}

export function repairMessage(errors) {
  return [
    '이전 JSON은 저장되지 않았다.',
    `실패 코드: ${errors.join(',')}.`,
    'judgment와 hypotheses의 inputConsidered, impactAssessment, sufficiencyAssessment, retentionDecision, holdReason, evidenceNeeded를 입력에 이미 있는 창업자 답변으로 다시 적어라.',
    '없는 계약, 예약, 확정 사실을 만들지 마라. 확정 주장을 확인된 사실로 쓰지 마라.',
    'retentionDecision은 decision과 같아야 한다. retained 또는 unresolved의 sufficiencyAssessment는 sufficient가 아니다.',
    'holdReason에 방향성만 적거나 추가 정보가 필요하다만 쓰지 마라.',
    '같은 스키마의 JSON만 반환하라.',
  ].join(' ');
}

function responseFormatBody(request) {
  const format = request.responseFormat;
  if (format?.type === 'json_schema' && format.schema && typeof format.schema === 'object') {
    const { title, ...schema } = format.schema;
    const name = typeof title === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(title) ? title : 'structured_output';
    return { type: 'json_schema', json_schema: { name, strict: true, schema } };
  }
  return { type: 'json_object' };
}

function measuredUsage(calls) {
  if (calls.length === 0 || calls.some((call) => call.usageKnown !== true || typeof call.totalTokens !== 'number')) return null;
  return {
    promptTokens: calls.reduce((sum, call) => sum + call.promptTokens, 0),
    completionTokens: calls.reduce((sum, call) => sum + call.completionTokens, 0),
    totalTokens: calls.reduce((sum, call) => sum + call.totalTokens, 0),
  };
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
        response_format: responseFormatBody(request),
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
    const first = await oneCall(apiKey, item.promptVersion, item.request);
    first.reviewGaps = first.raw ? reviewFieldGaps(first.raw, first.userPrompt) : [];
    calls.push(first);
    if (first.raw && first.reviewGaps.length > 0) {
      const repairRequest = {
        ...item.request,
        messages: [
          ...item.request.messages,
          { role: 'assistant', content: first.raw },
          { role: 'user', content: repairMessage(first.reviewGaps) },
        ],
      };
      const repair = await oneCall(apiKey, `${item.promptVersion}:repair`, repairRequest);
      repair.reviewGaps = repair.raw ? reviewFieldGaps(repair.raw, first.userPrompt) : [];
      repair.repairPrompt = repairMessage(first.reviewGaps);
      calls.push(repair);
    }
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
    responseFormat: request.responseFormat?.type ?? 'json_object',
    repairCount: Math.max(0, calls.filter((call) => call.promptVersion?.endsWith(':repair')).length),
    usage: measuredUsage(calls.filter((call) => call.status !== 'not_run')),
    businessInput: fixture.businessInput,
    confounders: fixture.confounders,
    report: {
      status,
      reason: apiKey ? null : 'GPT_API_KEY missing',
      model: request.model ?? 'gpt-4o-mini',
      temperature: request.temperature ?? 0.2,
      maxTokens,
      responseFormat: request.responseFormat?.type ?? 'json_object',
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
