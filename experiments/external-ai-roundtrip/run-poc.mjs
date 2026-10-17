import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import playwright from "/workspace/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.js";

const { chromium } = playwright;
const root = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(root, "extension");
const profile = "/tmp/external-roundtrip-profile";
const outPath = path.join(root, "last-run.json");

fs.rmSync(profile, { recursive: true, force: true });

const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: { width: 900, height: 700 },
  ignoreDefaultArgs: ["--disable-extensions"],
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--disable-features=DisableLoadExtensionCommandLineSwitch",
    "--no-first-run",
    "--no-default-browser-check",
  ],
});

try {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent("serviceworker", { timeout: 20000 });
  }
  const result = await worker.evaluate(async () => globalThis.runRoundtrip());
  const record = {
    runner: "chrome-extension",
    extensionPath,
    serviceWorkerUrl: worker.url(),
    ...result,
  };
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({
    ok: record.ok,
    http: record.http,
    elapsedMs: record.elapsedMs,
    marker: record.marker,
    rawPreview: String(record.raw || record.error || "").slice(0, 400),
    outPath,
  }));
  if (!record.ok) process.exitCode = 2;
} finally {
  await context.close();
}
