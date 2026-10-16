import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const fixtures = JSON.parse(fs.readFileSync(path.join(here, "fixtures.json"), "utf8"));
const prompt = fs.readFileSync(path.join(root, "experiments/business-judgment-poc/prompt.txt"), "utf8");
const inputSection = prompt.split("\n입력\n")[1] ?? "";
const inputHasEvidence = fixtures.evidenceNeedles.some((needle) => inputSection.includes(needle));

function classifyLine(line) {
  if (/^A\d:/.test(line)) return "claim";
  if (/^S[3-6]:/.test(line) && /예상|계획/.test(line)) return "assumption";
  if (/^S\d:/.test(line)) return "claim";
  return "instruction-or-blank";
}

function loadStored(rel) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  let modelFact = null;
  let modelParse = "unparsed";
  try {
    const body = JSON.parse(payload.body);
    const raw = body?.choices?.[0]?.message?.content ?? body?.message?.content ?? "";
    const object = JSON.parse(raw);
    modelFact = object.Fact ?? null;
    modelParse = "parsed";
  } catch {
    modelParse = "unparsed";
  }
  return {
    content: String(payload.content ?? ""),
    storedFact: payload.output_parse?.object?.Fact ?? null,
    modelFact,
    modelParse,
  };
}

function tokenOmission(content) {
  const missing = fixtures.needles.filter((needle) => !content.includes(needle));
  return { flagged: missing.length > 0, missing };
}

function factPromotion(fact) {
  return fact === true && !inputHasEvidence;
}

const inputLines = inputSection
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => ({ line, class: classifyLine(line) }));

const cases = fixtures.cases.map((item) => {
  const stored = item.file ? loadStored(item.file) : null;
  const content = stored ? stored.content : item.content;
  const fact = stored ? stored.storedFact : item.fact;
  const omission = tokenOmission(content);
  const promotion = factPromotion(fact);
  const actual = { tokenOmission: omission.flagged, factPromotion: promotion };
  return {
    id: item.id,
    kind: item.kind,
    file: item.file ?? null,
    note: item.note ?? null,
    missingTokens: omission.missing,
    storedFact: fact,
    modelFact: stored?.modelFact ?? null,
    modelParse: stored?.modelParse ?? null,
    modelFactMatchesStored: stored ? stored.modelFact === stored.storedFact : null,
    expected: item.expected,
    actual,
    agrees: actual.tokenOmission === item.expected.tokenOmission && actual.factPromotion === item.expected.factPromotion,
  };
});

const prior = JSON.parse(fs.readFileSync(path.join(here, "last-run.json"), "utf8"));
const qualityCases = fixtures.qualityCases.map((item) => {
  if (item.id === "failure5-this-call") {
    const call = prior.failure5.thisCall;
    return {
      ...item,
      actualQuality: call.quality,
      actualMergeable: call.mergeable,
      qualityMismatch: call.quality !== item.expectedQuality,
      mergeableMismatch: call.mergeable !== item.expectedMergeable,
      agrees: call.quality !== item.expectedQuality && call.mergeable !== item.expectedMergeable,
    };
  }
  if (item.kind === "synthetic-control") {
    return {
      ...item,
      actualQuality: item.quality,
      actualMergeable: item.mergeable,
      qualityMismatch: item.quality !== item.expectedQuality,
      mergeableMismatch: item.mergeable !== item.expectedMergeable,
      agrees: item.quality === item.expectedQuality && item.mergeable === item.expectedMergeable,
    };
  }
  return {
    ...item,
    actualQuality: null,
    actualMergeable: null,
    qualityMismatch: null,
    mergeableMismatch: null,
    agrees: null,
    status: "unverified-no-raw-log",
  };
});

const productRefs = execSync(
  "rg -l 'path1\\.json|path4\\.json' --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.mjs' --glob '*.py' apps packages || true",
  { cwd: root, encoding: "utf8" },
).trim();

const report = {
  at: new Date().toISOString(),
  selfPassIsNotProductPass: true,
  productFailuresRemainOpen: ["failure1", "failure2", "failure5"],
  inputHasEvidence,
  inputLines,
  productRefCount: productRefs ? productRefs.split("\n").length : 0,
  cases,
  qualityCases,
  auditAgrees: cases.every((item) => item.agrees) && qualityCases.filter((item) => item.agrees !== null).every((item) => item.agrees),
  limits: [
    "denial-tokens는 토큰이 있어도 부정이면 누락이다. 이 검사는 그 부정을 보지 못한다.",
    "path4의 Fact true 탐지는 입력 구간에 증거 표지가 없다는 형식 규칙이다. 사업적 참은 정하지 않는다.",
    "10:39 원본 로그 파일은 저장소에 없다. 그 mergeable은 미확인이다.",
  ],
};

fs.writeFileSync(path.join(here, "detector-run.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  auditAgrees: report.auditAgrees,
  productRefCount: report.productRefCount,
  cases: cases.map((item) => ({ id: item.id, agrees: item.agrees, actual: item.actual, modelFactMatchesStored: item.modelFactMatchesStored })),
  quality: qualityCases.map((item) => ({ id: item.id, status: item.status ?? "checked", agrees: item.agrees, qualityMismatch: item.qualityMismatch })),
}, null, 2));
