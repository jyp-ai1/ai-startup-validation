import https from 'node:https';

const BASE = 'https://ai-startup-validation-tau.vercel.app';

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

const html = await get(
  `${BASE}/ko/workspace?demo=guided&fresh=1&forceReviewError=1`,
);
const urls = [
  ...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0])),
];
let foundForce = false;
let foundRetry = false;
let foundIn = null;
for (const u of urls.slice(0, 80)) {
  const body = await get(`${BASE}${u}`);
  if (body.includes('forceReviewError')) {
    foundForce = true;
    foundIn = u;
  }
  if (body.includes('review-start-retry')) foundRetry = true;
}
console.log(
  JSON.stringify(
    { chunkCount: urls.length, foundForce, foundRetry, foundIn, htmlLen: html.length },
    null,
    2,
  ),
);
