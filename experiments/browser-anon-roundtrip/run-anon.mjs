import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import playwright from "/workspace/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.js";

const { chromium } = playwright;
const root = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(root, "shots");
const profileRoot = "/tmp/anon-roundtrip-chrome";
fs.mkdirSync(shots, { recursive: true });
fs.rmSync(profileRoot, { recursive: true, force: true });

const PROMPT_1 =
  "Connectivity test only. Include the exact code PINE-42 in one short sentence.";
const PROMPT_2 =
  "What exact code appeared in your previous reply? Reply with only that code.";

const targets = [
  { id: "gpt", url: "https://chatgpt.com/" },
  { id: "gemini", url: "https://gemini.google.com/app" },
];

function now() {
  return new Date().toISOString();
}

async function snap(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 8 && r.height > 8 && style.visibility !== "hidden" && style.display !== "none";
    };
    const inputs = [...document.querySelectorAll("textarea, [contenteditable='true'], input")]
      .filter(visible)
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        id: el.id || "",
        aria: el.getAttribute("aria-label") || "",
        placeholder: el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "",
      }));
    const buttons = [...document.querySelectorAll("button, a, [role='button']")]
      .filter(visible)
      .map((el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 30);
    const text = (document.body?.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 20000);
    return { href: location.href, title: document.title, text, inputs, buttons };
  });
}

function blockedReason(view) {
  const blob = `${view.href}\n${view.title}\n${view.text}`.toLowerCase();
  if (
    blob.includes("captcha") ||
    blob.includes("verify you are human") ||
    blob.includes("unusual traffic") ||
    blob.includes("cf-turnstile") ||
    blob.includes("just a moment") ||
    blob.includes("로봇이 아닙니다") ||
    blob.includes("비정상적인 트래픽")
  ) {
    return "captcha-or-bot-check";
  }
  if (
    view.href.includes("accounts.google.com") ||
    view.href.includes("auth.openai.com") ||
    view.href.includes("/log-in") ||
    view.href.includes("/login")
  ) {
    return "login-redirect";
  }
  return null;
}

async function clickByText(page, pattern) {
  const locator = page.locator("button, a, [role='button']").filter({ hasText: pattern });
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const item = locator.nth(i);
    if (await item.isVisible().catch(() => false)) {
      const label = (await item.innerText().catch(() => "")).trim();
      await item.click({ timeout: 4000 });
      return label;
    }
  }
  return null;
}

async function composer(page) {
  const candidates = [
    page.locator("#prompt-textarea"),
    page.locator("textarea").first(),
    page.locator("[contenteditable='true']").last(),
    page.getByRole("textbox").last(),
  ];
  for (const locator of candidates) {
    if ((await locator.count().catch(() => 0)) === 0) continue;
    const item = locator.first();
    if (await item.isVisible().catch(() => false)) return item;
  }
  return null;
}

async function readAssistant(page) {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll("[data-message-author-role='assistant']"),
      ...document.querySelectorAll("model-response, message-content, .model-response-text"),
    ];
    const parts = nodes
      .map((el) => (el.innerText || "").trim())
      .filter(Boolean);
    return parts;
  });
}

async function runTarget(browserKind, target) {
  const profile = path.join(profileRoot, target.id);
  const record = {
    id: target.id,
    url: target.url,
    browser: browserKind,
    startedAt: now(),
    steps: [],
    verdict: "unrun",
  };
  const mark = (name, extra = {}) => {
    record.steps.push({ name, at: now(), ...extra });
  };
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: "/usr/local/bin/google-chrome",
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ["--no-first-run", "--no-default-browser-check", "--disable-dev-shm-usage"],
  });
  try {
    const page = context.pages()[0] || (await context.newPage());
    const opened = Date.now();
    await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    mark("opened", { elapsedMs: Date.now() - opened, href: page.url() });
    let view = await snap(page);
    await page.screenshot({ path: path.join(shots, `${target.id}-01-opened.png`) });
    record.opened = { href: view.href, title: view.title, text: view.text, inputs: view.inputs, buttons: view.buttons };

    const guest = await clickByText(page, /stay logged out|continue without|try without|guest|로그인 없이|계정 없이/i);
    if (guest) {
      mark("guest-choice", { label: guest });
      await page.waitForTimeout(2500);
      view = await snap(page);
    }
    const consent = await clickByText(page, /^(accept all|accept|agree|i agree|got it|모두 동의|동의)$/i);
    if (consent) {
      mark("consent", { label: consent });
      await page.waitForTimeout(1500);
      view = await snap(page);
    }

    const block = blockedReason(view);
    const box = await composer(page);
    record.inputReady = Boolean(box) && !block;
    mark("input-check", { inputReady: record.inputReady, block, href: view.href });
    if (block || !box) {
      record.verdict = "roundtrip-failed";
      record.stop = block || "no-composer";
      record.finishedAt = now();
      await page.screenshot({ path: path.join(shots, `${target.id}-stop.png`) });
      return record;
    }

    const before1 = await page.locator("body").innerText();
    const sent1 = Date.now();
    await sendPrompt(page, box, PROMPT_1);
    mark("prompt-1-sent", { prompt: PROMPT_1 });
    const reply1 = await waitForReply(page, PROMPT_1, sent1, before1);
    record.response1 = reply1;
    await page.screenshot({ path: path.join(shots, `${target.id}-02-response1.png`) });
    mark("response-1", { elapsedMs: reply1.elapsedMs, ok: reply1.ok, reason: reply1.reason });
    if (!reply1.ok) {
      record.verdict = "first-response-missing";
      record.stop = reply1.reason;
      record.finishedAt = now();
      return record;
    }

    const box2 = await composer(page);
    const view2 = await snap(page);
    const block2 = blockedReason(view2);
    if (block2 || !box2) {
      record.verdict = "roundtrip-incomplete";
      record.stop = block2 || "composer-lost-after-first-reply";
      record.finishedAt = now();
      await page.screenshot({ path: path.join(shots, `${target.id}-stop.png`) });
      return record;
    }
    const before2 = await page.locator("body").innerText();
    const sent2 = Date.now();
    await sendPrompt(page, box2, PROMPT_2);
    mark("prompt-2-sent", { prompt: PROMPT_2, href: page.url() });
    const reply2 = await waitForReply(page, PROMPT_2, sent2, before2);
    record.response2 = reply2;
    record.sameUrlFamily = page.url().startsWith(new URL(target.url).origin);
    record.hrefAfter = page.url();
    record.bothPromptsOnPage = (await page.locator("body").innerText()).includes(PROMPT_1)
      && (await page.locator("body").innerText()).includes(PROMPT_2);
    const second = reply2.text || "";
    record.reflectsFirst = /PINE-42/.test(second)
      && second !== reply1.text
      && !second.includes(PROMPT_1)
      && !second.includes(PROMPT_2);
    await page.screenshot({ path: path.join(shots, `${target.id}-03-response2.png`) });
    mark("response-2", {
      elapsedMs: reply2.elapsedMs,
      ok: reply2.ok,
      reflectsFirst: record.reflectsFirst,
      href: record.hrefAfter,
    });
    if (reply2.ok && record.reflectsFirst && record.bothPromptsOnPage) record.verdict = "roundtrip-ok";
    else if (reply2.ok) record.verdict = "second-response-without-reflection";
    else record.verdict = "roundtrip-incomplete";
    record.finishedAt = now();
    return record;
  } catch (error) {
    record.verdict = "roundtrip-failed";
    record.stop = error.name === "TimeoutError" ? "timeout" : "exception";
    record.error = String(error && error.message ? error.message : error).slice(0, 500);
    record.finishedAt = now();
    return record;
  } finally {
    await context.close().catch(() => {});
  }
}

async function sendPrompt(page, box, prompt) {
  await box.click();
  try {
    await box.fill(prompt);
  } catch {
    await box.pressSequentially(prompt, { delay: 10 });
  }
  await box.press("Enter");
  await page.waitForTimeout(1200);
  const remaining = await box.inputValue().catch(async () => box.innerText().catch(() => ""));
  if (String(remaining).includes(prompt.slice(0, 24))) {
    const sendBtn = page
      .locator("button[data-testid='send-button'], button[aria-label*='Send' i], button[aria-label*='보내기']")
      .last();
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click();
  }
}

function freshLines(before, after, prompt) {
  const seen = new Set(before.split("\n").map((line) => line.trim()).filter(Boolean));
  return after
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      if (line === prompt || prompt.includes(line) || line.includes(prompt)) return false;
      if (/^(copy|copied|stop|send|good response|bad response)$/i.test(line)) return false;
      return line.length > 1;
    });
}

async function waitForReply(page, prompt, sentAt, beforeText) {
  const deadline = Date.now() + 90000;
  let last = "";
  let stableCount = 0;
  while (Date.now() < deadline) {
    const view = await snap(page);
    const block = blockedReason(view);
    if (block) {
      return { ok: false, reason: block, text: last, elapsedMs: Date.now() - sentAt, href: view.href };
    }
    const text = freshLines(beforeText, view.text, prompt).join("\n").trim();
    if (text && text === last) stableCount += 1;
    else {
      last = text;
      stableCount = 0;
    }
    const busy = await page
      .locator("button[aria-label*='Stop' i], button[aria-label*='중지'], button[data-testid='stop-button']")
      .first()
      .isVisible()
      .catch(() => false);
    if (last && stableCount >= 3 && !busy && Date.now() - sentAt > 6000) {
      return { ok: true, reason: "new-visible-lines", text: last, elapsedMs: Date.now() - sentAt, href: page.url() };
    }
    await page.waitForTimeout(1500);
  }
  return { ok: false, reason: "timeout", text: last, elapsedMs: Date.now() - sentAt, href: page.url() };
}

const results = [];
for (const target of targets) {
  results.push(await runTarget("google-chrome-154", target));
}
const out = {
  at: now(),
  prompt1: PROMPT_1,
  prompt2: PROMPT_2,
  results,
};
fs.writeFileSync(path.join(root, "last-run.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(results.map((item) => ({
  id: item.id,
  verdict: item.verdict,
  stop: item.stop || null,
  href: item.hrefAfter || item.opened?.href || null,
  reflectsFirst: item.reflectsFirst || false,
})), null, 2));
