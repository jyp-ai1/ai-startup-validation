/**
 * Probe whether Production tip likely includes E3 Retry (f15f940).
 * Usage: node scripts/alabom-probe-prod-tip.mjs
 */
import https from 'node:https';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://ai-startup-validation-tau.vercel.app';

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }),
        );
      })
      .on('error', reject);
  });
}

const html = await get(`${BASE}/`);
const urls = [...html.body.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
const unique = [...new Set(urls)];
console.log(JSON.stringify({ homeStatus: html.status, chunkCount: unique.length }, null, 2));

let found = false;
let foundIn = null;
for (const u of unique.slice(0, 60)) {
  const { body } = await get(`${BASE}${u}`);
  if (body.includes('review-start-retry') || body.includes('review-start-error')) {
    found = true;
    foundIn = u;
    break;
  }
}
console.log(JSON.stringify({ tipHasReviewRetry: found, foundIn }, null, 2));
