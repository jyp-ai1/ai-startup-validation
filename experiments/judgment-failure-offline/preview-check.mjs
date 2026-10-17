import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

function run(command) {
  return execSync(command, { cwd: root, encoding: "utf8", timeout: 30000 }).trim();
}

function headerValue(headers, name) {
  const line = headers.split("\n").find((item) => item.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return line ? line.slice(name.length + 1).trim() : null;
}

const head = run("git rev-parse HEAD");
const branch = run("git rev-parse --abbrev-ref HEAD");
const statuses = JSON.parse(run("gh api repos/jyp-ai1/ai-startup-validation/deployments/7134241920/statuses"));
const latest = statuses[0] ?? {};
const headers = run(`curl -sI --max-time 20 ${JSON.stringify(latest.environment_url ?? "")}`);
const httpLine = headers.split("\n").find((item) => item.startsWith("HTTP/")) ?? "";
const location = headerValue(headers, "location");
const prodRaw = run("curl -sS --max-time 20 https://ai-startup-validation-tau.vercel.app/api/build-info");
const prod = JSON.parse(prodRaw);
const productRefs = run("rg -l 'path1\\.json|path4\\.json|judgment-failure-offline' --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.mjs' apps packages || true");
const freezeDiff = run("git diff --stat 6f71ea3a -- apps packages || true");
const ancestor = run("git merge-base --is-ancestor 0b465226 HEAD && echo yes");
const rawLogHits = run("rg -l 'Received: \\\"VALID\\\"' experiments/judgment-failure-offline --glob '*.txt' || true");

const report = {
  at: new Date().toISOString(),
  pr: 199,
  prUrl: "https://github.com/jyp-ai1/ai-startup-validation/pull/199",
  branch,
  headAtCheck: head,
  deploymentChecked: {
    id: 7134241920,
    sha: "860ee75e054f61c7049ddf8442b694496803f910",
    state: latest.state ?? null,
    description: latest.description ?? null,
    environmentUrl: latest.environment_url ?? null,
    inspectUrl: "https://vercel.com/jyp-ai1s-projects/ai-startup-validation/3AGqp3F4Mztks5gDzdTnB6DDFZJw",
    createdAt: latest.created_at ?? null,
  },
  unauthenticatedFetch: {
    http: httpLine,
    locationHost: location ? new URL(location).host : null,
    redirectsToVercelSso: Boolean(location && location.includes("vercel.com/sso-api")),
  },
  logBodyRead: false,
  vercelTokenPresent: Boolean(process.env.VERCEL_TOKEN),
  productVerifier: {
    connectedInAppsOrPackages: productRefs.length > 0,
    matchingFiles: productRefs ? productRefs.split("\n").filter(Boolean) : [],
    offlineTool: "experiments/judgment-failure-offline/detector.mjs",
  },
  production: {
    url: "https://ai-startup-validation-tau.vercel.app",
    commit: prod.data?.commit ?? null,
    environment: prod.data?.environment ?? null,
    matchesLock: prod.data?.commit === "0b465226516e1a4f3eb9ce2087f8bca2c2c091da",
  },
  freeze: {
    productDiffFrom6f71ea3a: freezeDiff,
    appsPackagesDiffEmpty: freezeDiff.length === 0,
    productionAncestor: ancestor === "yes",
  },
  failure5VitestExcerpts: rawLogHits ? rawLogHits.split("\n").filter(Boolean) : [],
  ceoBrowserStatus: "BLOCKED",
  blockedBecause: [
    "PR #199 head deployment state is failure",
    "unauthenticated fetch redirects to Vercel SSO",
    "apps and packages do not reference the offline verifier or path1/path4",
  ],
};

fs.writeFileSync(path.join(here, "preview-check.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  state: report.deploymentChecked.state,
  sso: report.unauthenticatedFetch.redirectsToVercelSso,
  productVerifier: report.productVerifier.connectedInAppsOrPackages,
  productionCommit: report.production.commit,
  freezeEmpty: report.freeze.appsPackagesDiffEmpty,
  status: report.ceoBrowserStatus,
}, null, 2));
