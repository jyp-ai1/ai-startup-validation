import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { recordExternalAnalysis } from "../../apps/web/features/business-validation-journey/lib/judgment-development.ts";
import { startJourney } from "../../apps/web/features/business-validation-journey/lib/journey-engine.ts";
import { interpretAnswerSemantics } from "../../apps/web/features/workflow-journey/lib/business-understanding/interpret-answer-semantics.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const poc = path.join(root, "experiments/business-judgment-poc");

const prompt = fs.readFileSync(path.join(poc, "prompt.txt"), "utf8");
const inputSection = prompt.split("\n입력\n")[1] ?? "";
const path1 = JSON.parse(fs.readFileSync(path.join(poc, "path1.json"), "utf8"));
const path4 = JSON.parse(fs.readFileSync(path.join(poc, "path4.json"), "utf8"));

const omissionNeedles = ["A2", "예상 연매출", "10억"];
const paraphraseNeedles = ["십억", "1000000000", "1,000,000,000", "10억원", "10억 원"];
const evidenceNeedles = ["원장", "결제", "입금", "세금계산서"];

function present(text: string, needles: string[]) {
  return Object.fromEntries(needles.map((needle) => [needle, text.includes(needle)]));
}

function productRefs() {
  const out = execSync(
    "rg -l 'path1\\.json|path4\\.json' --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.mjs' --glob '*.py' apps packages || true",
    { cwd: root, encoding: "utf8" },
  ).trim();
  return out ? out.split("\n") : [];
}

const path1Content = String(path1.content ?? "");
const path4Content = String(path4.content ?? "");
const path1Object = path1.output_parse?.object ?? null;
const path4Object = path4.output_parse?.object ?? null;

const started = startJourney(
  {
    business: "기업 물류본부의 주문과 배송 누락을 줄이는 서비스",
    customer: "기업 물류본부",
    problem: "주문 정보와 배송 정보가 분리되어 누락이 발생한다",
    solution: "주문과 배송을 한 화면에서 대조한다",
    payer: "",
    revenue: "",
    evidence: "",
    url: "",
  },
  "test_hypothesis",
);
if (!started.ok) throw new Error("startJourney failed");

const recorded = recordExternalAnalysis(started.state, {
  executionId: "offline-path4-observe",
  text: path4Content,
  provenance: "test_fixture",
  evidenceKind: "model_claim",
  sourceLabel: "path4.json",
  now: "2026-10-16T12:20:00.000Z",
});
const note = recorded.state.externalNotes?.at(-1) ?? null;

const correction = "정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.";
const semantics = interpretAnswerSemantics({
  answer: correction,
  askedIssueId: "competitor_analysis",
  askedTargetGap: "validationTestability",
});

const report = {
  at: new Date().toISOString(),
  modelCalls: 0,
  productRefs: productRefs(),
  failure1: {
    inputFile: "experiments/business-judgment-poc/prompt.txt",
    outputFile: "experiments/business-judgment-poc/path1.json",
    id: path1.id,
    model: path1.response_model,
    inputHas: present(inputSection, [...omissionNeedles, ...evidenceNeedles]),
    contentHas: present(path1Content, [...omissionNeedles, ...paraphraseNeedles]),
    storedFact: path1Object?.Fact ?? null,
    omissionDetected: omissionNeedles.some((needle) => !path1Content.includes(needle)),
    factPromoted: path1Object?.Fact === true,
  },
  failure2: {
    inputFile: "experiments/business-judgment-poc/prompt.txt",
    outputFile: "experiments/business-judgment-poc/path4.json",
    model: path4.model,
    inputEvidenceHits: present(inputSection, evidenceNeedles),
    storedFact: path4Object?.Fact ?? null,
    claim: path4Object?.Claim ?? null,
    missingEvidence: path4Object?.Missing_Evidence ?? null,
    factTrueWithoutInputEvidence:
      path4Object?.Fact === true && evidenceNeedles.every((needle) => !inputSection.includes(needle)),
    factTrueWhileMissingEvidenceNonempty:
      path4Object?.Fact === true && String(path4Object?.Missing_Evidence ?? "").trim().length > 0,
  },
  recordExternalAnalysis: {
    accepted: recorded.accepted,
    noteKeys: note ? Object.keys(note) : [],
    verifiedFact: note?.verifiedFact ?? null,
    realAnalysisSuccess: note?.realAnalysisSuccess ?? null,
    systemVerified: note?.systemVerified ?? null,
    liveModelCall: note?.liveModelCall ?? null,
    claimStatus: note?.claimStatus ?? null,
    status: note?.status ?? null,
    noteContainsFactTrue: Boolean(note?.text?.includes('"Fact": true') || note?.text?.includes('"Fact":true')),
    factKeyOnNote: note ? Object.prototype.hasOwnProperty.call(note, "Fact") : false,
  },
  failure5: {
    input: {
      answer: correction,
      askedIssueId: "competitor_analysis",
      askedTargetGap: "validationTestability",
    },
    expected: { quality: "PARTIAL", mergeable: false },
    thisCall: {
      quality: semantics.quality,
      mergeable: semantics.mergeable,
      factKey: semantics.factKey,
      intent: semantics.intent,
      rationale: semantics.rationale,
    },
    originalMergeable: "unverified",
  },
};

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "last-run.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  productRefs: report.productRefs.length,
  failure1Omission: report.failure1.omissionDetected,
  failure1FactPromoted: report.failure1.factPromoted,
  failure2FactTrue: report.failure2.factTrueWithoutInputEvidence,
  recordedVerifiedFact: report.recordExternalAnalysis.verifiedFact,
  failure5Quality: report.failure5.thisCall.quality,
  failure5Mergeable: report.failure5.thisCall.mergeable,
}, null, 2));
