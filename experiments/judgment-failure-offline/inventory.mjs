import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  ["prompt", "experiments/business-judgment-poc/prompt.txt", "failure-1-2-input"],
  ["path1", "experiments/business-judgment-poc/path1.json", "failure-1-stored-output"],
  ["path4", "experiments/business-judgment-poc/path4.json", "failure-2-stored-output"],
  ["poc-note", "docs/evidence/ALABOM/AI-PM/BUSINESS-JUDGMENT-POC.txt", "narrative-of-stored-run"],
  ["failure-trace", "docs/evidence/ALABOM/AI-PM/FAILURE-TRACE-2026-10-16.md", "narrative"],
  ["gate-plan", "docs/evidence/ALABOM/AI-PM/NEXT-GATE-VALIDATION-PLAN-2026-10-16.md", "plan-not-execution"],
  ["scope", "docs/evidence/ALABOM/AI-PM/NEXT-SCOPE-CRITERIA-2026-10-16.md", "plan-not-execution"],
  ["offline-note", "docs/evidence/ALABOM/AI-PM/FAILURE-125-OFFLINE-2026-10-16.md", "prior-execution-note"],
  ["semantics", "apps/web/features/workflow-journey/lib/business-understanding/interpret-answer-semantics.ts", "product-source-read"],
  ["stabilization-test", "apps/web/features/workflow-journey/lib/business-understanding/__tests__/core-final-stabilization.test.ts", "existing-test-source"],
  ["judgment-src", "apps/web/features/business-validation-journey/lib/judgment-development.ts", "product-source-read"],
  ["judgment-test", "apps/web/features/business-validation-journey/lib/__tests__/judgment-development.test.ts", "existing-test-source"],
  ["id-validator", "experiments/id-selection-validator/validator.py", "unrelated-format-checker"],
  ["observe", "experiments/judgment-failure-offline/observe.ts", "this-sprint-script"],
  ["last-run", "experiments/judgment-failure-offline/last-run.json", "this-sprint-function-call"],
  ["vitest-excerpt", "experiments/judgment-failure-offline/vitest-failure5.txt", "this-sprint-test-excerpt"],
  ["detector", "experiments/judgment-failure-offline/detector.mjs", "this-sprint-script"],
  ["detector-run", "experiments/judgment-failure-offline/detector-run.json", "this-sprint-detector-output"],
  ["fixtures", "experiments/judgment-failure-offline/fixtures.json", "this-sprint-labels"],
  ["commands", "experiments/judgment-failure-offline/commands.txt", "this-sprint-command-log"],
  ["ceo-review", "docs/evidence/ALABOM/AI-PM/CEO-RETURN-REVIEW-2026-10-16.md", "this-sprint-review"],
  ["log-search", "experiments/judgment-failure-offline/log-search.json", "1039-search"],
  ["search-script", "experiments/judgment-failure-offline/search-1039.mjs", "1039-search-script"],
  ["vitest-2026-10-17", "experiments/judgment-failure-offline/vitest-failure5-2026-10-17.txt", "failure5-rerun"],
  ["trace-script", "experiments/judgment-failure-offline/trace-failure5.ts", "failure5-path-script"],
  ["failure5-trace", "experiments/judgment-failure-offline/failure5-trace.json", "failure5-path-result"],
  ["preview-check-script", "experiments/judgment-failure-offline/preview-check.mjs", "preview-status-script"],
  ["preview-check", "experiments/judgment-failure-offline/preview-check.json", "preview-status-result"],
];

const rows = files.map(([id, rel, role]) => {
  const full = path.join(root, rel);
  const exists = fs.existsSync(full);
  if (!exists) return { id, rel, role, exists: false };
  const buf = fs.readFileSync(full);
  return {
    id,
    rel,
    role,
    exists: true,
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
});

const missingRaw = [
  "docs or experiments raw vitest log named for 2026-10-16T10:39:10Z",
].map((rel) => ({ rel, exists: false, role: "original-failure5-log" }));

const out = { at: new Date().toISOString(), rows, missingRaw };
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "inventory.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ files: rows.length, missing: rows.filter((row) => !row.exists).map((row) => row.rel), rawLogMissing: true }, null, 2));
