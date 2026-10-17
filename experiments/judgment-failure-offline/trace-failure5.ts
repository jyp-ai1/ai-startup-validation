import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isCustomerFieldCorrection, isCorrectionUtterance, parseNotXButYCorrection } from "../../apps/web/features/workflow-journey/lib/business-understanding/ai-pm-correction-semantics.ts";
import { interpretAnswerSemantics } from "../../apps/web/features/workflow-journey/lib/business-understanding/interpret-answer-semantics.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const answer = "정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.";
const input = {
  answer,
  askedIssueId: "competitor_analysis",
  askedTargetGap: "validationTestability",
};
const result = interpretAnswerSemantics(input);
const parsed = parseNotXButYCorrection(answer);
const vitest1220 = fs.readFileSync(path.join(here, "vitest-failure5.txt"), "utf8");
const vitest1017 = fs.readFileSync(path.join(here, "vitest-failure5-2026-10-17.txt"), "utf8");
const partialRationale = "차별점의 고객 관련성";
const report = {
  at: new Date().toISOString(),
  input,
  predicates: {
    isCorrectionUtterance: isCorrectionUtterance(answer),
    isCustomerFieldCorrection: isCustomerFieldCorrection(answer),
    parsedNotXButY: parsed,
  },
  thisCall: {
    quality: result.quality,
    mergeable: result.mergeable,
    factKey: result.factKey,
    intent: result.intent,
    rationale: result.rationale,
  },
  path: {
    customerCorrectionReturnMatched: String(result.rationale).startsWith("CEO CORRECT — customer revised to"),
    partialReturnMatched: String(result.rationale).includes(partialRationale),
    sourceOrder: "interpret-answer-semantics.ts 고객 정정 if가 validationTestability else if보다 앞이다. 고객 정정 조건이 참이면 PARTIAL 반환은 실행되지 않는다.",
  },
  vitest: [
    { file: "vitest-failure5.txt", receivedValid: vitest1220.includes('Received: "VALID"'), mergeableLineExecuted: false },
    { file: "vitest-failure5-2026-10-17.txt", receivedValid: vitest1017.includes('Received: "VALID"'), mergeableLineExecuted: false },
  ],
  original1039Mergeable: "unverified",
  productChanged: false,
};
fs.writeFileSync(path.join(here, "failure5-trace.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  customerCorrection: report.predicates.isCustomerFieldCorrection,
  quality: report.thisCall.quality,
  mergeable: report.thisCall.mergeable,
  factKey: report.thisCall.factKey,
  customerReturn: report.path.customerCorrectionReturnMatched,
  partialReturn: report.path.partialReturnMatched,
}, null, 2));
