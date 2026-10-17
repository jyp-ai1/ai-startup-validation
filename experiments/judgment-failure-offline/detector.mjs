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

const DENIAL_VERB = /출력하지|포함하지|확인되지|언급하지|제외|빠졌/;

function sentencesOf(content) {
  return String(content).split(/[\n.]+/).map((part) => part.trim()).filter(Boolean);
}

function sentenceDenies(sentence, needle) {
  if (!sentence.includes(needle)) return false;
  const tail = sentence.slice(sentence.indexOf(needle));
  return DENIAL_VERB.test(tail) && tail.length <= 40;
}

function meaningOmission(content) {
  const denied = [];
  const missing = [];
  for (const needle of fixtures.needles) {
    const parts = sentencesOf(content).filter((part) => part.includes(needle));
    if (parts.length === 0) {
      missing.push(needle);
      continue;
    }
    const acknowledged = parts.some((part) => !sentenceDenies(part, needle));
    if (!acknowledged) denied.push(needle);
  }
  return { flagged: missing.length > 0 || denied.length > 0, missing, denied };
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
  const meaning = meaningOmission(content);
  const promotion = factPromotion(fact);
  const actual = {
    tokenOmission: omission.flagged,
    meaningOmission: meaning.flagged,
    factPromotion: promotion,
  };
  const agrees = Object.keys(item.expected).every((key) => actual[key] === item.expected[key]);
  return {
    id: item.id,
    kind: item.kind,
    file: item.file ?? null,
    note: item.note ?? null,
    humanWouldCountAsPresent: Boolean(item.humanWouldCountAsPresent),
    missingTokens: omission.missing,
    deniedTokens: meaning.denied,
    storedFact: fact,
    modelFact: stored?.modelFact ?? null,
    modelParse: stored?.modelParse ?? null,
    modelFactMatchesStored: stored ? stored.modelFact === stored.storedFact : null,
    expected: item.expected,
    actual,
    agrees,
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

const note = prior.recordExternalAnalysis;
const fieldActual = {
  rawFact: prior.failure2.storedFact,
  verifiedFact: note.verifiedFact,
  claimStatus: note.claimStatus,
  factKeyOnNote: note.factKeyOnNote,
  noteContainsFactTrue: note.noteContainsFactTrue,
  fieldMismatch: prior.failure2.storedFact === true && note.verifiedFact === false,
  verificationSuccess: inputHasEvidence && note.verifiedFact === true,
};
const fieldExpected = {
  rawFact: true,
  verifiedFact: false,
  claimStatus: "unassessed",
  factKeyOnNote: false,
  noteContainsFactTrue: true,
  fieldMismatch: true,
  verificationSuccess: false,
};
const fieldCase = {
  id: "path4-raw-vs-function",
  source: "experiments/judgment-failure-offline/last-run.json",
  expected: fieldExpected,
  actual: fieldActual,
  agrees: Object.keys(fieldExpected).every((key) => fieldActual[key] === fieldExpected[key]),
};

const vitestText = fs.readFileSync(path.join(here, "vitest-failure5.txt"), "utf8");
const failure5SideBySide = {
  vitestExcerpt: "experiments/judgment-failure-offline/vitest-failure5.txt",
  vitestExpected: "PARTIAL",
  vitestReceived: /Received: "VALID"/.test(vitestText) ? "VALID" : null,
  vitestMergeableAssertionRan: false,
  thisCall: prior.failure5.thisCall,
  original1039: { rawLogFound: false, mergeable: "unverified" },
};

const falsePositives = cases.filter((item) => (
  (item.expected.tokenOmission === false && item.actual.tokenOmission)
  || (item.expected.meaningOmission === false && item.actual.meaningOmission)
  || (item.expected.factPromotion === false && item.actual.factPromotion)
)).map((item) => item.id);

const misses = [
  ...cases.filter((item) => item.actual.meaningOmission && item.actual.tokenOmission === false).map((item) => ({
    id: item.id,
    checker: "token",
    detail: "부정문 또는 미인정 문장인데 토큰이 있어 누락으로 보지 않음",
  })),
  ...cases.filter((item) => item.humanWouldCountAsPresent && item.actual.meaningOmission).map((item) => ({
    id: item.id,
    checker: "meaning",
    detail: "사람이 매출 언급으로 읽을 수 있는 다른 표현을 인정으로 보지 않음",
  })),
];

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
  fieldCase,
  failure5SideBySide,
  falsePositives,
  misses,
  auditAgrees: cases.every((item) => item.agrees)
    && qualityCases.filter((item) => item.agrees !== null).every((item) => item.agrees)
    && fieldCase.agrees,
  limits: [
    "토큰 검사는 denial-tokens의 부정문을 누락으로 보지 못한다.",
    "의미 검사는 십억 같은 다른 표현을 10억의 인정으로 보지 못한다.",
    "Fact true와 verifiedFact false의 불일치는 사실 검증 성공이 아니다.",
    "10:39 원본 로그는 미확인이다. 이번 호출의 mergeable로 그 로그를 채우지 않는다.",
  ],
};

fs.writeFileSync(path.join(here, "detector-run.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  auditAgrees: report.auditAgrees,
  productRefCount: report.productRefCount,
  cases: cases.map((item) => ({ id: item.id, agrees: item.agrees, actual: item.actual, modelFactMatchesStored: item.modelFactMatchesStored })),
  quality: qualityCases.map((item) => ({ id: item.id, status: item.status ?? "checked", agrees: item.agrees, qualityMismatch: item.qualityMismatch })),
  fieldAgrees: fieldCase.agrees,
  falsePositives,
  misses,
  vitestReceived: failure5SideBySide.vitestReceived,
  thisCallMergeable: failure5SideBySide.thisCall.mergeable,
}, null, 2));
