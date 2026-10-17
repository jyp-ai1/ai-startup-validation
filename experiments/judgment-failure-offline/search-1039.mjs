import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const roots = [
  path.join(root, "docs"),
  path.join(root, "experiments"),
];
const stamp = "10:39:10";
const narrative = [];
const rawLogs = [];

function walk(dir, depth) {
  if (depth > 6 || !fs.existsSync(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, depth + 1);
      continue;
    }
    if (!/\.(md|txt|log|json)$/.test(entry.name)) continue;
    if (entry.name === "transcript.json") continue;
    let text = "";
    try {
      const stat = fs.statSync(full);
      if (stat.size > 2_000_000) continue;
      text = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    if (!text.includes(stamp)) continue;
    const rel = full.startsWith(root) ? path.relative(root, full) : full;
    const looksLikeVitest = text.includes("Test Files") && text.includes("Received:");
    if (looksLikeVitest) rawLogs.push(rel);
    else narrative.push(rel);
  }
}

for (const dir of roots) walk(dir, 0);

let transcriptStamp = false;
const transcript = "/tmp/cursor/cloud-agent-transcripts/2026-10-16T06-25-04Z-ed4b/bc-976e45a4-88c8-443f-9bb2-5c09b860e648/transcript.json";
if (fs.existsSync(transcript)) {
  const fd = fs.openSync(transcript, "r");
  const size = fs.fstatSync(fd).size;
  const chunk = 1_000_000;
  const needle = Buffer.from(stamp);
  let carry = Buffer.alloc(0);
  let offset = 0;
  while (offset < size && !transcriptStamp) {
    const length = Math.min(chunk, size - offset);
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, offset);
    const window = Buffer.concat([carry, buf]);
    if (window.includes(needle)) transcriptStamp = true;
    carry = window.subarray(Math.max(0, window.length - needle.length));
    offset += length;
  }
  fs.closeSync(fd);
}

const report = {
  at: new Date().toISOString(),
  stamp,
  searched: roots,
  narrativeMentions: narrative,
  rawVitestLogs: rawLogs,
  transcriptContainsStamp: transcriptStamp,
  leftoverUnitLog: fs.existsSync("/tmp/f13-after/unit2.log"),
  mergeable: "unverified",
};
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "log-search.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  narrative: narrative.length,
  rawVitestLogs: rawLogs,
  transcriptContainsStamp: transcriptStamp,
  leftoverUnitLog: report.leftoverUnitLog,
}, null, 2));
