/**
 * Free-path probe for the 주인집 calibration note.
 *
 * Sends the business text only to Pollinations, which documents an anonymous
 * text API. Gemini API and OpenRouter receive a one-word ping when no key is
 * present, so a rejected call does not upload the business note.
 * Does not open gemini.google.com.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = new URL('./juinjip-2026-10-27.json', import.meta.url);
const GAP_MS = 32_000;
const CALL_TIMEOUT_MS = 70_000;

export const JUINJIP_INPUT = `주인집은 영세 전통주 양조장의 온라인 마케팅을 연결하는 사업이다.

영세한 양조장들이 온라인 마케팅을 잘 못하고 있어서, 양조장을 온라인 시장에 홍보하고 지역경제를 활성화하는 모델입니다.

타깃은 MZ 관광객과 FIT 개별 여행객으로 보고 있다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 본다.

아직 앱이나 서비스는 출시되지 않았고, 매출은 없다.
MZ와 FIT가 실제로 이 서비스를 원하는지는 조사되지 않았다.
양조장 대표가 마케팅비를 낼 의향인지도 확인되지 않았다.

경쟁 대안으로는 각 양조장이 직접 인스타그램·네이버에 올리는 방식과 지역 관광 안내소가 있다.`;

const ROUND2_ANSWER =
  '양조장 대표에게 마케팅비를 낼 의향이 있는지 아직 묻지 않았다. 이 답은 입력에 이미 있는 "확인되지 않았다"와 같다. 새 인터뷰가 아니다.';

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function clip(text, max = 2000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[clipped ${text.length - max} chars]`;
}

function headerPick(headers) {
  const keep = ['date', 'content-type', 'retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'];
  const out = {};
  for (const name of keep) {
    const value = headers.get(name);
    if (value) out[name] = value;
  }
  return out;
}

async function request(url, options, timeoutMs = CALL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    return {
      startedAt,
      elapsedMs: Date.now() - t0,
      http: response.status,
      headers: headerPick(response.headers),
      raw,
      error: null,
    };
  } catch (caught) {
    return {
      startedAt,
      elapsedMs: Date.now() - t0,
      http: null,
      headers: {},
      raw: '',
      error: String(caught),
    };
  } finally {
    clearTimeout(timer);
  }
}

function reviewPrompt(extra) {
  return [
    '당신은 사업성 검토자다. 아래 입력에 적힌 문장만 다룬다.',
    '가격, 고객 수, 매출, 손실액이 입력에 없으면 숫자를 만들지 않는다.',
    '확인하지 않은 것은 확인하지 않았다고 적는다.',
    '웹에서 가져온 주소가 없으면 sources는 빈 배열로 둔다. 없는 URL을 만들지 않는다.',
    '',
    '입력:',
    JUINJIP_INPUT,
    '',
    extra ?? '',
    '',
    'JSON만 반환한다.',
    '{"understanding":"","judgment":"","risks":[],"questions":[],"sources":[{"title":"","url":""}]}',
    'understanding은 누가 누구에게 무엇을 제공하는지 두 문장.',
    'judgment는 보류, 진행, 중단 중 하나와 이유 한 문장.',
    'risks는 이 사업에만 해당하는 위험 3개.',
    'questions는 지금 창업자에게 물어볼 질문 3개. 일반론을 쓰지 않는다.',
  ].join('\n');
}

export async function reloadRecord(fileUrl = OUT) {
  const record = JSON.parse(await readFile(fileUrl, 'utf8'));
  const rounds = record.pollinations?.rounds ?? [];
  const checks = rounds.map((round) => {
    const raw = round.response?.raw ?? '';
    return {
      name: round.name,
      http: round.response?.http ?? null,
      storedHash: round.response?.sha256 ?? null,
      recomputedHash: sha256(raw),
      hashMatch: round.response?.sha256 === sha256(raw),
      hasText: raw.length > 0 && round.response?.http === 200,
      chars: raw.length,
    };
  });
  return {
    id: record.id,
    checks,
    ok: checks.length > 0 && checks.every((item) => item.hashMatch),
  };
}

function freeModelIds(raw) {
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.data) ? parsed.data : [];
    return list
      .filter((model) => {
        const id = String(model?.id ?? '');
        const prompt = Number(model?.pricing?.prompt ?? 1);
        const completion = Number(model?.pricing?.completion ?? 1);
        return id.endsWith(':free') || id === 'openrouter/free' || (prompt === 0 && completion === 0);
      })
      .map((model) => String(model.id));
  } catch {
    return [];
  }
}

function pack(name, prompt, response, sentBusinessText) {
  const raw = response.http === 200 ? response.raw : clip(response.raw);
  return {
    name,
    sentBusinessText,
    prompt: sentBusinessText ? prompt : '(ping only; business text withheld)',
    response: {
      ...response,
      raw,
      sha256: sha256(raw),
    },
  };
}

async function appendDependentRounds(record) {
  await sleep(GAP_MS);
  const round1Prompt = reviewPrompt('이번이 1차 검토다.');
  const round1 = await request(
    'https://text.pollinations.ai/openai',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'user', content: round1Prompt }],
        stream: false,
      }),
    },
    110_000,
  );
  record.pollinations.rounds.push(pack('round-1-retry', round1Prompt, round1, true));
  if (round1.http !== 200 || !round1.raw) {
    return { round1Http: round1.http, round2Http: null, skippedRound2: true };
  }

  await sleep(GAP_MS);
  const round2Prompt = reviewPrompt(
    [
      '이번이 2차 검토다. 아래 1차 원문을 읽고 질문을 조정한다.',
      '1차 검토 원문:',
      round1.raw,
      '',
      `창업자 추가 답변: ${ROUND2_ANSWER}`,
      'questions는 1차 질문 중 이 답으로 닫힌 항목을 반복하지 않는다.',
    ].join('\n'),
  );
  const round2 = await request(
    'https://text.pollinations.ai/openai',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'user', content: round2Prompt }],
        stream: false,
      }),
    },
    110_000,
  );
  record.pollinations.rounds.push(pack('round-2-after-round-1', round2Prompt, round2, true));
  return { round1Http: round1.http, round2Http: round2.http, skippedRound2: false };
}

async function main() {
  if (process.argv.includes('--reload')) {
    const result = await reloadRecord();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (process.argv.includes('--continue')) {
    const record = JSON.parse(await readFile(OUT, 'utf8'));
    const models = await request('https://openrouter.ai/api/v1/models', { method: 'GET' });
    const ids = models.http === 200 ? freeModelIds(models.raw) : [];
    record.noKeyProbes.openrouterFreeModelCount = ids.length;
    record.noKeyProbes.openrouterFreeModelSample = ids.slice(0, 15);
    const continued = await appendDependentRounds(record);
    await writeFile(OUT, `${JSON.stringify(record, null, 2)}\n`);
    const reloaded = await reloadRecord();
    console.log(JSON.stringify({ continued, reload: reloaded }, null, 2));
    if (!reloaded.ok) process.exit(1);
    return;
  }

  const gemini = await request(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
    },
  );
  const openrouter = await request('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  const openrouterModels = await request('https://openrouter.ai/api/v1/models', { method: 'GET' });

  const round1Prompt = reviewPrompt('이번이 1차 검토다.');
  const round1 = await request('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [{ role: 'user', content: round1Prompt }],
      stream: false,
    }),
  });

  await sleep(GAP_MS);

  const round2Prompt = reviewPrompt(
    [
      '이번이 2차 검토다.',
      '1차 검토 원문:',
      round1.raw || '(1차 원문 없음)',
      '',
      `창업자 추가 답변: ${ROUND2_ANSWER}`,
      'questions는 1차 질문 중 이 답으로 닫힌 항목을 반복하지 않는다.',
    ].join('\n'),
  );
  const round2 = await request('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [{ role: 'user', content: round2Prompt }],
      stream: false,
    }),
  });

  const record = {
    id: 'juinjip-free-model-mvp-2026-10-27',
    inputSource: 'apps/web/features/strategic-intelligence/lib/si-calibration-cases.ts juinjip.documentText',
    inputSha256: sha256(JUINJIP_INPUT),
    round2Answer: ROUND2_ANSWER,
    geminiWeb: {
      attempted: false,
      reason: 'robots.txt Disallow /app/ and /chat/ for every user-agent. Incognito does not change that rule.',
    },
    noKeyProbes: {
      geminiApi: pack('gemini-2.5-flash-no-key', 'ping', gemini, false),
      openrouter: pack('openrouter-free-no-key', 'ping', openrouter, false),
      openrouterModelsHttp: openrouterModels.http,
      openrouterModelsError: openrouterModels.error,
    },
    pollinations: {
      endpoint: 'https://text.pollinations.ai/openai',
      requestedModel: 'openai',
      gapMs: GAP_MS,
      rounds: [
        pack('round-1', round1Prompt, round1, true),
        pack('round-2', round2Prompt, round2, true),
      ],
    },
  };

  await writeFile(OUT, `${JSON.stringify(record, null, 2)}\n`);
  const reloaded = await reloadRecord();
  console.log(JSON.stringify({ wrote: OUT.pathname, geminiHttp: gemini.http, openrouterHttp: openrouter.http, round1Http: round1.http, round2Http: round2.http, reload: reloaded }, null, 2));
  if (!reloaded.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
