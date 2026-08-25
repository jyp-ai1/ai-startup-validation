import https from 'node:https';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://ai-startup-validation-tau.vercel.app';
const needles = [
  'contradiction-confirm',
  'ai-pm-thinking-stages',
  'analysis-hero-cta',
  'analysis-result-evidence-first',
  'ai-understanding-updated',
  'validation-handoff',
  'review-start-retry',
  'review-start-error',
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

const html = await get(`${BASE}/`);
const urls = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
const hits = Object.fromEntries(needles.map((n) => [n, false]));
for (const u of urls.slice(0, 60)) {
  const body = await get(`${BASE}${u}`);
  for (const n of needles) {
    if (body.includes(n)) hits[n] = true;
  }
}
console.log(JSON.stringify({ chunkCount: urls.length, hits }, null, 2));
