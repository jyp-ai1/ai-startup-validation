#!/usr/bin/env node
/**
 * Production Redirect QA — CPO Sprint 1 evidence script.
 * Usage: node scripts/redirect-qa.mjs [baseUrl]
 * Default baseUrl: https://ai-startup-validation-tau.vercel.app
 */

const BASE = process.argv[2] ?? 'https://ai-startup-validation-tau.vercel.app';
const SAMPLE_PROJECT = process.argv[3] ?? '00000000-0000-0000-0000-000000000001';

const CASES = [
  { path: '/validation', expectPathPrefix: '/workspace' },
  { path: '/workflow', expectPathPrefix: '/workspace' },
  { path: '/who', expectPathPrefix: '/workspace' },
  { path: `/projects/${SAMPLE_PROJECT}`, expectPathPrefix: '/workspace', expectQuery: 'project=' },
  { path: `/my-projects/${SAMPLE_PROJECT}`, expectPathPrefix: '/workspace', expectQuery: 'project=' },
  { path: '/dashboard', expectPathPrefix: '/workspace' },
  { path: '/goal', expectPathPrefix: '/workspace' },
  { path: '/investigate', expectPathPrefix: '/workspace' },
];

async function checkRedirect(testCase) {
  const url = `${BASE}${testCase.path}`;
  const res = await fetch(url, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  const status = res.status;
  const parsed = location.startsWith('http') ? new URL(location) : new URL(location || '/', BASE);
  const pathOk = parsed.pathname.startsWith(testCase.expectPathPrefix);
  const queryOk = testCase.expectQuery ? parsed.search.includes(testCase.expectQuery) : true;
  const pass = (status === 307 || status === 308 || status === 301 || status === 302) && pathOk && queryOk;

  return {
    path: testCase.path,
    status,
    location: location || '(none)',
    pass,
    reason: pass
      ? 'OK'
      : `expected ${testCase.expectPathPrefix}${testCase.expectQuery ? `?${testCase.expectQuery}` : ''}`,
  };
}

async function main() {
  console.log(`\nRedirect QA — ${BASE}\n${'─'.repeat(72)}`);
  const results = [];
  for (const testCase of CASES) {
    const result = await checkRedirect(testCase);
    results.push(result);
    const icon = result.pass ? '✅' : '❌';
    console.log(`${icon} ${result.path}`);
    console.log(`   ${result.status} → ${result.location}`);
    if (!result.pass) console.log(`   ${result.reason}`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`Result: ${passed}/${results.length} PASS`);
  process.exitCode = passed === results.length ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
