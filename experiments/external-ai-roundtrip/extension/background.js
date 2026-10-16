const FORBIDDEN_HOSTS = [
  "chatgpt.com",
  "gemini.google.com",
  "claude.ai",
  "copilot.microsoft.com",
];

const ENDPOINT = "https://text.pollinations.ai/openai";

function buildInput(marker) {
  return `Connection test. Reply with the single word pong and then this marker: ${marker}`;
}

async function runRoundtrip() {
  const marker = `poc-${Date.now()}`;
  const input = buildInput(marker);
  const started = new Date().toISOString();
  const webUi = {
    attempted: false,
    targets: FORBIDDEN_HOSTS,
    reason: "consumer chat automation is disallowed and those sites were not opened",
  };
  const payload = {
    model: "openai",
    messages: [{ role: "user", content: input }],
    stream: false,
  };
  const t0 = Date.now();
  let http = null;
  let raw = "";
  let error = null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    http = response.status;
    raw = await response.text();
  } catch (caught) {
    error = String(caught);
  }
  const paidRefused = http === 402;
  return {
    started,
    elapsedMs: Date.now() - t0,
    input,
    marker,
    endpoint: ENDPOINT,
    requestBody: payload,
    http,
    raw,
    error,
    paidRefused,
    webUi,
    ok: http === 200 && !paidRefused && raw.length > 0,
  };
}

globalThis.runRoundtrip = runRoundtrip;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "run-roundtrip") return;
  runRoundtrip().then(sendResponse);
  return true;
});
